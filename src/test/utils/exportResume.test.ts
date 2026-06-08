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
    canvas.className = 'resume-canvas-screen-preview';
    canvas.style.transform = 'scale(0.5)';
    canvas.style.width = '794px';
    canvas.innerHTML = '<div class="origin-top-left"><div class="resume-paper-page-card resume-template">Resume content</div></div>';

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
    const bodyHtml = requestBody.html.slice(requestBody.html.indexOf('<body'));

    expect(requestBody.html).toContain('.resume-template');
    expect(requestBody.html).toContain('data-export-mode="html"');
    expect(requestBody.html).toContain('transform: none !important');
    expect(requestBody.html).not.toContain('scale(0.5)');
    expect(requestBody.html).not.toContain('min-height: 297mm');
    expect(bodyHtml).not.toContain('resume-paper-page-card');
    expect(bodyHtml).not.toContain('origin-top-left');
    expect(bodyHtml).toContain('class="resume-paper"');
  });

  it('builds multi-page card PDF document with physical pruning and zero margins', async () => {
    // 创建模拟多页卡片容器 DOM 结构
    const canvas = document.createElement('div');
    canvas.className = 'resume-canvas-screen-preview';

    const scaleWrapper = document.createElement('div');
    scaleWrapper.className = 'origin-top-left';

    // 创建一个页卡片
    const card = document.createElement('div');
    card.className = 'resume-paper-page-card template-classic resume-template';
    card.style.cssText = '--page-margin: 15mm; --resume-paper: #faf9f3; background: linear-gradient(180deg, rgba(255,255,255,0.58), rgba(255,255,255,0)), var(--resume-paper);';

    // 页码指示
    const pageNum = document.createElement('div');
    pageNum.className = 'absolute right-4 bottom-4 text-[10px] font-bold text-gray-300 pointer-events-none select-none z-40';
    pageNum.textContent = '1 / 1';
    card.appendChild(pageNum);

    // viewport div
    const viewport = document.createElement('div');
    const contentWrapper = document.createElement('div');
    const resumeTemplate = document.createElement('div');
    resumeTemplate.className = 'resume-template';
    resumeTemplate.innerHTML = '<div class="resume-header">Header</div><div class="resume-content"><div>Section 1</div></div>';
    contentWrapper.appendChild(resumeTemplate);
    viewport.appendChild(contentWrapper);
    card.appendChild(viewport);

    scaleWrapper.appendChild(card);
    canvas.appendChild(scaleWrapper);

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
    expect(requestBody.html).toContain('resume-pdf-document');
    expect(requestBody.html).toContain('resume-pdf-page');
    expect(requestBody.html).toContain('resume-paper-page-card');
    expect(requestBody.html).toContain('@page { size: A4 portrait; margin: 0 !important; }');
    expect(requestBody.html).toContain('[data-export-mode="pdf"] .resume-pdf-page');
    expect(requestBody.html).toContain('background: var(--resume-paper, #faf9f3) !important');
    expect(requestBody.html).toContain('print-color-adjust: exact !important');
    expect(requestBody.html).toContain('break-after: page');
    expect(requestBody.html).toContain('box-shadow: none !important');
    expect(requestBody.html).toContain('[data-export-mode="pdf"] .resume-template');
    expect(requestBody.html).toContain('background: var(--resume-paper) !important');
    expect(requestBody.html).toContain('[data-export-mode="pdf"] .origin-top-left');
    // 验证不包含旧的连续打印容器引用
    expect(requestBody.html).not.toContain('resume-canvas-print-document');
    expect(requestBody.html).not.toContain('resume-pdf-viewport');
    expect(requestBody.html).not.toContain('resume-pdf-content');
  });

  it('preserves distinct content offsets for each exported PDF page', async () => {
    const canvas = document.createElement('div');
    canvas.className = 'resume-canvas-screen-preview';

    const scaleWrapper = document.createElement('div');
    scaleWrapper.className = 'origin-top-left';

    const createCard = (offset: number) => {
      const card = document.createElement('div');
      card.className = 'resume-paper-page-card template-classic resume-template';
      card.setAttribute('data-content-offset', String(offset));
      card.style.cssText = '--page-margin: 15mm; --resume-paper: #faf9f3;';

      const pageNum = document.createElement('div');
      pageNum.className = 'z-40';
      card.appendChild(pageNum);

      const viewport = document.createElement('div');
      const contentWrapper = document.createElement('div');
      contentWrapper.style.position = 'absolute';
      contentWrapper.style.top = '-57px';
      contentWrapper.innerHTML = '<div class="resume-template">Resume content</div>';
      viewport.appendChild(contentWrapper);
      card.appendChild(viewport);

      return card;
    };

    scaleWrapper.appendChild(createCard(0));
    scaleWrapper.appendChild(createCard(1000));
    canvas.appendChild(scaleWrapper);

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

    expect(requestBody.html).toContain('data-content-offset="0"');
    expect(requestBody.html).toContain('data-content-offset="1000"');
    expect(requestBody.html).toContain('top: -57px');
    expect(requestBody.html).toContain('top: -1057px');
  });
});
