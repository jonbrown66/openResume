import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CssEditorModal } from '@/components/CssEditorModal';

describe('CssEditorModal', () => {
  it.each(['classic', 'minimal', 'standard', 'sidebar'] as const)('leaves %s unchanged when saving the starter CSS', template => {
    const onSave = vi.fn();
    render(<CssEditorModal isOpen onClose={vi.fn()} customCss="" onSave={onSave} onReset={vi.fn()} lang="en" template={template} currentFont="Geist" />);
    const editor = screen.getByRole('textbox', { name: 'Custom CSS' }) as HTMLTextAreaElement;
    const style = document.createElement('style');
    style.textContent = editor.value;
    document.head.appendChild(style);
    try {
      expect(style.sheet!.cssRules).toHaveLength(0);
      expect(editor.value).toContain(`.template-${template}`);
      expect(editor.value).not.toContain('.sidebar-section');
      fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
      expect(onSave).toHaveBeenCalledWith(editor.value);
    } finally { style.remove(); }
  });

  it('preserves existing custom CSS instead of replacing user rules', () => {
    const customCss = '.resume-content { color: navy; }';
    render(<CssEditorModal isOpen onClose={vi.fn()} customCss={customCss} onSave={vi.fn()} onReset={vi.fn()} lang="en" template="minimal" currentFont="Geist" />);
    expect(screen.getByRole('textbox', { name: 'Custom CSS' })).toHaveValue(customCss);
  });
});
