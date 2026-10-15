import { memo, useCallback, useId, type CSSProperties } from 'react';

interface SliderControlProps {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  icon: React.ReactNode;
  onChange: (value: number) => void;
}

export const SliderControl = memo(function SliderControl({
  label,
  unit,
  value,
  min,
  max,
  step,
  icon,
  onChange,
}: SliderControlProps) {
  const labelId = useId();

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  }, [onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      onChange(Math.min(max, Math.max(min, val)));
    }
  }, [min, max, onChange]);

  return (
    <div className="ui-slider-control">
      <div className="ui-slider-label">
        <span aria-hidden="true">{icon}</span>
        <span id={labelId} className="ui-label">{label}</span>
      </div>
      <div className="ui-slider-row">
        <input
          aria-labelledby={labelId}
          aria-valuetext={`${value}${unit ? ` ${unit}` : ''}`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          className="ui-slider"
          style={{ '--slider-progress': `${Math.max(0, Math.min(100, (value - min) / (max - min) * 100))}%` } as CSSProperties}
        />
        <div className="ui-slider-value">
          <input
            aria-label={`${label} (${unit || 'value'})`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleInputChange}
            className="ui-number-field"
          />
          {unit && <span aria-hidden="true">{unit}</span>}
        </div>
      </div>
    </div>
  );
});
