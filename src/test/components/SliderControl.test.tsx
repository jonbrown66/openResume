import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SliderControl } from '@/components/SliderControl';

function setup() {
  const change = vi.fn();
  function Control() {
    const [value, setValue] = useState(12);
    return <SliderControl label="Font size" unit="pt" value={value} min={8} max={16} step={0.5}
      icon={null} onChange={next => { change(next); setValue(next); }} />;
  }
  render(<Control />);
  return { input: screen.getByRole('spinbutton'), slider: screen.getByRole('slider'), change };
}

describe('SliderControl', () => {
  it('applies keyboard step changes immediately', () => {
    const { input, change } = setup();
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(change).toHaveBeenLastCalledWith(12.5);
    expect(input).toHaveValue(12.5);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveValue(12);
  });
  it('allows clearing and retyping before committing with Enter', () => {
    const { input, slider, change } = setup();
    fireEvent.change(input, { target: { value: '' } });
    expect(input).toHaveValue(null);
    fireEvent.change(input, { target: { value: '1' } });
    expect(input).toHaveValue(1);
    expect(change).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '14' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(change).toHaveBeenCalledExactlyOnceWith(14);
    expect(slider).toHaveValue('14');
  });
  it('clamps and aligns to the slider step on blur', () => {
    const { input, change } = setup();
    fireEvent.change(input, { target: { value: '99' } });
    fireEvent.blur(input);
    expect(input).toHaveValue(16);
    fireEvent.change(input, { target: { value: '10.3' } });
    fireEvent.blur(input);
    expect(change).toHaveBeenLastCalledWith(10.5);
    expect(input).toHaveValue(10.5);
  });
  it('cancels drafts with Escape and restores empty input on blur', () => {
    const { input, change } = setup();
    fireEvent.change(input, { target: { value: '15' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue(12);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(input).toHaveValue(12);
    expect(change).not.toHaveBeenCalled();
  });
  it('keeps range changes immediate', () => {
    const { input, slider, change } = setup();
    fireEvent.change(slider, { target: { value: '13.5' } });
    expect(change).toHaveBeenCalledExactlyOnceWith(13.5);
    expect(input).toHaveValue(13.5);
  });
});
