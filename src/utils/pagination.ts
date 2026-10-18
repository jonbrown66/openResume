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
  return Array.from(paginatePages(source, pageHeight, margin));
}

/** Yield between page projections so long documents do not monopolize input. */
export async function paginateResumeAsync(
  source: HTMLElement,
  pageHeight: number,
  margin: number,
  cancelled: () => boolean,
  onFirstPage?: (pages: PageSlice[]) => void,
): Promise<PageSlice[] | null> {
  const pages: PageSlice[] = [];
  const iterator = paginatePages(source, pageHeight, margin);
  while (!cancelled()) {
    const next = iterator.next();
    if (next.done) return pages;
    pages.push(next.value);
    if (pages.length === 1) onFirstPage?.([...pages]);
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
  iterator.return();
  return null;
}

interface IntervalLookup {
  firstStartAtOrAfter(offset: number): number;
  findCrossing(start: number, end: number): [number, number] | undefined;
}

/** Prefix maxima locate page-edge crossings without scanning every line. */
function buildIntervalLookup(merged: Array<[number, number]>): IntervalLookup {
  const starts = merged.map(([start]) => start);
  const prefixBottoms: number[] = [];
  let prefixBottom = -Infinity;
  for (const [, bottom] of merged) {
    prefixBottom = Math.max(prefixBottom, bottom);
    prefixBottoms.push(prefixBottom);
  }

  const firstStartAtOrAfter = (target: number) => {
    let low = 0;
    let high = starts.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (starts[middle] < target) low = middle + 1;
      else high = middle;
    }
    return low;
  };

  return {
    firstStartAtOrAfter,
    findCrossing(start, end) {
      for (let index = firstStartAtOrAfter(end) - 1; index >= 0; index -= 1) {
        if (prefixBottoms[index] <= end + 0.1) return undefined;
        if (merged[index][0] < start - 0.1 && merged[index][1] > end + 0.1) {
          return merged[index];
        }
      }
      return undefined;
    },
  };
}

function* paginatePages(source: HTMLElement, pageHeight: number, margin: number): Generator<PageSlice, void, unknown> {
  ensureTextLineHeight(source);
  // Reuse geometry across page projections, never across edits, theme or font changes.
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
  const intervals = buildIntervalLookup(merged);
  for (let offset = 0; offset < total;) {
    let end = Math.min(offset + pageHeight, total);
    const crossing = intervals.findCrossing(offset, end);
    if (crossing && crossing[0] > offset + 1) end = crossing[0];
    // An oversized image/row cannot fit; advance rather than looping forever.
    if (end <= offset + 1) end = Math.min(offset + pageHeight, total);
    const clone = source.cloneNode(true) as HTMLElement;
    hideOutsidePage(source, clone, top + inset + offset, top + inset + end, cache);
    // Keep selector positions (:first-child/:nth-child) identical to the measured DOM.
    // The original styles remain mounted and are collected separately for export.
    clone.querySelectorAll('style').forEach(style => { style.textContent = ''; });
    yield { offset, inset, height: end - offset, html: clone.innerHTML };
    offset = end;
  }
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
