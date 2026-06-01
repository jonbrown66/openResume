import { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';

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
  const percentage = ((value - min) / (max - min)) * 100;

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
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 min-w-[70px]">
        <div className="text-zinc-400">{icon}</div>
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{label}</span>
      </div>
      <div className="flex-1 relative h-5 flex items-center">
        <div className="absolute left-0 right-0 h-1.5 bg-[var(--app-surface-muted)] rounded-full" />
        <div 
          className="absolute left-0 h-1.5 bg-[var(--app-accent)] rounded-full transition-all duration-75"
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          className={cn(
            "absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer z-10",
            "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4",
            "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:dark:bg-zinc-100",
            "[&::-webkit-slider-thumb]:shadow-[0_2px_5px_rgba(0,0,0,0.2)] [&::-webkit-slider-thumb]:dark:shadow-[0_2px_5px_rgba(0,0,0,0.5)]",
            "[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-zinc-200 [&::-webkit-slider-thumb]:dark:border-zinc-700",
            "[&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing",
            "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
          )}
        />
      </div>
      <div className="flex items-center gap-1 min-w-[52px]">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleInputChange}
          className={cn(
            "w-10 h-6 text-center font-mono text-[11px]",
            "bg-[var(--app-surface-muted)] border border-[var(--app-border)] rounded-md",
            "focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]/40",
            "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            "tabular-nums"
          )}
        />
        {unit && <span className="text-[10px] text-zinc-400 w-4">{unit}</span>}
      </div>
    </div>
  );
});
