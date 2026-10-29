import { memo } from 'react';
import { Minus, Plus } from 'lucide-react';

interface CanvasScaleControlsProps {
  lang?: 'zh' | 'en';
  zoom: number;
  actualScale?: number;
  onZoomChange: (delta: number) => void;
}

export const CanvasScaleControls = memo(function CanvasScaleControls({ zoom, actualScale, onZoomChange, lang = 'zh' }: CanvasScaleControlsProps) {
  const label = lang === 'zh' ? '画布缩放' : 'Canvas zoom';
  return (
    <div role="group" aria-label={label} className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        aria-label={lang === 'zh' ? '缩小画布' : 'Zoom out'}
        disabled={zoom <= 60}
        onClick={() => onZoomChange(-10)}
        className="app-control flex min-h-10 min-w-10 items-center justify-center rounded-[var(--ui-radius-control)] p-1.5 transition-colors disabled:opacity-35 disabled:cursor-not-allowed sm:min-h-8 sm:min-w-8"
      >
        <Minus size={14} />
      </button>
      <span className="min-w-9 text-center text-[11px] font-semibold tabular-nums text-[var(--secondary-foreground)]">
        {actualScale === undefined ? zoom : Math.round(actualScale * 100)}%
      </span>
      <button
        type="button"
        aria-label={lang === 'zh' ? '放大画布' : 'Zoom in'}
        disabled={zoom >= 250}
        onClick={() => onZoomChange(10)}
        className="app-control flex min-h-10 min-w-10 items-center justify-center rounded-[var(--ui-radius-control)] p-1.5 transition-colors disabled:opacity-35 disabled:cursor-not-allowed sm:min-h-8 sm:min-w-8"
      >
        <Plus size={14} />
      </button>
    </div>
  );
});
