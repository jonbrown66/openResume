import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ThemeEditorPanel } from '@/components/ThemeEditorPanel';
import { translations } from '@/config/ui';
import { DEFAULT_THEME_CONFIG } from '@/types/theme';

describe('ThemeEditorPanel', () => {
  it('keeps the panel open when interacting with a portaled select', () => {
    const onClose = vi.fn();
    const triggerRef = createRef<HTMLButtonElement>();

    render(
      <ThemeEditorPanel
        triggerRef={triggerRef}
        anchorRect={{ top: 0, bottom: 40, left: 0, right: 320 } as DOMRect}
        theme={DEFAULT_THEME_CONFIG}
        lang="en"
        onChange={vi.fn()}
        onReset={vi.fn()}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('dialog', { name: translations.en.styleEditor })).toBeInTheDocument();

    const selectContent = document.createElement('div');
    selectContent.setAttribute('data-slot', 'select-content');
    document.body.appendChild(selectContent);

    try {
      fireEvent.mouseDown(selectContent);
      expect(onClose).not.toHaveBeenCalled();
    } finally {
      selectContent.remove();
    }
  });
});
