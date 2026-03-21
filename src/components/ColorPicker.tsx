import { memo, useCallback } from 'react';
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
    <div className="flex items-center gap-2">
      <motion.div 
        className="relative w-6 h-6 rounded-full overflow-hidden border-2 border-white dark:border-zinc-800 shadow-sm cursor-pointer flex-shrink-0"
        whileHover={{ scale: 1.1 }}
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
      <div className="flex gap-1">
        {presets.map((color) => (
          <motion.button
            key={color}
            onClick={() => onChange(color)}
            className={cn(
              "w-4 h-4 rounded-full border border-white/50 dark:border-zinc-800 shadow-sm flex-shrink-0",
              value === color && "ring-2 ring-zinc-400 ring-offset-1 dark:ring-offset-zinc-950"
            )}
            style={{ backgroundColor: color }}
            whileTap={{ scale: 0.9 }}
          />
        ))}
      </div>
    </div>
  );
});
