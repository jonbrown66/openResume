# Resume Studio

一个本地运行的简历工作台，支持：

- Markdown 编辑
- 多模板 A4 预览
- 浏览器打印导出 PDF
- 导入 `md / txt / pdf / docx`
- 可选 Gemini 整理导入内容

## 本地运行

1. 安装依赖

```bash
npm install
```

2. 可选：在 `.env.local` 中配置 Gemini Key

```bash
VITE_GEMINI_API_KEY=your_key_here
```

3. 启动开发环境

```bash
npm run dev
```

## 测试与构建

```bash
npm test
npx tsc --noEmit
npm run build
```

## 导入说明

- 配置了 `VITE_GEMINI_API_KEY`：导入文本后会尝试自动整理成标准简历 Markdown。
- 未配置 `VITE_GEMINI_API_KEY`：仍可导入文件，但会保留原始文本，方便手动编辑。

## 当前阶段边界

- 第一阶段仍以 Markdown 编辑为主
- 已建立结构化 `ResumeDraft` 数据层，为后续区块编辑做准备
- PDF 导出使用浏览器打印链路，不再走截图生成
