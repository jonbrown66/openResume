# openResume

A local-first resume workspace with Markdown editing, block editing, real-time A4 preview, and export to PDF, Word, and HTML.

Repository:
[https://github.com/jonbrown66/openResume](https://github.com/jonbrown66/openResume)

## Features

- Dual editing modes: Markdown and block editor
- Unified A4-sized canvas for both editor and preview
- Zoomable preview with template switching
- Import support for `md / txt / pdf / docx`
- AI-assisted resume formatting for imported content
- Export to `PDF / DOCX / HTML`
- Theme, color, and appearance settings
- Local resume project management

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- Vitest
- Puppeteer / Chromium
- `pdfjs-dist` / `mammoth`

## Local Development

Recommended with `pnpm`:

```bash
pnpm install
pnpm dev
```

You can also use `npm`:

```bash
npm install
npm run dev
```

Open:

[http://localhost:3000](http://localhost:3000)

## Build and Test

```bash
pnpm test
pnpm build
pnpm start
```

Or with `npm`:

```bash
npm test
npm run build
npm run start
```

## AI Configuration

The current version mainly manages AI settings through the in-app settings panel. Configuration is stored in local browser storage.

Supported providers:

- OpenAI
- Anthropic
- Gemini
- DeepSeek
- OpenRouter

You can configure the following in the settings panel:

- Active provider
- API key
- Base URL
- Model name

`.env.example` is kept as a minimal example for compatibility and local extension, but it is not the primary configuration entry point for the current app.

## Export

- PDF: rendered and exported through the server-side export pipeline
- Word: generated with `docx`
- HTML: exports the current resume page as HTML

Export endpoints:

- `app/api/export/pdf`
- `app/api/export/docx`
- `app/api/export/html`

## Project Structure

```text
app/                    Next.js App Router entry and export APIs
src/components/         editor and page components
src/components/settings settings panels
src/components/ui/      shared UI components
src/config/             UI copy and default settings
src/contexts/           global contexts
src/hooks/              custom hooks
src/lib/                runtime utilities
src/test/               component and utility tests
src/types/              type definitions
src/utils/              resume parsing, AI formatting, export utilities
docs/plans/             design and planning documents
```

## Current Direction

This project is positioned as a local resume workspace rather than only a Markdown-to-PDF utility. The current goals are:

- keep resume content editable over time
- keep preview output as close as possible to final export output
- leave room for future theme, template, and project-management expansion

## Notes

- The first PDF export can be slightly slower while related dependencies initialize
- Import still works without an AI key, but imported content will not be auto-formatted
- This repository now includes Next.js server-side export capabilities, so it is no longer a purely static frontend app
