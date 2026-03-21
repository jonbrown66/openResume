# Resume Studio

一个本地运行的简历工作台，支持：

- **Markdown 编辑** - 实时编辑和预览
- **区块编辑** - 可视化表单编辑简历区块
- **多模板 A4 预览** - Classic / Minimal / Standard / Sidebar
- **PDF 导出** - 服务端 Puppeteer 渲染导出
- **多格式导入** - 支持 `md / txt / pdf / docx`
- **AI 整理** - 支持 Gemini / OpenAI / Claude / DeepSeek / xAI 多引擎

## 本地运行

1. 安装依赖

```bash
pnpm install
```

2. 配置 AI 引擎（可选）

在 `.env.local` 中配置 API Key：

```bash
# AI 引擎配置
VITE_ACTIVE_PROVIDER=gemini
VITE_GEMINI_API_KEY=your_key_here
# 或
VITE_OPENAI_API_KEY=your_key_here
VITE_ANTHROPIC_API_KEY=your_key_here
VITE_DEEPSEEK_API_KEY=your_key_here
VITE_XAI_API_KEY=your_key_here
```

3. 启动开发环境

```bash
pnpm dev
```

## 测试与构建

```bash
# 运行测试
pnpm test

# 类型检查
pnpm tsc

# 生产构建
pnpm build

# 启动生产服务
pnpm start
```

## 导入说明

- 配置了 API Key：导入文件后 AI 自动整理成标准简历 Markdown
- 未配置 API Key：保留原始文本，方便手动编辑

## 技术栈

- **框架**: Next.js 15 + React 19
- **样式**: Tailwind CSS 4
- **动画**: Framer Motion
- **PDF**: Puppeteer
- **测试**: Vitest
