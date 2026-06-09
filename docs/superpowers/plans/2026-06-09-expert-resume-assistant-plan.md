# 简历优化助手专家化 (Expert Resume Assistant) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 深度整合 `avoid-ai-writing` 和 `interview-coach-skill` 的核心方法论（去 AI 腔调、STAR/XYZ 成果重构、JD 精准对齐、API JSON Mode 强制规范），提升修改建议与重构的专业度。

**Architecture:**
1. 重构 `src/utils/resumeAssistant.ts` 中的系统提示词构造函数 `getSystemPrompt`，集成“去 AI 腔”词汇表及“四大维度审计打分”改写规则。
2. 优化 `src/utils/resumeAssistant.ts` 里的 OpenAI 兼容端点 API 调用，开启 JSON Mode (`response_format: { type: "json_object" }`) 保证生成稳定性。

**Tech Stack:** Next.js 15, TypeScript, OpenAI/DeepSeek API endpoints.

---

## Chunk 1: 系统提示词重构与 JSON Mode 优化

### Task 1: 整合“去 AI 腔”与“专业审计” System Prompt

**Files:**
- Modify: `src/utils/resumeAssistant.ts`

- [ ] **Step 1: 修改 `getSystemPrompt` 的 `edit` 模式中文和英文系统提示词**
  - 在中文和英文的 `getSystemPrompt` 编辑模式中，显式注入去 AI 腔高危词汇表、STAR/XYZ 改写模板、四大审计评分维度（Substance, Structure, Relevance, Differentiation）和资历对齐说明。
  - 要求修改后的内容杜绝 AI 典型词汇，并使用行为强动词开头。
  - 对于缺失的数据，要求模型留出中括号占位符，严禁胡乱捏造。

- [ ] **Step 2: 优化 `getUserPrompt` 的 `edit` 模式说明**
  - 在 `getUserPrompt` 中，要求模型针对 `reply` 的形状返回简要的修改说明，并包含一条简要的待填量化数据提醒。

- [ ] **Step 3: 对 OpenAI/DeepSeek 兼容端点开启 JSON Mode**
  - 在 `src/utils/resumeAssistant.ts` 的 `sendPromptToProvider` 函数中，对 `openai`、`deepseek` 和 `openrouter` 提供商的 `fetch` 请求体中，在 `temperature: 0.3` 旁加入 `response_format: { type: 'json_object' }`。

- [ ] **Step 4: 运行 Vitest 测试集验证**
  - 运行: `pnpm test`
  - 确认原有的单元测试和响应解析测试依然 100% 通过。

- [ ] **Step 5: 提交**
  - 运行:
    ```bash
    git add src/utils/resumeAssistant.ts docs/superpowers/specs/2026-06-09-expert-resume-assistant-design.md
    git commit -m "feat: integrate anti-ai writing, STAR/XYZ calibration and enable JSON mode"
    ```
