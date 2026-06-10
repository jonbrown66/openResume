import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "openResume - 本地优先的 AI 智能 Markdown 简历工作台",
  description: "openResume 是一个本地优先的开源简历工作台，支持 Markdown 编辑、可视化区块编辑、A4 实时预览、本地 AI 简历优化助手，以及无损 PDF / Word / HTML 导出。100% 隐私安全，支持 OpenAI、Anthropic、Gemini、DeepSeek 等主流大模型。",
  keywords: [
    "简历", "简历模板", "简历生成器", "Markdown简历", "AI简历", "写简历", "开源简历", "Next.js", "React", "TailwindCSS", "DeepSeek", "openResume", "resume builder", "markdown resume", "ai resume assistant"
  ],
  authors: [{ name: "jonbrown66", url: "https://github.com/jonbrown66" }],
  openGraph: {
    title: "openResume - 本地优先的 AI 智能 Markdown 简历工作台",
    description: "本地优先的开源简历工作台，支持 Markdown 编辑、A4 实时预览、AI 简历优化助手，以及无损 PDF / Word 导出。100% 隐私安全，支持 DeepSeek 等大模型。",
    url: "https://github.com/jonbrown66/openResume",
    siteName: "openResume",
    images: [
      {
        url: "https://raw.githubusercontent.com/jonbrown66/openResume/main/.github/assets/openresume.png",
        width: 1200,
        height: 630,
        alt: "openResume 预览",
      },
    ],
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "openResume - 本地优先的 AI 智能 Markdown 简历工作台",
    description: "支持 Markdown 编辑、A4 实时预览、AI 简历助手与无损 PDF 导出的开源简历工作台。",
    images: ["https://raw.githubusercontent.com/jonbrown66/openResume/main/.github/assets/openresume.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
