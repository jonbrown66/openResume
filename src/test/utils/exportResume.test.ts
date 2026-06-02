import { afterEach, describe, expect, it, vi } from 'vitest';

import { exportToHtml, exportToPdf } from '@/utils/exportResume';
import { defaultMarkdownEn } from '@/constants';
import { parseMarkdownToResumeDraft } from '@/utils/resumeDocument';

describe('exportResume', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('exports unscaled html with inlined styles for visual parity', async () => {
    const style = document.createElement('style');
    style.textContent = '.resume-template { background: rgb(250, 249, 243); }';
    document.head.appendChild(style);

    const canvas = document.createElement('div');
    canvas.className = 'resume-paper';
    canvas.style.transform = 'scale(0.5)';
    canvas.style.width = '794px';
    canvas.innerHTML = '<div class="resume-template">Resume content</div>';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['ok'], { type: 'text/html' })),
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:resume'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await exportToHtml(canvas, parseMarkdownToResumeDraft(defaultMarkdownEn));

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);

    expect(requestBody.html).toContain('.resume-template');
    expect(requestBody.html).toContain('data-export-mode="html"');
    expect(requestBody.html).toContain('transform: none !important');
    expect(requestBody.html).not.toContain('scale(0.5)');
    expect(requestBody.html).not.toContain('min-height: 297mm');
  });

  it('uses lightweight pdf-only style overrides for smoother PDF preview', async () => {
    const canvas = document.createElement('div');
    canvas.className = 'resume-paper';
    canvas.innerHTML = '<div class="resume-template">Resume content</div>';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['ok'], { type: 'application/pdf' })),
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:resume'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await exportToPdf(canvas, parseMarkdownToResumeDraft(defaultMarkdownEn));

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);

    expect(requestBody.html).toContain('data-export-mode="pdf"');
    expect(requestBody.html).toContain('[data-export-mode="pdf"] .resume-template');
    expect(requestBody.html).toContain('box-shadow: none !important');
    expect(requestBody.html).toContain('background: var(--resume-paper) !important');
  });
});
