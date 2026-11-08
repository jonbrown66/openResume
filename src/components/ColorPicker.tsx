import { memo } from 'react';
import { motion } from 'framer-motion';
import { useDragScroll } from '@/hooks/useDragScroll';

interface ColorPickerProps {
  label: string;
  value: string;
  presets: string[];
  onChange: (value: string) => void;
}

export const ColorPicker = memo(function ColorPicker({
  label,
  value,
  presets,
  onChange,
}: ColorPickerProps) {
  const list = useDragScroll<HTMLDivElement>();
  return (
    <div className="ui-color-picker">
      <span className="ui-label">{label}</span>
      <motion.div
        className="relative w-11 h-11 rounded-[var(--ui-radius-panel)] overflow-hidden border border-[var(--app-border)] cursor-pointer flex-shrink-0"
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
          aria-label={label}
        />
        <div
          className="w-full h-full"
          style={{ backgroundColor: value }}
        />
      </motion.div>
      <div
        ref={list.ref}
        className="ui-swatch-list"
        data-scrollable={list.scrollable || undefined}
        data-dragging={list.dragging || undefined}
        style={{
          '--fade-start': list.atStart ? '0px' : '24px',
          '--fade-end': list.atEnd ? '0px' : '24px',
        } as React.CSSProperties}
        {...list.handlers}
      >
        {presets.map((color) => (
          <motion.button
            key={color}
            type="button"
            data-color-swatch
            aria-label={`${label}: ${color}`}
            aria-pressed={value.toLowerCase() === color.toLowerCase()}
            onClick={() => onChange(color)}
            className="ui-swatch"
          ><span style={{ backgroundColor: color }} /></motion.button>
        ))}
      </div>
    </div>
  );
});
