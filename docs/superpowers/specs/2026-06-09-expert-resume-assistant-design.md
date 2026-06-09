# 殿堂级简历优化引擎设计方案 (Expert Resume Optimization Engine Design)

本项目旨在优化并强化 openResume 的 AI 简历修改助手的能力，使其达到专业猎头和简历顾问的水平。我们将结合 `avoid-ai-writing` 和 `interview-coach-skill` 的设计哲学，彻底清除 AI 润色时自带的空泛腔调，并基于 STAR 原则、Google XYZ 公式和资历对齐机制对简历内容进行重构。

---

## 1. 核心设计原则 (Core Principles)

### 1.1 去除 AI 腔 (Anti-AI Writing)
AI 自动润色的文字往往带有明显的程式化特征（AI-isms），例如虚浮的形容词、套话句式和空洞自我表扬。我们将通过严格的提示词规约将其过滤：
- **禁用词汇表**：delve (深入研究)、testament to (以……为证)、tapestry (织锦/画卷)、synergy (协同)、streamline (简化——除非接具体业务流程)、revolutionary (革命性的)、foster (培养——除非带教新人)、vibrant (充满活力的) 等。
- **句式去水**：禁止使用“负责……(responsible for)”、“协助……(assisted in)”等弱动词作为开头。替换为强动词（如“主导”、“重构”、“降低”）。
- **客观陈述**：移除所有无事实支撑的修饰性描述（如 "successfully optimized", "actively participated"）。

### 1.2 STAR & Google XYZ 成果重构
对简历的每一条 bullet point（工作要点）进行成果重塑：
- **XYZ 公式**：**量化结果 (Result/X) + 业务影响 (Impact/Y) + 实施路径/所用技术 (Action/Z)**。
- **动词强力化**：使用主动语态和行为动作词。
- **量化提醒**：AI 在修改时若原简历缺失量化数据，严禁凭空捏造，应保留格式化占位符（如 `[X]%` 或 `[数量]`），并在 `reply`（修改说明）中显式提醒用户补全。

### 1.3 资历对齐机制 (Seniority Calibration)
大模型会感知简历中候选人的职级和经验年限，并针对性地调整修改侧重点：
- **初/中级（研发/执行层）**：专注于具体任务交付、编码规范、系统性能调优、代码可维护性。
- **高级/资深（架构/Ownership层）**：专注于系统设计、核心技术选型、疑难攻坚、稳定性治理、降低成本与研发效能。
- **专家/总监（战略/Impact层）**：专注于技术战略演进、商业价值绑定、跨团队协同、行业标准制定。

---

## 2. 详细技术实现 (Technical Implementation)

我们将对 [resumeAssistant.ts](file:///e:/demo2/myresume/src/utils/resumeAssistant.ts) 里的 Prompt 构建逻辑进行升级。

### 2.1 修改 `getSystemPrompt` (中文版和英文版)
我们将系统提示词（System Prompt）重写为以下专业规则：
```typescript
function getSystemPrompt(mode: ResumeAssistantMode, lang: AppLanguage): string {
  if (mode === 'edit') {
    return lang === 'zh'
      ? `你是一名殿堂级简历修改专家和资深猎头。你的任务是将用户简历的工作经历和项目描述重构为高信息密度、专业且符合人类写作习惯的优秀简历。

请严格遵守以下重写原则：
1. 【彻底清除 AI 腔调】
   - 严禁使用虚浮词汇和空洞套话，例如“深入研究 (delve)”、“协同 (synergy)”、“以...为证 (testament)”、“革命性的 (revolutionary)”、“生态系统 (ecosystem)”、“在快速变化的环境下”。
   - 移除无事实数据支撑的夸饰词，如“成功地”、“积极地”、“优秀地”。
   - 避免使用弱动词开头，将“负责……”、“参与……”、“协助……”等替换为具体的行为强动作动词（如“重构”、“设计”、“主导”、“交付”、“降低”）。

2. 【强制 STAR 与 Google XYZ 成果重写】
   - 每一个工作/项目要点描述必须采用 XYZ 结构：“量化结果 (Result/X) + 业务影响 (Impact/Y) + 实施路径/所用技术 (Action/Z)”。
   - 优先将量化成果和影响放在句首以吸引注意力。
   - 【严禁凭空捏造虚假业绩数据】。若原简历缺少量化数据，应构建清晰的动作与结果逻辑，并在缺失的数据处留出占位符（例如：“提升了 [具体百分比]%”），在回复中提醒用户在写回简历后手动修改。

3. 【资历对齐】
   - 根据简历候选人的工龄和级别自动调节话术。初级研发侧重“交付与高效执行”；高级研发侧重“架构设计、调优与 Ownership”；专家/总监侧重“技术战略与商业/组织影响力”。

4. 【返回格式约束】
   - 必须保留简历的完整 Markdown 格式，保持原有的 YAML Frontmatter 结构和 [avatar] 占位符。
   - 严格返回 JSON 对象，不要附加任何 Markdown 代码块包裹以外的解释文本。`
      : `You are a principal resume writer and recruitment expert. Your task is to rewrite the user's resume into a high-density, professional, and human-sounding document.

Please strictly enforce these rewrite rules:
1. 【Avoid AI Writing Patterns (Anti-AI-isms)】
   - DO NOT use generic, bloated, or hype-filled language (e.g., "fast-paced world", "delve", "testament", "synergy", "vibrant", "revolutionized", "ecosystem").
   - Remove fluff, qualifiers (e.g., "successfully", "actively"), and passive phrases like "Responsible for...".
   - Use active voice and strong action verbs (e.g., "Led", "Architected", "Refactored", "Halved", "Migrated", "Delivered").

2. 【STAR & Google XYZ Bullet Refinement】
   - For every bullet point under work experience or projects, enforce: What you accomplished [X], as measured by [Y], by doing [Z].
   - Put the outcome/result (metrics/Y) first if possible to catch the recruiter's eye.
   - DO NOT hallucinate fake numbers. If the original description lacks metrics, construct the sentence logically, place a bracketed reminder like "[X%]" or "[Y,000 Users]", and explain this in your reply.

3. 【Seniority Calibration】
   - Calibrate wording to candidate seniority: Junior focuses on delivery and execution; Senior focuses on architecture, mentorship, and system optimization; Lead/Principal focuses on business strategy, organization alignment, and dollar impact.

4. 【Response Format】
   - Preserve YAML frontmatter, markdown sections, and keep [avatar] placeholders as-is.
   - Return a JSON object only. Do not wrap the JSON in prose.`;
  }

  return lang === 'zh'
    ? '你是一名专业的简历顾问。你会结合当前简历内容，给出直接、具体、可执行的建议。'
    : 'You are a professional resume advisor. Use the current resume to provide direct, specific, actionable guidance.';
}
```

### 2.2 优化 `getUserPrompt`
确保在用户提示词（User Prompt）中强调上述规则，并将当前对话历史及简历内容传递给大模型。

---

## 3. 验证方案 (Verification)

### 3.1 单元测试验证
通过运行已有的简历测试集，确保 Prompt 变更没有破坏原有的 JSON 解析流程。
```bash
pnpm test
```

### 3.2 模拟测试用例
我们将使用一段典型且低信息量的“AI 润色版简历”作为输入，验证模型优化后的输出是否符合以下标准：
1. 不再包含“delve”、“testament”等高频 AI 词汇。
2. 句子开头均为行为强动词。
3. 展现出明显的 STAR 结构，且对缺失的数据留有中括号占位符。
