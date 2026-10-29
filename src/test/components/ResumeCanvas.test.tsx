import { createRef } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, beforeAll, beforeEach, afterEach, vi } from 'vitest';

import { ResumeCanvas } from '@/components/ResumeCanvas';
import { ResumeRenderer } from '@/components/ResumeRenderer';
import { pageHeightPx, pageWidthPx } from '@/constants';
import { DEFAULT_THEME_CONFIG } from '@/types/theme';
import { paginateResumeAsync } from '@/utils/pagination';

// Content taller than one page requires two visual projections, even with zero jsdom rects.
const marginPx = Math.round(15 * 3.78);
const contentHeight = pageHeightPx + 2 * marginPx;

describe('ResumeCanvas', () => {
  beforeAll(() => {
    Object.defineProperty(document, 'fonts', { configurable: true, value: Object.assign([{ family: 'Geist Variable', weight: '100 900' }], { load: async () => [{}] }) });
    // jsdom has no layout engine; line boundaries are checked by the browser E2E test.
    Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
  });
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.matches('.resume-measure') ? pageWidthPx : 0;
    });
    for (const property of ['offsetHeight', 'scrollHeight'] as const) {
      vi.spyOn(HTMLElement.prototype, property, 'get').mockImplementation(function (this: HTMLElement) {
        return this.matches('.resume-measure') ? contentHeight : 0;
      });
    }
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('lets the preview paper height adapt to resume content', async () => {
    const canvasRef = createRef<HTMLDivElement>();
    render(
      <ResumeCanvas canvasRef={canvasRef} scale={0.5}>
        <div>Resume content</div>
      </ResumeCanvas>,
    );

    await waitFor(() => expect(canvasRef.current).toHaveAttribute('data-pagination-ready', 'true'));
    const canvas = canvasRef.current!;
    expect(canvas).toHaveClass('resume-canvas-screen-preview', 'print:flex');
    expect(canvas.querySelectorAll('.resume-paper-page-card')).toHaveLength(2);
    expect(canvas).toHaveStyle({ width: `${pageWidthPx * 0.5}px`, height: `${(2 * pageHeightPx + 24) * 0.5}px` });
    expect(canvas.querySelector('.origin-top-left')).toHaveStyle({ transform: 'scale(0.5)' });
    expect(canvas.querySelectorAll('[data-page-viewport]')).toHaveLength(2);
    expect(canvas.querySelectorAll('.resume-paper-page-card')[1]).toHaveAttribute('data-content-offset', String(pageHeightPx - 2 * marginPx));
  });

  it('exposes one continuous resume while keeping split-paragraph projections out of accessibility and tab order', async () => {
    const canvasRef = createRef<HTMLDivElement>();
    const paragraph = 'A continuous paragraph spanning multiple visual pages. '.repeat(80).trim();
    const { rerender } = render(
      <ResumeCanvas canvasRef={canvasRef} scale={1}>
        <ResumeRenderer markdown={`---\nname: Alex\n---\n\n## Experience\n\n${paragraph}\n\n[Portfolio](https://example.com)`}
          theme={{ ...DEFAULT_THEME_CONFIG, customCss: '.resume-content p { letter-spacing: 0; }' }} />
      </ResumeCanvas>,
    );

    await waitFor(() => expect(canvasRef.current).toHaveAttribute('data-pagination-ready', 'true'));
    const canvas = canvasRef.current!;
    const semantic = screen.getByRole('heading', { name: 'Experience' }).closest('.sr-only')!;
    expect(semantic).toHaveClass('print:hidden');
    expect(semantic.parentElement).toBe(canvas.parentElement);
    expect(canvas).not.toContainElement(semantic as HTMLElement);
    expect(within(semantic as HTMLElement).getByText(paragraph)).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Experience' })).toHaveLength(1);
    expect(screen.getAllByRole('link', { name: 'Portfolio' })).toHaveLength(1);
    expect(screen.getAllByRole('paragraph').filter(node => node.textContent === paragraph)).toHaveLength(1);

    const projection = canvas.querySelector('.origin-top-left')!;
    expect(projection).toHaveAttribute('aria-hidden', 'true');
    expect(projection).not.toHaveAttribute('inert');
    expect(within(projection as HTMLElement).queryByRole('link')).toBeNull();
    expect(screen.getByRole('link', { name: 'Portfolio' })).not.toHaveAttribute('tabindex', '-1');
    const projectedLinks = projection.querySelectorAll<HTMLAnchorElement>('a[href]');
    expect(projectedLinks).toHaveLength(2);
    projectedLinks.forEach(link => {
      expect(link).toHaveAttribute('tabindex', '-1');
      expect(link).toHaveAttribute('href', 'https://example.com');
    });
    // Both visual pages retain the full paragraph for clipping, rather than mutating pagination.
    expect(within(projection as HTMLElement).getAllByText(paragraph)).toHaveLength(2);
    expect(canvas.querySelectorAll('.resume-paper-page-card > div:nth-child(2) > div > .resume-template')).toHaveLength(2);
    const measure = document.querySelector(`[data-resume-measure-id="${canvas.dataset.measureId}"]`)!;
    expect(measure).toHaveAttribute('aria-hidden', 'true');
    expect(measure).toHaveAttribute('inert');
    // Independently mounted renderers get distinct useId values for custom CSS.
    // Projection style IDs remain the measured IDs used by the existing pagination/export path.
    const semanticIds = Array.from(semantic.querySelectorAll('style[id]'), node => node.id);
    const measuredIds = Array.from(measure.querySelectorAll('style[id]'), node => node.id);
    expect(semanticIds).toHaveLength(2);
    expect(semanticIds.every(id => !measuredIds.includes(id))).toBe(true);
    expect(measure.querySelector('style')!.textContent).not.toBe('');
    expect(Array.from(projection.querySelectorAll('style')).every(node => node.textContent === '')).toBe(true);

    rerender(<ResumeCanvas canvasRef={canvasRef} scale={1} pending><h1>Updated resume</h1></ResumeCanvas>);
    expect(screen.getAllByRole('heading', { name: 'Updated resume' })).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: 'Experience' })).toBeNull();
    expect(canvas).toHaveAttribute('aria-busy', 'true');
    expect(canvas).toHaveAttribute('data-pagination-ready', 'false');
    await waitFor(() => expect(within(projection as HTMLElement).getAllByText('Updated resume')).toHaveLength(2));
  });

  it('keeps the font failure alert and retry accessible outside the hidden projections', async () => {
    const load = vi.spyOn(document.fonts, 'load').mockRejectedValue(new Error('Font unavailable'));
    const canvasRef = createRef<HTMLDivElement>();
    render(<ResumeCanvas canvasRef={canvasRef} scale={1} lang="en"><h1>Resume</h1></ResumeCanvas>);

    const alert = await screen.findByRole('alert');
    const retry = within(alert).getByRole('button', { name: 'Retry font loading' });
    expect(alert.closest('[aria-hidden="true"], [inert]')).toBeNull();
    expect(canvasRef.current).toHaveAttribute('data-pagination-ready', 'false');
    load.mockResolvedValue([{} as FontFace]);
    fireEvent.click(retry);
    await waitFor(() => expect(canvasRef.current).toHaveAttribute('data-pagination-ready', 'true'));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getAllByRole('heading', { name: 'Resume' })).toHaveLength(1);
  });

  it('publishes the first page before completing the remaining pages', async () => {
    const source = document.createElement('div');
    Object.defineProperty(source, 'scrollHeight', { configurable: true, value: 5 });
    source.innerHTML = '<div><span>Resume content</span></div>';
    const snapshots: number[] = [];

    const pages = await paginateResumeAsync(source, 1, 0, () => false, first => {
      snapshots.push(first.length);
    });

    expect(snapshots).toEqual([1]);
    expect(pages).toHaveLength(5);
  });
});
