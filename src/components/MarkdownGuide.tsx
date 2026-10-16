import { useState, type RefObject } from 'react';
import { Copy, Check } from 'lucide-react';
import type { AppLanguage } from '@/config/ui';
import { markdownGuideRows, resumeMarkdownExamples } from '@/config/markdownGuide';
import { AnchoredPanel } from './ui/AnchoredPanel';

interface Props {
  lang: AppLanguage;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onUseBlocks: () => void;
}

export function MarkdownGuide({ lang, triggerRef, onClose, onUseBlocks }: Props) {
  const zh = lang === 'zh';
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  async function copyExample() {
    try { await navigator.clipboard.writeText(resumeMarkdownExamples[lang]); setCopyStatus('copied'); }
    catch { setCopyStatus('failed'); }
  }
  return <AnchoredPanel title={zh ? 'Markdown 写法与样式' : 'Markdown guide'} closeLabel={zh ? '关闭' : 'Close'}
    triggerRef={triggerRef} width={520} onClose={onClose}
    footer={<div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={copyExample} className="app-secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm">
        {copyStatus === 'copied' ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        {zh ? '复制完整示例' : 'Copy full example'}
      </button>
      <button type="button" onClick={onUseBlocks} className="app-control min-h-11 rounded-lg px-3 text-sm">{zh ? '改用区块填写' : 'Use block editor'}</button>
      {copyStatus !== 'idle' && <p role="status" className="w-full text-xs text-muted-foreground">{copyStatus === 'copied'
        ? (zh ? '已复制；粘贴由你决定，现有简历未修改。' : 'Copied. Your existing resume has not been changed.')
        : (zh ? '复制失败，可在下方示例中手动选择并复制。' : 'Copy failed. Select and copy the example below manually.')}</p>}
    </div>}>
    <div className="space-y-6 text-sm leading-relaxed">
      <section className="space-y-2">
        <h3 className="font-semibold">{zh ? '第一次写？从这三步开始' : 'Start with three steps'}</h3>
        <ol className="list-decimal space-y-1 ps-5 text-muted-foreground">
          <li>{zh ? '先改顶部的姓名、岗位、联系方式，保留字段名和两行 ---。' : 'Edit your name, role and contacts; keep the field names and both --- lines.'}</li>
          <li>{zh ? '按章节填写经历，用列表写职责与成果。' : 'Fill in each section and use bullet points for responsibilities and results.'}</li>
          <li>{zh ? '查看预览；字号、颜色、页边距到“样式”中调整。' : 'Check Preview. Change fonts, colors and margins in Style Editor.'}</li>
        </ol>
        <p className="text-muted-foreground">{zh ? '不用记语法：区块模式可按字段填写。下面的写法适用于现有四种模板，具体排版随模板变化。' : 'No syntax to memorize: the block editor provides labeled fields. These rules work with all four templates; their layouts differ.'}</p>
      </section>
      <section className="space-y-2">
        <h3 className="font-semibold">{zh ? 'Markdown → 简历效果对照表' : 'Markdown → resume reference'}</h3>
        <table className="w-full table-fixed border-collapse text-start text-xs">
          <thead><tr className="border-b border-[var(--app-border)]"><th scope="col" className="w-[46%] pbe-2 pe-3 font-medium">{zh ? '写法' : 'Syntax'}</th><th scope="col" className="pbe-2 font-medium">{zh ? '显示效果与规则' : 'Result and rules'}</th></tr></thead>
          <tbody>{markdownGuideRows[lang].map(row => <tr key={row.effect} className="border-b border-[var(--app-border)] align-top">
            <td className="py-3 pe-3"><code className="whitespace-pre-wrap break-words font-mono">{row.syntax}</code></td>
            <td className="py-3"><p className="font-medium">{row.effect}</p><p className="mbs-1 text-muted-foreground">{row.note}</p></td>
          </tr>)}</tbody>
        </table>
      </section>
      <section className="space-y-2">
        <h3 className="font-semibold">{zh ? '完整示例' : 'Full example'}</h3>
        <pre className="whitespace-pre-wrap break-words rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-muted)] p-3 text-xs leading-relaxed"><code>{resumeMarkdownExamples[lang]}</code></pre>
      </section>
      <section className="space-y-2 text-muted-foreground">
        <h3 className="font-semibold text-[var(--secondary-foreground)]">{zh ? '容易混淆的地方' : 'Things to keep in mind'}</h3>
        <ul className="list-disc space-y-2 ps-5">
          <li>{zh ? '个人简介放在第一个章节，标题可用“个人简介”或 Summary。工作、教育等其他章节用 ##，单条经历用 ###。' : 'Put Summary first. Use ## for other sections and ### for individual entries.'}</li>
          <li>{zh ? '头像推荐在区块模式上传。[avatar] 是已上传头像的占位符，不是图片地址。' : 'Upload your photo in block mode. [avatar] represents an existing uploaded photo, not an image URL.'}</li>
          <li>{zh ? '“格式整理”会重新识别并生成内容，不只是调整空格；可能调整标题、简介列表和分隔线。结果不合适可撤销。' : 'Format Markdown reinterprets and regenerates content, rather than just adjusting whitespace. It may change headings, summary lists and separators; Undo restores the previous version.'}</li>
          <li>{zh ? '正文标题不要用 # 来代替姓名，也不要依赖 HTML、空行或空格控制字体和分页。先用“样式”面板和模板调整排版。' : 'Do not use # as a replacement for the name field, or HTML, blank lines and spaces to control fonts or pagination. Use Style Editor and templates.'}</li>
        </ul>
      </section>
    </div>
  </AnchoredPanel>;
}
