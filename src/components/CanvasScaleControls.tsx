import { memo } from 'react';
import { Minus, Plus, ScanText } from 'lucide-react';

interface CanvasScaleControlsProps {
  lang?: 'zh' | 'en';
  zoom: number;
  actualScale?: number;
  onReset: () => void;
  onZoomChange: (delta: number) => void;
}

export const CanvasScaleControls = memo(function CanvasScaleControls({ zoom, actualScale, onReset, onZoomChange, lang = 'zh' }: CanvasScaleControlsProps) {
  return (
    <div
      className="ui-floating-tools absolute [inset-block-end:calc(9.5rem+env(safe-area-inset-bottom))] [inset-inline-end:0.75rem] z-40 print:hidden sm:[inset-block-end:6rem] sm:[inset-inline-end:1.5rem]"
    >
      <div role="group" aria-label={lang === 'zh' ? '画布缩放' : 'Canvas zoom'} className="app-panel ui-toolbar flex w-14 flex-col items-center gap-1 rounded-xl border p-1">
        <button
          type="button"
          aria-label={lang === 'zh' ? '放大画布' : 'Zoom in'}
          disabled={zoom >= 250}
          onClick={() => onZoomChange(10)}
          className="app-control flex w-full items-center justify-center rounded-md p-2 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
        >
          <Plus size={14} />
        </button>
        <span className="w-full py-1 text-center text-xs font-semibold tabular-nums text-[var(--secondary-foreground)]">
          {actualScale === undefined ? zoom : Math.round(actualScale * 100)}%
        </span>
        <button
          type="button"
          aria-label={lang === 'zh' ? '缩小画布' : 'Zoom out'}
          disabled={zoom <= 60}
          onClick={() => onZoomChange(-10)}
          className="app-control flex w-full items-center justify-center rounded-md p-2 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
        >
          <Minus size={14} />
        </button>
        <div className="h-px w-6 bg-[var(--app-border)]" />
        <button
          type="button"
          aria-label={lang === 'zh' ? '适应画布' : 'Fit canvas'}
          onClick={onReset}
          className="app-control flex w-full items-center justify-center rounded-md p-2 transition-colors"
        >
          <ScanText size={14} />
        </button>
      </div>
    </div>
  );
});
