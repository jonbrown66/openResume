import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ThemeEditorPanel', () => ({ ThemeEditorPanel: () => null }));

import { AppHeader } from '@/components/AppHeader';
import { DEFAULT_SETTINGS } from '@/config/settings';
import { translations, type AppLanguage } from '@/config/ui';
import { DEFAULT_THEME_CONFIG } from '@/types/theme';
import { ToastProvider } from '@/components/ui/Toast';

function header(lang: AppLanguage) {
  return <AppHeader lang={lang} theme="system" resolvedTheme="light" translations={translations[lang]}
    onLanguageToggle={vi.fn()} onThemeToggle={vi.fn()} settings={DEFAULT_SETTINGS}
    onUpdateProvider={vi.fn()} onSetActiveProvider={vi.fn()} resumeTheme={DEFAULT_THEME_CONFIG}
    onThemeChange={vi.fn()} onThemeReset={vi.fn()} projectSelector={<div>ProjectSelector</div>}
    importControl={<button type="button">Import</button>} exportControl={<button type="button">Export</button>} />;
}

describe('AppHeader', () => {
  it('renders the brand title before the project selector and keeps the GitHub link', () => {
    render(header('en'));
    const brandTitle = screen.getByText('OpenResume');
    const projectSelector = screen.getByText('ProjectSelector');
    const githubLink = screen.getByRole('link', { name: 'Open GitHub Project' });
    expect(brandTitle.compareDocumentPosition(projectSelector) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(githubLink).toHaveAttribute('href', 'https://github.com/jonbrown66/openResume');
    expect(githubLink).toHaveAttribute('target', '_blank');
  });

  it('groups secondary mobile header actions under a more menu', async () => {
    render(header('zh'));
    await act(async () => { await vi.dynamicImportSettled(); });
    await waitFor(() => expect(screen.getByRole('button', { name: '更多操作' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '更多操作' }));
    expect(screen.getByRole('menu', { name: '更多操作' })).toBeInTheDocument();
    for (const name of ['简历样式', '跟随系统', '切换语言', 'AI 设置', '打开 GitHub 项目']) {
      expect(screen.getByRole('menuitem', { name })).toBeInTheDocument();
    }
  });

  it('closes the mobile more menu when clicking outside', async () => {
    render(<div>{header('zh')}<button type="button">外部区域</button></div>);
    await act(async () => { await vi.dynamicImportSettled(); });
    await waitFor(() => expect(screen.getByRole('button', { name: '更多操作' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '更多操作' }));
    expect(screen.getByRole('menu', { name: '更多操作' })).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByRole('button', { name: '外部区域' }));
    fireEvent.mouseDown(screen.getByRole('button', { name: '外部区域' }));
    fireEvent.click(screen.getByRole('button', { name: '外部区域' }));
    await waitFor(() => expect(screen.queryByRole('menu', { name: '更多操作' })).not.toBeInTheDocument());
  });

  it('keeps API settings open when interacting with a portaled select', () => {
    render(<ToastProvider>{header('en')}</ToastProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'AI Settings' }));
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    const selectContent = document.createElement('div');
    selectContent.setAttribute('data-slot', 'select-content');
    document.body.appendChild(selectContent);
    try {
      fireEvent.mouseDown(selectContent);
      expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    } finally { selectContent.remove(); }
  });
});
