# 殿堂级简历优化与诊断引擎设计方案 (Expert Resume Optimization Engine Design)

本项目旨在深度整合 `avoid-ai-writing`（去 AI 腔/人文化改写）与 `interview-coach-skill`（多维度简历审计、STAR/XYZ 成果重构、JD 关键词匹配、资历校准）的核心优势，对 openResume 的 AI 简历修改助手进行全方位升级。

---

## 1. 深度整合设计原则 (Deep Integration Principles)

### 1.1 从 `avoid-ai-writing` 提取并优化的“去 AI 腔”原则
AI 自动润色的文字往往带有明显的程式化特征（AI-isms）、虚胖浮夸、句式单一。我们将整合以下高精度审计标准：
- **禁用高危 AI 词汇（Tier 1）**：
  - **中文**：致力于、协同作用、画卷/织锦、深入研究、革命性的、生态系统、在前沿领域、以……为证、成功地、积极地、显著地、极大地。
  - **英文**：delve/delve into, tapestry, realm, paradigm, embark, testament to, robust, comprehensive, cutting-edge, leverage (as verb), pivotal, underscores, meticulous, seamless, game-changer, vibrant, thriving, intricacies, holistic, synergy, interplay, boasts, presents, commence.
- **句式结构脱水**：
  - 避免“动名词堆砌”和“系动词逃避”（如 "serves as a hub featuring..." -> "makes..."）。
  - 开头严禁使用被动的“负责……”、“参与……”，必须以强行为动作词开头（如“重构了……”、“主导了……”，英文使用 "Architected", "Refactored", "Halved"）。
  - 杜绝 Uniformity（句式单一排比结构），引入长短句交替，使表达像手写一样自然。
  - 去除空洞的总结性陈述（如“未来的发展前景广阔”、“这充分体现了我的……”）。

### 1.2 从 `interview-coach-skill` 提取并优化的“专业审计与重构”原则
- **多维度能力审计（Resume Audit Rubric）**：
  AI 在修改时，须围绕核心求职竞争力维度审视并优化内容：
  1. **Substance (实质内容与量化度)**：检查经历是否包含“Earned Secrets”（独家秘密/技术细节/特有方案，如“通过 Redis 缓存雪崩治理降低延迟”而非“优化了系统稳定性”）。
  2. **Structure (STAR/XYZ 规范度)**：确保每条经历采用 Google XYZ 公式：“量化结果 (Result/X) + 业务影响 (Impact/Y) + 实施路径 (Action/Z)”。
  3. **Relevance (岗位对齐度)**：当用户提供目标岗位描述 (JD) 时，自动解码 JD（核心职责、关键字频次、隐藏诉求），重构简历时进行**精准关键词对齐 (Keyword Alignment)**。
  4. **Differentiation (差异度)**：剔除模板化的描述，突出求职者的独有商业或技术价值。
- **资历阶梯校准 (Seniority Calibration)**：
  - **Junior（执行级）**：重点优化“高效交付、代码质量、具体功能实现”。
  - **Senior（架构级）**：重点优化“技术选型、系统重构、高并发高可用、带教新人、技术 Ownership”。
  - **Principal/Lead（战略/Impact级）**：重点优化“业务架构演进、跨团队协同、降本增效（如降低 30% 云成本）、技术服务于商业增长”。
- **严禁数据造假**：若原简历缺少量化数据，只重构动作逻辑，在缺失数据处留下 `[具体百分比]%` 或 `[数量]` 占位符。

---

## 2. 技术实现 (Implementation Details)

### 2.1 [resumeAssistant.ts](file:///e:/demo2/myresume/src/utils/resumeAssistant.ts) 中的 Prompt 升级
我们将把上述规则（去 AI 腔词表、STAR/XYZ 规范、JD 对齐、资历校准）深度整合进 `getSystemPrompt` 与 `getUserPrompt` 的 `edit` 模式。
`reply` 仍保持简短回复的形式，重点指出 AI 修改了什么以及提醒用户填写量化数据占位符。

### 2.2 启用 JSON Mode (OpenAI/DeepSeek)
在 [resumeAssistant.ts](file:///e:/demo2/myresume/src/utils/resumeAssistant.ts) 内部向 OpenAI-compatible 接口发起请求时，注入：
`response_format: { type: 'json_object' }`
以确保 JSON 的绝对稳定返回，彻底规避大模型因“话多”导致的格式解析崩溃。
