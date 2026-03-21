import { describe, expect, it } from 'vitest';

import { convertDocxHtmlToText, reconstructPdfPageText, type PdfTextItemLike } from '@/utils/fileExtractor';

describe('fileExtractor helpers', () => {
  it('reconstructs pdf items into readable lines and paragraphs', () => {
    const items: PdfTextItemLike[] = [
      { str: '张三', transform: [1, 0, 0, 1, 80, 760], width: 40, height: 16 },
      { str: '高级行政经理', transform: [1, 0, 0, 1, 80, 736], width: 96, height: 14 },
      { str: '工作经历', transform: [1, 0, 0, 1, 80, 690], width: 64, height: 14 },
      { str: '行政主管', transform: [1, 0, 0, 1, 80, 664], width: 64, height: 12 },
      { str: '2023年10月 - 至今', transform: [1, 0, 0, 1, 270, 664], width: 120, height: 12 },
      { str: '某某科技有限公司', transform: [1, 0, 0, 1, 80, 640], width: 112, height: 12 },
      { str: '负责协调跨部门行政流程优化。', transform: [1, 0, 0, 1, 95, 616], width: 210, height: 12 },
      { str: '组织月度预算与采购管理。', transform: [1, 0, 0, 1, 95, 592], width: 180, height: 12 },
    ];

    const text = reconstructPdfPageText(items);

    expect(text).toContain('张三');
    expect(text).toContain('工作经历');
    expect(text).toContain('行政主管 2023年10月 - 至今');
    expect(text).toContain('某某科技有限公司');
    expect(text).toContain('负责协调跨部门行政流程优化。');
    expect(text).toContain('\n\n工作经历\n');
  });

  it('keeps two-column pdf content grouped instead of interleaving rows', () => {
    const items: PdfTextItemLike[] = [
      { str: '联系电话', transform: [1, 0, 0, 1, 40, 760], width: 60, height: 12 },
      { str: '138-0000-0000', transform: [1, 0, 0, 1, 40, 736], width: 100, height: 12 },
      { str: '工作经历', transform: [1, 0, 0, 1, 260, 760], width: 64, height: 12 },
      { str: '行政主管', transform: [1, 0, 0, 1, 260, 736], width: 64, height: 12 },
      { str: '某某科技有限公司', transform: [1, 0, 0, 1, 260, 712], width: 112, height: 12 },
      { str: '负责协调跨部门行政流程优化。', transform: [1, 0, 0, 1, 260, 688], width: 210, height: 12 },
    ];

    const text = reconstructPdfPageText(items);

    expect(text).toMatch(/联系电话[\s\S]*138-0000-0000[\s\S]*工作经历[\s\S]*行政主管/);
    expect(text).not.toContain('联系电话 工作经历');
  });

  it('converts docx html into structured plain text with paragraphs and bullets', () => {
    const html = `
      <h1>张三</h1>
      <p>高级行政经理</p>
      <p>拥有 8 年行政管理经验。</p>
      <h2>工作经历</h2>
      <p>行政主管 | 2023年10月 - 至今</p>
      <p>某某科技有限公司</p>
      <ul>
        <li>负责协调跨部门行政流程优化。</li>
        <li>组织月度预算与采购管理。</li>
      </ul>
    `;

    const text = convertDocxHtmlToText(html);

    expect(text).toContain('张三');
    expect(text).toContain('高级行政经理');
    expect(text).toContain('工作经历');
    expect(text).toContain('- 负责协调跨部门行政流程优化。');
    expect(text).toContain('- 组织月度预算与采购管理。');
  });
});
