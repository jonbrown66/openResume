import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const AssistantReply = memo(function AssistantReply({ content }: { content: string }) {
  return <div className="min-w-0 [overflow-wrap:anywhere] [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_h1]:mbs-4 [&_h1]:mbe-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mbs-4 [&_h2]:mbe-2 [&_h2]:font-semibold [&_h3]:mbs-3 [&_h3]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:ps-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:ps-5 [&_li]:my-1 [&_blockquote]:border-s-2 [&_blockquote]:border-[var(--app-border)] [&_blockquote]:ps-3 [&_blockquote]:text-[var(--muted-foreground)] [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-[var(--app-surface)] [&_pre]:p-3 [&_code]:text-xs [&_th]:border [&_th]:border-[var(--app-border)] [&_th]:p-2 [&_th]:text-start [&_td]:border [&_td]:border-[var(--app-border)] [&_td]:p-2">
    <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{
      img: () => null,
      a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline decoration-[var(--app-accent)] underline-offset-2 active:opacity-70">{children}</a>,
      table: ({ children }) => <div className="my-3 max-w-full overflow-x-auto overscroll-x-contain"><table className="w-full border-collapse text-xs leading-5">{children}</table></div>,
    }}>{content}</ReactMarkdown>
  </div>;
});
