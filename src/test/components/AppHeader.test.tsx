import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/SettingsModal', () => ({
  SettingsModal: () => null,
}));

vi.mock('@/components/ThemeEditorPanel', () => ({
  ThemeEditorPanel: () => null,
}));

vi.mock('@/components/ProjectSelector', () => ({
  ProjectSelector: () => <div>ProjectSelector</div>,
}));

vi.mock('@/components/ExportMenu', () => ({
  ExportMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { AppHeader } from '@/components/AppHeader';
import { DEFAULT_SETTINGS } from '@/config/settings';
import { translations } from '@/config/ui';
import { parseMarkdownToResumeDraft } from '@/utils/resumeDocument';
import { defaultMarkdownZh } from '@/constants';
import { DEFAULT_THEME_CONFIG } from '@/types/theme';

describe('AppHeader', () => {
  it('renders the brand title before the project selector and keeps the GitHub link', () => {
    render(
      <AppHeader
        fileInputRef={createRef<HTMLInputElement>()}
        onFileChange={vi.fn()}
        isImporting={false}
        importStep="idle"
        lang="en"
        theme="system"
        resolvedTheme="light"
        translations={translations.en}
        canvasRef={createRef<HTMLDivElement>()}
        draft={parseMarkdownToResumeDraft(defaultMarkdownZh)}
        onImportClick={vi.fn()}
        onLanguageToggle={vi.fn()}
        onThemeToggle={vi.fn()}
        settings={DEFAULT_SETTINGS}
        onUpdateProvider={vi.fn()}
        onSetActiveProvider={vi.fn()}
        resumeTheme={DEFAULT_THEME_CONFIG}
        onThemeChange={vi.fn()}
        onThemeReset={vi.fn()}
        template="classic"
        onUpdateSettings={vi.fn()}
        projects={[]}
        currentProject={undefined}
        onProjectSwitch={vi.fn()}
        onProjectCreate={vi.fn()}
        onProjectRename={vi.fn()}
        onProjectDelete={vi.fn()}
      />,
    );

    const brandTitle = screen.getByText('OpenResume');
    const projectSelector = screen.getByText('ProjectSelector');
    const githubLink = screen.getByRole('link', { name: 'Open GitHub Project' });

    expect(
      brandTitle.compareDocumentPosition(projectSelector) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(githubLink).toHaveAttribute('href', 'https://github.com/jonbrown66/openResume');
    expect(githubLink).toHaveAttribute('target', '_blank');
  });
});
