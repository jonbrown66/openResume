export type AssistantTask = 'review' | 'polish' | 'match' | 'interview';

export function getAssistantTasks(lang: 'zh' | 'en') {
  return lang === 'zh' ? [
    { id: 'review', label: '诊断简历', prompt: '请诊断当前简历，按优先级列出最值得改进的三处，引用原文说明原因，并提出需要我补充的问题。先提供建议，不修改简历。' },
    { id: 'polish', label: '润色经历', prompt: '请润色当前简历的工作和项目经历，保留真实职责、数据、时间和结构。缺少的信息单独向我提问，先生成候选稿供我确认。' },
    { id: 'match', label: '匹配岗位', prompt: '请结合目标岗位描述分析当前简历，分别列出有证据支持的匹配点、缺口和修改建议。尚未提供岗位描述时先向我询问，不编造匹配评分，不修改简历。' },
    { id: 'interview', label: '面试准备', prompt: '请根据当前简历设计五个有针对性的面试追问，说明每题考察点及我应准备的经历证据，不替我编造回答。' },
  ] as const : [
    { id: 'review', label: 'Review resume', prompt: 'Review this resume. Prioritize the three most useful improvements, quote the relevant text, explain why, and ask for missing evidence. Give advice without rewriting.' },
    { id: 'polish', label: 'Polish experience', prompt: 'Polish the work and project experience in this resume. Preserve actual responsibilities, facts, dates and structure. Ask about missing evidence separately and provide a candidate revision for review.' },
    { id: 'match', label: 'Match a role', prompt: 'Compare this resume with the target job description. Separate evidenced matches, gaps and actionable suggestions. Ask for the job description if missing. Do not invent a matching score or rewrite the resume.' },
    { id: 'interview', label: 'Prepare interview', prompt: 'Prepare five interview follow-up questions based on this resume. Explain what each question tests and which evidence I should prepare. Do not fabricate answers.' },
  ] as const;
}

/** Consultation stays advisory; only explicit rewrite requests produce candidates. */
export function resolveAssistantMode(input: string): 'chat' | 'edit' {
  if (/^(?:请问|为什么|怎么|如何|有什么|是否|能否先|优化建议|what\b|why\b|how\b|should\b)|(?:先|只)(?:提供|给|做)?(?:建议|诊断|分析)|(?:不|不要)(?:直接)?(?:修改|改写)|without rewriting|do not.*(?:rewrite|edit)|(?:give|offer|make|provide)\s+(?:me\s+)?(?:suggestions|advice|feedback)/i.test(input.trim())) return 'chat';
  return /润色|重写|改写|修改|精简|压缩|替换|^(?:请)?(?:帮我)?优化|按.{0,30}(?:优化|修改)|\b(?:rewrite|revise|polish|edit|apply|shorten|tighten|refine|improve|optimize|make|update)\b/i.test(input) ? 'edit' : 'chat';
}
