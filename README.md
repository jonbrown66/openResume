# openResume

一个本地优先的简历工作台，支持 Markdown 编辑、区块编辑、A4 实时预览，以及导出 PDF / Word / HTML。

仓库地址：
[https://github.com/jonbrown66/openResume](https://github.com/jonbrown66/openResume)

## 功能特性

- Markdown 编辑与区块编辑双模式切换
- 编辑画布与预览画布统一为 A4 尺寸
- 预览支持缩放、模板切换和导出
- 支持导入 `md / txt / pdf / docx`
- 支持 AI 整理导入内容
- 支持导出 `PDF / DOCX / HTML`
- 支持主题、配色和样式设置
- 支持本地简历项目管理

## 技术栈

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- Vitest
- Puppeteer / Chromium
- `pdfjs-dist` / `mammoth`

## 本地开发

推荐使用 `pnpm`：

```bash
pnpm install
pnpm dev
```

如果你使用 `npm` 也可以：

```bash
npm install
npm run dev
```

启动后访问：

[http://localhost:3000](http://localhost:3000)

## 构建与测试

```bash
pnpm test
pnpm build
pnpm start
```

如果你使用 `npm`：

```bash
npm test
npm run build
npm run start
```

## AI 配置

当前版本的 AI 设置主要通过应用内设置面板维护，配置会保存在本地浏览器存储中。

支持的供应商包括：

- OpenAI
- Anthropic
- Gemini
- DeepSeek
- OpenRouter

你可以在应用右上角的设置面板中配置：

- 当前供应商
- API Key
- Base URL
- 模型名称

`.env.example` 目前只保留了一个最小示例，主要用于历史兼容和本地扩展，不是当前唯一配置入口。

## 导出说明

- PDF：通过服务端渲染导出
- Word：通过 `docx` 生成
- HTML：导出当前简历页面 HTML

导出接口位于：

- `app/api/export/pdf`
- `app/api/export/docx`
- `app/api/export/html`

## 目录结构

```text
app/                    Next.js App Router 入口与导出接口
src/components/         页面与编辑器组件
src/components/settings 设置面板
src/components/ui/      通用 UI 组件
src/config/             文案与设置默认值
src/contexts/           全局上下文
src/hooks/              自定义 hooks
src/lib/                运行时工具
src/test/               组件与工具测试
src/types/              类型定义
src/utils/              简历解析、AI 整理、导出等工具
docs/plans/             设计与计划文档
```

## 当前定位

这个项目目前更偏向“本地简历工作台”，而不只是一个 Markdown 转 PDF 工具。核心目标是：

- 让简历内容可持续编辑
- 让排版预览尽量接近最终导出结果
- 为后续主题系统、模板系统和项目管理继续扩展留出空间

## 注意事项

- 首次启动导出 PDF 时，相关依赖初始化可能稍慢
- 如果没有配置 AI Key，导入仍可使用，但不会自动整理内容
- 当前仓库包含 Next.js 服务端导出能力，因此不再是纯静态前端项目
