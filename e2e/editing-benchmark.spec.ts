import { test, expect } from './fixtures';
import { writeFile } from 'node:fs/promises';
import { DEFAULT_THEME_CONFIG } from '../src/types/theme';
import { parseMarkdownToResumeDraft } from '../src/utils/resumeDocument';

for (const entries of [4, 40]) {
  test(`editing benchmark ${entries} entries`, async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const markdown = '---\nname: Benchmark\ntitle: Engineer\n---\n\n## Experience\n\n' +
      Array.from({ length: entries }, (_, index) => `### Engineer ${index} | 2020 - Present\n**Example**\n- ${'Developed accessible interfaces and maintained reliable releases. '.repeat(8)}\n`).join('\n');
    await page.addInitScript(({ markdown, data, theme }) => {
      localStorage.setItem('myresume-settings-v1', JSON.stringify({ language: 'en', theme: 'light' }));
      localStorage.setItem('resume_projects', JSON.stringify({ projects: [{ id: 'benchmark', name: 'Benchmark', markdown, data, theme,
        templateId: 'classic', layout: {}, createdAt: 1, updatedAt: 1 }], currentProjectId: 'benchmark' }));
    }, { markdown, data: parseMarkdownToResumeDraft(markdown), theme: DEFAULT_THEME_CONFIG });
    await page.goto('/');
    const editor = page.getByRole('textbox', { name: 'Resume Markdown' });
    await expect(page.locator('.resume-canvas-screen-preview')).toHaveAttribute('data-pagination-ready', 'true');
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await editor.press('Control+Home');
    await editor.press('ArrowDown');
    await editor.press('End');
    await page.evaluate(() => {
      const samples = { inputToFrame: [] as number[], longTasks: [] as number[] };
      Object.assign(window, { editingSamples: samples });
      new PerformanceObserver(list => samples.longTasks.push(...list.getEntries().map(entry => entry.duration))).observe({ type: 'longtask' });
      document.querySelector('[data-code-editor]')!.addEventListener('input', () => {
        const start = performance.now();
        requestAnimationFrame(() => samples.inputToFrame.push(performance.now() - start));
      }, { capture: true });
    });
    await editor.pressSequentially(' building responsive and reliable software');
    await expect(editor).toBeFocused();
    const settleStart = Date.now();
    await expect(page.locator('.resume-canvas-screen-preview')).toHaveAttribute('data-pagination-ready', 'true');
    const settleMs = Date.now() - settleStart;
    const samples = await page.evaluate(() => (window as unknown as { editingSamples: { inputToFrame: number[]; longTasks: number[] } }).editingSamples);
    const sorted = [...samples.inputToFrame].sort((a, b) => a - b);
    const result = { entries, cpuSlowdown: 4, samples: sorted.length,
      inputToFrameP50: sorted[Math.floor(sorted.length * 0.5)], inputToFrameP95: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))],
      longTasks: samples.longTasks.length, longestTask: Math.max(0, ...samples.longTasks), settleMs,
      domNodes: await page.locator('*').count(), pages: await page.locator('.resume-paper-page-card').count() };
    console.log(`EDITING_BENCHMARK ${JSON.stringify(result)}`);
    await writeFile(testInfo.outputPath('editing-benchmark.json'), JSON.stringify(result, null, 2));
    await testInfo.attach('editing-benchmark.json', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
    expect(sorted.length).toBeGreaterThan(0);
    await session.detach();
  });
}
