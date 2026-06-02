import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EditorPane } from '@/components/EditorPane';
import { translations } from '@/config/ui';
import { defaultMarkdownZh } from '@/constants';
import { parseMarkdownToResumeDraft } from '@/utils/resumeDocument';

function renderEditorPane(overrides?: Partial<React.ComponentProps<typeof EditorPane>>) {
  const draft = parseMarkdownToResumeDraft(defaultMarkdownZh);
  const props: React.ComponentProps<typeof EditorPane> = {
    containerRef: { current: null },
    draft,
    editorMode: 'markdown',
    lang: 'zh',
    isImporting: false,
    markdown: defaultMarkdownZh,
    translations: translations.zh,
    onDraftChange: vi.fn(),
    onEditorModeChange: vi.fn(),
    onMarkdownChange: vi.fn(),
    onFormatMarkdown: vi.fn(),
    ...overrides,
  };

  render(<EditorPane {...props} />);
  return props;
}

describe('EditorPane', () => {
  it('shows a markdown format button and calls the formatter callback', () => {
    const props = renderEditorPane();
    const formatButton = screen.getByRole('button', { name: '格式整理' });

    fireEvent.click(formatButton);

    expect(props.onFormatMarkdown).toHaveBeenCalledTimes(1);
    expect(formatButton).toHaveClass('rounded-full');
    expect(formatButton).not.toHaveTextContent('格式整理');
  });

  it('hides the markdown format button in block mode', () => {
    renderEditorPane({ editorMode: 'blocks' });

    expect(screen.queryByRole('button', { name: '格式整理' })).not.toBeInTheDocument();
  });
});
