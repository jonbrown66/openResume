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

    const paper = screen.getByText('Resume content').parentElement;

    expect(paper).toHaveClass('resume-paper', 'flex', 'flex-col');
    expect(paper).toHaveStyle({
      width: `${pageWidthPx}px`,
      height: 'auto',
    });
    expect(paper).not.toHaveStyle({ minHeight: '1123px' });
  });
});
