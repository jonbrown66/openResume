import { memo, useCallback, useId, useState, type CSSProperties } from 'react';

interface SliderControlProps {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  icon: React.ReactNode;
  description?: string;
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
  description,
  onChange,
}: SliderControlProps) {
  const labelId = useId();
  const [inputDraft, setInputDraft] = useState<string | null>(null);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputDraft(null);
    onChange(parseFloat(e.target.value));
  }, [onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputDraft(e.target.value);
  }, []);

  const commitInput = () => {
    if (inputDraft !== null && inputDraft.trim() !== '') {
      const parsed = Number(inputDraft);
      if (Number.isFinite(parsed)) {
        const clamped = Math.min(max, Math.max(min, parsed));
        const snapped = Number((min + Math.round((clamped - min) / step) * step).toFixed(6));
        const next = Math.min(max, Math.max(min, snapped));
        if (next !== value) onChange(next);
      }
    }
    setInputDraft(null);
  };

  return (
    <div className="ui-slider-control">
      <div className="ui-slider-label">
        <span aria-hidden="true">{icon}</span>
        <span id={labelId} className="ui-label" title={description}>{label}</span>
      </div>
      <div className="ui-slider-row">
        <input
          aria-labelledby={labelId}
          aria-describedby={description ? `${labelId}-description` : undefined}
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
            aria-describedby={description ? `${labelId}-description` : undefined}
            type="number"
            min={min}
            max={max}
            step={step}
            value={inputDraft ?? value}
            onChange={handleInputChange}
            onBlur={commitInput}
            onKeyDown={event => {
              if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault();
                const current = inputDraft === null || inputDraft.trim() === '' ? value : Number(inputDraft);
                const next = Math.min(max, Math.max(min, Number(((Number.isFinite(current) ? current : value) + (event.key === 'ArrowUp' ? step : -step)).toFixed(6))));
                setInputDraft(null);
                if (next !== value) onChange(next);
              }
              if (event.key === 'Enter') { event.preventDefault(); commitInput(); }
              if (event.key === 'Escape' && inputDraft !== null) {
                event.preventDefault(); event.stopPropagation(); setInputDraft(null);
              }
            }}
            className="ui-number-field"
          />
          {unit && <span aria-hidden="true">{unit}</span>}
        </div>
      </div>
      {description && <span id={`${labelId}-description`} className="sr-only">{description}</span>}
    </div>
  );
});
