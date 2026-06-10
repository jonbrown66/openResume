<div align="center">
  <img src="https://raw.githubusercontent.com/jonbrown66/openResume/main/.github/assets/openresume.png" alt="openResume Logo" width="100%" style="border-radius: 12px; margin-bottom: 20px;" />
  
  # openResume

  **本地优先的开源 AI 智能 Markdown 简历工作台** 🚀

  A4 实时排版 | 像素级防切断 | 零配置本地解析 | 双模式无缝编辑 | 100% 隐私安全
  
  [![GitHub License](https://img.shields.io/github/license/jonbrown66/openResume?color=a9d56b&style=flat-square)](https://github.com/jonbrown66/openResume/blob/main/LICENSE)
  [![Next.js Version](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
  [![React Version](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev)
  [![TailwindCSS Version](https://img.shields.io/badge/TailwindCSS-4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
  [![Unit Tests](https://img.shields.io/badge/Tests-101%20Passed-a9d56b?style=flat-square&logo=vitest)](https://vitest.dev)
  
  [中文](./README.md) | [English](./README.en.md)
  
  🎯 [**在线演示 (Demo)**](https://open-resume-dun.vercel.app/) | 💻 [**GitHub 仓库**](https://github.com/jonbrown66/openResume)
</div>

---

## 🌟 为什么选择 openResume？

市面上多数简历生成器，要么存在**跨页文字被横向裁剪切断**的物理缺陷，要么强行依赖昂贵的第三方云端解析 API，要么无法完美控制 A4 排版的空白边距。

`openResume` 针对这些开源痛点进行了底层设计突破：
*   🎨 **终极物理零边距**：配合 `@page { margin: 0 }`，底色完美铺满 A4 页面，彻底告别难看的白色外边框。
*   ✂️ **等高占位物理剪枝**：深克隆 DOM 并剔除各页卡片外部的隐藏冗余图层，PDF 导出体积减少数倍，在任何 PDF 阅读器中预览、滚动都 100% 极其流畅。
*   📏 **行级不安全区间避让（防切断）**：通过 `getClientRects()` 精确测量每一行文字的物理高度，分页时自动避开文字中线及列表小圆点，实现两行字之间的**像素级无缝完美分页**。
*   🔒 **本地优先与 100% 隐私**：无需联网上传，在没有 AI API Key 时可使用本地纯客户端解析导入，数据完全保存在浏览器本地，隐私绝对安全。
*   🤖 **对话式 AI 简历优化**：支持 OpenAI, Anthropic, Gemini, DeepSeek 等模型，提供项目级会话记忆，一键展示简历修改前后差异。

---

## ⚡ 功能特性

- **双编辑模式**：支持 Markdown 源码编辑与可视化区块编辑双向无缝切换。
- **A4 实时排版**：编辑画布与预览画布统一为 A4 尺寸，支持实时缩放、模板切换。
- **精美字体库**：内置 Geist, Fira Mono, 源泉圓體, 全字庫正宋體, 全字庫正楷體等，支持系统字体 Fallback。
- **多格式导入**：支持导入 `md / txt / pdf / docx` 简历。
- **零配置本地解析**：无 API Key 时支持纯前端分析并提取简历信息。
- **差异化对比**：AI 简历助手提供详细的 Diff 对比视窗，一键应用修改。
- **多格式导出**：支持导出完美排版的 `PDF / DOCX / HTML`。
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
  - Puppeteer / Chromium (PDF 导出服务端渲染)

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
# 运行单元测试 (101 个用例)
pnpm test

# 生产环境构建
pnpm build
pnpm start
```

---

## 🤖 AI 配置指南

AI 简历助手配置完全通过应用内的设置面板管理，信息安全加密保存在浏览器本地存储（LocalStorage）中，不会上传到任何第三方中转站。

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
src/lib/                     Puppeteer 与 PDF 解析运行类
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
