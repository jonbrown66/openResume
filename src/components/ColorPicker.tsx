import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

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
  return (
    <div className="space-y-2">
      <span className="ui-label">{label}</span>
      <div className="flex items-start gap-2">
      <motion.div
        className="relative w-11 h-11 rounded-xl overflow-hidden border border-[var(--app-border)] cursor-pointer flex-shrink-0"
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
      <div className="ui-swatch-list">
        {presets.map((color) => (
          <motion.button
            key={color}
            type="button"
            data-color-swatch
            aria-label={`${label}: ${color}`}
            aria-pressed={value.toLowerCase() === color.toLowerCase()}
            onClick={() => onChange(color)}
            className={cn('ui-swatch')}
          ><span style={{ backgroundColor: color }} /></motion.button>
        ))}
      </div>
      </div>
    </div>
  );
});
