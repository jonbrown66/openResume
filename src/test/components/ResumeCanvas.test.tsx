import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeAll } from 'vitest';

import { ResumeCanvas } from '@/components/ResumeCanvas';
import { paginateResumeAsync } from '@/utils/pagination';

describe('ResumeCanvas', () => {
  beforeAll(() => {
    Object.defineProperty(document, 'fonts', { configurable: true, value: Object.assign([{ family: 'Geist Variable', weight: '100 900' }], { load: async () => [{}] }) });
    // jsdom has no layout engine; line boundaries are checked by the browser E2E test.
    Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
  });
  it('lets the preview paper height adapt to resume content', async () => {
    render(
      <ResumeCanvas scale={1}>
        <div>Resume content</div>
      </ResumeCanvas>,
    );

    await waitFor(() => expect(screen.getAllByText('Resume content')).toHaveLength(2));
    const instances = screen.getAllByText('Resume content');
    expect(instances.length).toBe(2); // 离线测量 + 多页卡片预览共2份

    const previewContainer = instances.map(instance => instance.closest('.resume-canvas-screen-preview')).find(Boolean);
    expect(previewContainer).toBeTruthy();
    expect(previewContainer).toHaveClass('resume-canvas-screen-preview', 'print:flex');
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
