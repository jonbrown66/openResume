# openResume

本地优先的简历工作台，支持 Markdown 编辑、区块编辑、A4 实时预览、AI 修改助手，以及导出 PDF / Word / HTML。

[中文](./README.md) | [English](./README.en.md)

在线演示：[https://open-resume-dun.vercel.app/](https://open-resume-dun.vercel.app/)

GitHub：[https://github.com/jonbrown66/openResume](https://github.com/jonbrown66/openResume)

![openResume 预览](./.github/assets/openresume.png)

## 功能特性

- Markdown 编辑与区块编辑双模式切换
- 编辑画布与预览画布统一为 A4 尺寸
- 预览支持缩放、模板切换与样式调整
- 支持导入 `md / txt / pdf / docx`
- 无 API Key 时支持本地解析导入
- 支持 AI 对话式修改简历，并展示修改前后差异
- 助手支持项目级会话记忆，默认仅保留最近 20 条记录
- 支持导出 `PDF / DOCX / HTML`
- 支持多简历项目本地管理
- 支持 OpenAI、Anthropic、Gemini、DeepSeek、OpenRouter

## 技术栈

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- Vitest
- `pdfjs-dist`
- `mammoth`
- `docx`
- Puppeteer / Chromium

## 本地开发

推荐使用 `pnpm`：

```bash
pnpm install
pnpm dev
```

也可以使用 `npm`：

```bash
npm install
npm run dev
```

启动后访问：[http://localhost:3000](http://localhost:3000)

## 测试与构建

```bash
pnpm test
pnpm build
pnpm start
```

或：

```bash
npm test
npm run build
npm run start
```

## AI 配置

AI 配置通过应用内设置面板管理，信息保存在浏览器本地存储中。

当前支持：

- OpenAI
- Anthropic
- Gemini
- DeepSeek
- OpenRouter

可配置项包括：

- 当前提供商
- API Key
- Base URL
- 默认模型
- 自定义模型

说明：

- 导入流程会优先尝试 AI 整理，失败时自动回退到本地解析
- 助手支持测试模型连通性
- 未配置 Key 或模型时，会给出明确提示

## 导出说明

- PDF：通过服务端导出链路生成
- Word：通过 `docx` 生成
- HTML：导出当前简历页面 HTML

导出接口位于：

- `app/api/export/pdf`
- `app/api/export/docx`
- `app/api/export/html`

## 项目结构

```text
app/                         Next.js App Router 与导出接口
src/components/              页面、编辑器、预览与助手组件
src/components/assistant/    助手子组件
src/components/settings/     设置面板
src/components/ui/           通用 UI 组件
src/config/                  文案与默认配置
src/config/translations/     中英文文案
src/hooks/                   自定义 hooks
src/lib/                     运行时工具
src/test/                    测试
src/types/                   类型定义
src/utils/                   简历解析、AI、导入导出等工具
```

## 当前定位

`openResume` 不是单纯的 Markdown 转 PDF 工具，而是可持续编辑和迭代的本地简历工作台。当前重点是：

- 让简历内容持续可编辑
- 让预览尽量接近最终导出结果
- 为后续模板系统、主题系统和更强的区块编辑能力预留清晰边界

## 注意事项

- 首次 PDF 导出可能稍慢，因为浏览器相关依赖需要初始化
- 扫描版 PDF 仍可能存在文本提取受限的问题
- 助手对简历修改默认先生成候选稿，只有手动点击应用才会写回
