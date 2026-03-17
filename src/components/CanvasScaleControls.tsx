import { Minus, Plus, ScanText } from 'lucide-react';

interface CanvasScaleControlsProps {
  zoom: number;
  onReset: () => void;
  onZoomChange: (delta: number) => void;
}

export function CanvasScaleControls({ zoom, onReset, onZoomChange }: CanvasScaleControlsProps) {
  return (
    <div className="absolute bottom-6 right-6 z-30 opacity-0 group-hover/preview:opacity-100 transition-all duration-500 transform translate-y-2 group-hover/preview:translate-y-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl px-2 py-2 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 flex items-center gap-1 print:hidden">
      <button
        type="button"
        aria-label="缩小画布"
        onClick={() => onZoomChange(-10)}
        className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
      >
        <Minus size={14} />
      </button>
      <span className="text-xs font-bold text-gray-600 dark:text-gray-300 min-w-[3rem] text-center tabular-nums">
        {zoom}%
      </span>
      <button
        type="button"
        aria-label="放大画布"
        onClick={() => onZoomChange(10)}
        className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
      >
        <Plus size={14} />
      </button>
      <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />
      <button
        type="button"
        aria-label="适应画布"
        onClick={onReset}
        className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
      >
        <ScanText size={14} />
      </button>
    </div>
  );
}
