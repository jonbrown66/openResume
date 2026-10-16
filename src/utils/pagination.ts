export interface PageSlice { offset: number; inset: number; height: number; html: string }

const safeLineHeights = new WeakMap<HTMLElement, { value: string; priority: string; applied: string }>();

/** Font fallback can make glyph boxes taller than the requested line height.
 * Keep body lines disjoint before finding page breaks, rather than hard-cutting
 * an overlapping paragraph. Restore our overrides before measuring a new theme. */
function ensureTextLineHeight(source: HTMLElement) {
  source.querySelectorAll<HTMLElement>('[data-resume-safe-line-height]').forEach(element => {
    const previous = safeLineHeights.get(element);
    if (previous && element.style.lineHeight === previous.applied) {
      if (previous.value) element.style.setProperty('line-height', previous.value, previous.priority);
      else element.style.removeProperty('line-height');
    }
    element.removeAttribute('data-resume-safe-line-height');
    safeLineHeights.delete(element);
  });
  const heights = new Map<HTMLElement, number>();
  const walker = document.createTreeWalker(source, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.textContent?.trim() || node.parentElement?.closest('style,script')) continue;
    const block = node.parentElement?.closest<HTMLElement>('p,li,td,th,pre,blockquote');
    if (!block || !source.contains(block)) continue;
    const range = document.createRange(); range.selectNodeContents(node);
    for (const rect of Array.from(range.getClientRects())) {
      if (rect.height && rect.width) heights.set(block, Math.max(heights.get(block) ?? 0, rect.height));
    }
  }
  // Read every computed value before writing to avoid a layout flush per block.
  const updates = Array.from(heights, ([element, height]) => ({ element, height,
    requested: parseFloat(getComputedStyle(element).lineHeight) }));
  for (const { element, height, requested } of updates) {
    if (!Number.isFinite(requested) || requested >= height + 0.5) continue;
    const value = element.style.getPropertyValue('line-height');
    const priority = element.style.getPropertyPriority('line-height');
    element.style.setProperty('line-height', `${height + 0.5}px`, 'important');
    safeLineHeights.set(element, { value, priority, applied: element.style.lineHeight });
    element.setAttribute('data-resume-safe-line-height', '');
  }
}
type GeometryCache = Map<HTMLElement, { rect: DOMRect; style: CSSStyleDeclaration }>;
function geometry(element: HTMLElement, cache: GeometryCache) {
  let value = cache.get(element);
  if (!value) {
    value = { rect: element.getBoundingClientRect(), style: getComputedStyle(element) };
    cache.set(element, value);
  }
  return value;
}

/** Cut only between rendered text lines, images and table rows. Coordinates are unscaled. */
export function paginateResume(source: HTMLElement, pageHeight: number, margin: number): PageSlice[] {
  ensureTextLineHeight(source);
  // Reuse geometry across page clones, never across edits, theme or font changes.
  const cache: GeometryCache = new Map();
  const top = source.getBoundingClientRect().top;
  const unsafe: Array<[number, number]> = [];
  const walker = document.createTreeWalker(source, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.textContent?.trim() || node.parentElement?.closest('style,script')) continue;
    const range = document.createRange(); range.selectNodeContents(node);
    for (const rect of Array.from(range.getClientRects())) {
      if (rect.height) unsafe.push([rect.top - top - margin, rect.bottom - top - margin]);
    }
  }
  source.querySelectorAll('img, tr, h1, h2, h3').forEach(element => {
    const rect = element.getBoundingClientRect();
    if (rect.height && rect.height < pageHeight) unsafe.push([rect.top - top - margin, rect.bottom - top - margin]);
  });
  // Keep a heading with the first line of its following content when possible.
  source.querySelectorAll('h2,h3').forEach(element => {
    const next = element.parentElement?.classList.contains('resume-h3-split')
      ? element.parentElement.nextElementSibling : element.nextElementSibling;
    if (next) {
      const heading = element.getBoundingClientRect(); const rect = next.getBoundingClientRect();
      const end = Math.min(rect.bottom, rect.top + parseFloat(getComputedStyle(next).lineHeight || '20'));
      if (end - heading.top < pageHeight / 2) unsafe.push([heading.top - top - margin, end - top - margin]);
    }
  });
  // Some fonts extend above their CSS line box. Include those glyph bounds on page one.
  let shift = 0;
  for (const interval of unsafe) shift = Math.min(shift, interval[0]);
  const inset = margin + shift;
  const total = Math.max(1, source.scrollHeight - margin - inset);
  for (const interval of unsafe) { interval[0] -= shift; interval[1] -= shift; }
  unsafe.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const interval of unsafe) {
    const previous = merged.at(-1);
    if (previous && interval[0] < previous[1] - 0.1) previous[1] = Math.max(previous[1], interval[1]);
    else merged.push([...interval]);
  }
  const slices: PageSlice[] = [];
  for (let offset = 0; offset < total;) {
    let end = Math.min(offset + pageHeight, total);
    const crossing = merged.find(([start, bottom]) => start < end - 0.1 && bottom > end + 0.1);
    if (crossing && crossing[0] > offset + 1) end = crossing[0];
    // An oversized image/row cannot fit; advance rather than looping forever.
    if (end <= offset + 1) end = Math.min(offset + pageHeight, total);
    const clone = source.cloneNode(true) as HTMLElement;
    hideOutsidePage(source, clone, top + inset + offset, top + inset + end, cache);
    // Keep selector positions (:first-child/:nth-child) identical to the measured DOM.
    // The original styles remain mounted and are collected separately for export.
    clone.querySelectorAll('style').forEach(style => { style.textContent = ''; });
    slices.push({ offset, inset, height: end - offset, html: clone.innerHTML });
    offset = end;
  }
  return slices;
}

/** Hide off-page content without changing margins, grid tracks or selector matching. */
function hideOutsidePage(original: HTMLElement, clone: HTMLElement, start: number, end: number, cache: GeometryCache) {
  const originalChildren = Array.from(original.children) as HTMLElement[];
  const cloneChildren = Array.from(clone.children) as HTMLElement[];
  originalChildren.forEach((child, index) => {
    const copy = cloneChildren[index];
    const { rect, style } = geometry(child, cache);
    const block = !['inline', 'contents', 'none'].includes(style.display) && !['STYLE', 'SCRIPT', 'TD', 'TH'].includes(child.tagName);
    if (block && rect.height && (rect.bottom <= start + 0.1 || rect.top >= end - 0.1)) {
      copy.setAttribute('aria-hidden', 'true');
      copy.style.setProperty('visibility', 'hidden', 'important');
      copy.querySelectorAll<HTMLElement>('*').forEach(element => element.style.setProperty('visibility', 'hidden', 'important'));
    } else {
      hideOutsidePage(child, copy, start, end, cache);
    }
  });
}
