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
      className="absolute bottom-6 right-6 z-40 opacity-0 group-hover/preview:opacity-100 transition-opacity duration-200 print:hidden"
    >
      <div className="flex items-center gap-1 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-xl px-2 py-2 rounded-lg shadow-lg border border-zinc-200/50 dark:border-zinc-700/50">
        <button
          type="button"
          aria-label="缩小画布"
          onClick={() => onZoomChange(-10)}
          className="p-2 rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
        >
          <Minus size={14} />
        </button>
        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 min-w-[3rem] text-center tabular-nums">
          {zoom}%
        </span>
        <button
          type="button"
          aria-label="放大画布"
          onClick={() => onZoomChange(10)}
          className="p-2 rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
        >
          <Plus size={14} />
        </button>
        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />
        <button
          type="button"
          aria-label="适应画布"
          onClick={onReset}
          className="p-2 rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
        >
          <ScanText size={14} />
        </button>
      </div>
    </div>
  );
});
