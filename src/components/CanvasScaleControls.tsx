import { memo } from 'react';
import { Minus, Plus, ScanText } from 'lucide-react';

interface CanvasScaleControlsProps {
  zoom: number;
  onReset: () => void;
  onZoomChange: (delta: number) => void;
}

export const CanvasScaleControls = memo(function CanvasScaleControls({ zoom, onReset, onZoomChange }: CanvasScaleControlsProps) {
  return (
    <div 
      className="absolute bottom-20 left-1/2 z-40 -translate-x-1/2 opacity-100 transition-opacity duration-200 print:hidden lg:bottom-6 lg:left-auto lg:right-6 lg:translate-x-0"
    >
      <div className="app-panel flex items-center gap-1 rounded-xl border px-2 py-2">
        <button
          type="button"
          aria-label="缩小画布"
          onClick={() => onZoomChange(-10)}
          className="app-control flex min-h-10 min-w-10 items-center justify-center rounded-md p-2 transition-colors sm:min-h-0 sm:min-w-0"
        >
          <Minus size={14} />
        </button>
        <span className="min-w-[3rem] text-center text-xs font-semibold tabular-nums text-[var(--secondary-foreground)]">
          {zoom}%
        </span>
        <button
          type="button"
          aria-label="放大画布"
          onClick={() => onZoomChange(10)}
          className="app-control flex min-h-10 min-w-10 items-center justify-center rounded-md p-2 transition-colors sm:min-h-0 sm:min-w-0"
        >
          <Plus size={14} />
        </button>
        <div className="w-px h-4 bg-[var(--app-border)] mx-1" />
        <button
          type="button"
          aria-label="适应画布"
          onClick={onReset}
          className="app-control flex min-h-10 min-w-10 items-center justify-center rounded-md p-2 transition-colors sm:min-h-0 sm:min-w-0"
        >
          <ScanText size={14} />
        </button>
      </div>
    </div>
  );
});
