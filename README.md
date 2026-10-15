<div align="center">
  <img src="./.github/assets/openresume.png" alt="openResume 演示图" width="100%" style="border-radius: 12px; margin-bottom: 20px;" />
  
  # openResume

  **本地优先的开源 AI 简历生成器与 Markdown 简历编辑器** 🚀

  A4 实时排版 | 行级分页 | 本地文件解析 | Markdown / 区块编辑 | 本地优先
  
  [![GitHub License](https://img.shields.io/github/license/jonbrown66/openResume?color=a9d56b&style=flat-square)](https://github.com/jonbrown66/openResume/blob/main/LICENSE)
  [![CI](https://img.shields.io/github/actions/workflow/status/jonbrown66/openResume/ci.yml?branch=main&label=CI&style=flat-square)](https://github.com/jonbrown66/openResume/actions/workflows/ci.yml)
  [![Next.js Version](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
  [![React Version](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev)
  [![TailwindCSS Version](https://img.shields.io/badge/TailwindCSS-4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
  [![Unit Tests](https://img.shields.io/badge/Tests-Vitest%20%2B%20Playwright-a9d56b?style=flat-square&logo=vitest)](https://vitest.dev)
  
  [中文](./README.md) | [English](./README.en.md)
  
  🎯 [**在线演示 (Demo)**](https://open-resume-dun.vercel.app/) | 💻 [**GitHub 仓库**](https://github.com/jonbrown66/openResume)
</div>

---

`openResume` 是一个开源 AI 简历生成器、Markdown 简历编辑器和本地优先的简历工作台。它支持 A4 实时预览、PDF / DOCX / HTML 导出、Markdown / TXT / PDF / DOCX 导入，以及 OpenAI、Anthropic Claude、Google Gemini、DeepSeek、OpenRouter 等模型辅助优化简历。

适合需要可长期维护简历内容、精确控制导出排版、保护隐私数据，并希望用 AI 快速迭代求职材料的开发者、设计师、产品经理和求职者。

---

## 🌟 为什么选择 openResume？

市面上多数简历生成器，要么存在**跨页文字被横向裁剪切断**的物理缺陷，要么强行依赖昂贵的第三方云端解析 API，要么无法完美控制 A4 排版的空白边距。

`openResume` 针对这些开源痛点进行了底层设计突破：
*   🎨 **终极物理零边距**：配合 `@page { margin: 0 }`，底色完美铺满 A4 页面，彻底告别难看的白色外边框。
*   ✂️ **等高占位物理剪枝**：保留各页对应的内容，合并页外占位节点，减少长简历的重复文字和 DOM。
*   📏 **行级不安全区间避让（防切断）**：通过 `getClientRects()` 精确测量每一行文字的物理高度，分页时自动避开文字中线及列表小圆点，在文字行、标题、图片和表格行之间选择分页断点；超出单页高度的元素仍需调整。
*   🔒 **本地优先**：编辑和文件解析在浏览器中完成。HTML 导出在本地生成；PDF / DOCX 导出将内容发送到应用服务器；启用 AI 时内容直接发送到配置的模型服务商。
*   🤖 **对话式 AI 简历优化**：支持 OpenAI, Anthropic, Gemini, DeepSeek 等模型，提供项目级会话记忆，一键展示简历修改前后差异。

---

## ⚡ 功能特性

- **双编辑模式**：支持 Markdown 源码编辑与可视化区块编辑双向无缝切换。
- **A4 实时排版**：预览按 A4 尺寸分页，支持实时缩放、模板切换。
- **精美字体库**：本地打包 Geist；其他字体使用系统安装字体与回退字体，不在首屏加载远程字体。
- **多格式导入**：支持导入 `md / txt / pdf / docx` 简历。
- **零配置本地解析**：无 API Key 时支持纯前端分析并提取简历信息。
- **差异化对比**：AI 简历助手提供详细的 Diff 对比视窗，一键应用修改。
- **多格式导出**：支持 `PDF / DOCX / HTML`；PDF 保留分页，DOCX 使用原生可编辑排版，复杂自定义 CSS 不会转换为 Word 样式。
- **多简历项目**：支持本地多份简历项目的快速切换与管理，优化移动端手势与自适应体验。
- **连通性测试**：支持大模型 API Base URL 自定义以及一键连通性测试。

---

## 🛠️ 技术栈

- **前端框架**：Next.js 15 (App Router) + React 19 + TypeScript
- **样式方案**：Tailwind CSS v4 + Vanilla CSS + Framer Motion (动画)
- **测试框架**：Vitest
- **解析与导出**：
  - `pdfjs-dist` (PDF 解析)
  - `mammoth` (Word 导入)
  - `docx` (Word 生成)
- Playwright / Chromium (PDF 导出服务端渲染)

---

## 🚀 快速开始

### 本地开发

推荐使用 `pnpm`：

```bash
# 安装依赖
pnpm install

# 启动开发服务
pnpm dev
```

或者使用 `npm`：

```bash
npm install
npm run dev
```

启动后在浏览器中打开：[http://localhost:3000](http://localhost:3000)

### 测试与构建

```bash
# 运行单元和组件测试
pnpm test

# 生产环境构建
pnpm build
pnpm start
```

---

## 🤖 AI 配置指南

AI 简历助手配置完全通过应用内的设置面板管理，API Key 以明文保存在当前浏览器的 LocalStorage 中，仅适合可信设备和浏览器环境。AI 请求直接发送到你配置的模型服务商；自定义 API 地址时请确认其可信性。

当前支持大模型提供商：
- **OpenAI** (ChatGPT)
- **Anthropic** (Claude)
- **Google Gemini**
- **DeepSeek** (深求)
- **OpenRouter** (主流聚合)

*注：导入流程会优先尝试 AI 自动提取整理，若未配置或 API 失败，将无缝自动回退到本地解析器执行。*

---

## 📂 项目结构

```text
app/                         Next.js App Router 与 API 导出接口
src/components/              页面、编辑器、预览与助手主组件
src/components/assistant/    AI 助手对话及 Diff 比对组件
src/components/settings/     大模型连通性设置与主题参数面板
src/components/ui/           系统通用基础 UI 组件
src/config/                  多语言文案与默认配置
src/hooks/                   应用状态、历史记录与设置等自定义 Hooks
src/lib/                     Playwright 导出、请求校验与 DOCX 转换
src/test/                    单元测试与集成测试
src/types/                   TypeScript 类型声明
src/utils/                   简历提取、AI 差异计算、导出生成等工具函数
```

---

## 📝 贡献与反馈

`openResume` 致力于成为体验最好的、可自由编辑和迭代的个人本地简历工作台。
如果您在使用过程中有任何建议或发现了 Bug，欢迎提交 Issue 或 Pull Request！

*   **PDF 导出提示**：首次 PDF 导出可能稍慢，因为无头浏览器相关二进制文件在后台需要初始化。
*   **扫描版 PDF**：对于非文本型的扫描版 PDF，文本提取功能可能会受限于 OCR 识别。
*   **候选修改机制**：AI 助手对简历内容的修改默认会先生成高亮候选稿，只有当您手动点击“应用修改”后才会写入实际文档。


## 验证与数据边界

- `pnpm lint`：ESLint；`pnpm typecheck`：TypeScript。
- `pnpm test`：单元、组件与服务端资源管理回归测试。
- `pnpm test:e2e`：先构建，再运行 Playwright 桌面与移动视口测试。首次运行可执行 `pnpm exec playwright install chromium`；Windows 也可使用已安装 Chrome/Edge，或设置 `PLAYWRIGHT_EXECUTABLE_PATH`。
- E2E 使用独立浏览器上下文、虚构简历和模拟 AI 响应，不调用付费模型。失败时生成截图、trace 和 HTML 报告，CI 会上传诊断附件。
- 依赖策略要求安装包满足发布时间限制；不要为刚发布的测试工具放宽该策略。
- 开发服务使用 `.next-dev`，生产构建使用 `.next`，避免构建覆盖正在运行的开发页面。已运行 `pnpm dev` 时，可用 `pnpm exec playwright test --config=playwright.dev.config.ts` 验证 `http://localhost:3000`；用例会检测运行时与 hydration 错误。
- PDF / DOCX 导出需要应用服务器；PDF 需要 Chromium。首次云端导出可能需要下载二进制文件。导出浏览器禁用脚本并阻断网络请求，图片和网页字体由客户端嵌入。
- Markdown 文件导入保留原文；其他文件启用 AI 时尝试格式整理，失败后回退本地解析。扫描 PDF 需要先 OCR。空提取不会覆盖原稿。
- 浏览器存储失败时会提示尚未保存；损坏数据保留在 `resume_projects-recovery-*` 中。清理浏览器存储之前请自行导出备份。
