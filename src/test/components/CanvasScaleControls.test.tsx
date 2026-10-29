import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CanvasScaleControls } from '@/components/CanvasScaleControls';

describe('CanvasScaleControls', () => {
  it('emits zoom updates for minus and plus actions', () => {
    const onZoomChange = vi.fn();

    render(<CanvasScaleControls zoom={100} onZoomChange={onZoomChange} />);

    fireEvent.click(screen.getByLabelText('缩小画布'));
    fireEvent.click(screen.getByLabelText('放大画布'));

    expect(onZoomChange).toHaveBeenNthCalledWith(1, -10);
    expect(onZoomChange).toHaveBeenNthCalledWith(2, 10);
    expect(screen.queryByLabelText('适应画布')).not.toBeInTheDocument();
  });
});
