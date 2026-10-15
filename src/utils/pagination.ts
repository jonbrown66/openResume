export interface PageSlice { offset: number; inset: number; height: number; html: string }
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
    prune(source, clone, top + inset + offset, top + inset + end, cache);
    clone.querySelectorAll('style').forEach(style => style.remove());
    slices.push({ offset, inset, height: end - offset, html: clone.innerHTML });
    offset = end;
  }
  return slices;
}

/** Replace consecutive off-page blocks by a single equal-height spacer; do not duplicate text. */
function prune(original: HTMLElement, clone: HTMLElement, start: number, end: number, cache: GeometryCache) {
  const originalChildren = Array.from(original.children) as HTMLElement[];
  const cloneChildren = Array.from(clone.children) as HTMLElement[];
  let spacer: HTMLElement | null = null;
  let spacerTop = 0;
  const parentStyle = geometry(original, cache).style;
  const mergeable = parentStyle.display === 'block' ||
    (parentStyle.display === 'flex' && parentStyle.flexDirection.startsWith('column'));
  originalChildren.forEach((child, index) => {
    const copy = cloneChildren[index];
    const { rect, style } = geometry(child, cache);
    const block = !['inline', 'contents', 'none'].includes(style.display) && !['STYLE', 'SCRIPT', 'TD', 'TH'].includes(child.tagName);
    if (block && rect.height && (rect.bottom <= start + 0.1 || rect.top >= end - 0.1)) {
      const height = rect.height;
      if (spacer && mergeable && child.tagName !== 'TR') {
        // Use measured bounds: they already include flex gaps and collapsed margins.
        spacer.style.height = `${rect.bottom - spacerTop}px`;
        spacer.style.marginBottom = style.marginBottom;
        copy.remove();
      } else {
        spacer = document.createElement(child.tagName === 'TR' ? 'tr' : 'div');
        spacer.setAttribute('aria-hidden', 'true');
        spacerTop = rect.top;
        spacer.style.cssText = `height:${height}px;min-height:0;padding:0;margin-top:${style.marginTop};margin-bottom:${style.marginBottom};border:0;list-style:none;flex-shrink:0;box-sizing:border-box;`;
        if (child.tagName === 'TR') {
          const cell = document.createElement('td'); cell.colSpan = Math.max(1, child.children.length);
          cell.style.cssText = `height:${height}px;padding:0;border:0`; spacer.appendChild(cell);
        }
        copy.replaceWith(spacer);
      }
    } else {
      spacer = null;
      prune(child, copy, start, end, cache);
    }
  });
}
