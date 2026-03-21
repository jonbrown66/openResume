import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CanvasScaleControls } from '@/components/CanvasScaleControls';

describe('CanvasScaleControls', () => {
  it('emits zoom updates for minus, plus, and reset actions', () => {
    const onZoomChange = vi.fn();
    const onReset = vi.fn();

    render(<CanvasScaleControls zoom={100} onZoomChange={onZoomChange} onReset={onReset} />);

    fireEvent.click(screen.getByLabelText('缩小画布'));
    fireEvent.click(screen.getByLabelText('放大画布'));
    fireEvent.click(screen.getByLabelText('适应画布'));

    expect(onZoomChange).toHaveBeenNthCalledWith(1, -10);
    expect(onZoomChange).toHaveBeenNthCalledWith(2, 10);
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
