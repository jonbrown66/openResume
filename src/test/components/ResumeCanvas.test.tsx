import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { pageWidthPx } from '@/constants';
import { ResumeCanvas } from '@/components/ResumeCanvas';

describe('ResumeCanvas', () => {
  it('lets the preview paper height adapt to resume content', () => {
    render(
      <ResumeCanvas scale={1}>
        <div>Resume content</div>
      </ResumeCanvas>,
    );

    const instances = screen.getAllByText('Resume content');
    expect(instances.length).toBe(2); // 离线测量 + 多页卡片预览共2份

    const previewContainer = instances[1].closest('.resume-canvas-screen-preview');
    expect(previewContainer).toBeTruthy();
    expect(previewContainer).toHaveClass('resume-canvas-screen-preview', 'print:flex');
  });
});
