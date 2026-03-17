import type { AppLanguage } from '../config/ui';
import type { AppSettings } from '../config/settings';

export async function aiFormatResume(
  rawText: string,
  lang: AppLanguage,
  settings: AppSettings
): Promise<string> {
  const provider = settings.providers[settings.activeProvider];
  
  if (!provider.apiKey) {
    throw new Error('missing-api-key');
  }

  if (provider.id === 'gemini') {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: provider.apiKey });
    
    const prompt = getFormatPrompt(lang, rawText);
    const response = await ai.models.generateContent({
      model: provider.model || 'gemini-1.5-flash',
      contents: prompt,
    });

    return cleanMarkdown(response.text || '');
  } 
  
  if (provider.id === 'openai') {
    const prompt = getFormatPrompt(lang, rawText);
    const response = await fetch(`${provider.baseUrl || 'https://api.openai.com/v1'}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model || 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an expert resume formatter.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API Error');
    }

    const data = await response.json();
    return cleanMarkdown(data.choices[0]?.message?.content || '');
  }

  throw new Error('Unsupported provider');
}

function getFormatPrompt(lang: AppLanguage, rawText: string) {
  return `
Your task is to convert the following raw resume text into a specific Markdown format.
The required Markdown format MUST follow this structure exactly:

---
name: [Full Name]
title: [Professional Title]
contact: [Phone] | [Email] | [Location/Links]
---

## ${lang === 'zh' ? '个人简介' : 'PROFESSIONAL SUMMARY'}
[A brief professional summary paragraph]

## WORK EXPERIENCE
### [Job Title] | [Start Date] - [End Date]
**[Company Name]**
- [Responsibility 1]

## EDUCATION
### [Degree] | [Start Date] - [End Date]
**[School]**

## SKILLS
- [Skill 1]

Rules:
1. Put name, title, contact in YAML frontmatter.
2. Use exactly '---' for frontmatter boundaries.
3. Output the result in ${lang === 'en' ? 'English' : 'Chinese'}.
4. Do not include markdown code fences in your response.

Here is the raw resume text:
${rawText}
`;
}

function cleanMarkdown(text: string) {
  return text
    .replace(/^```markdown\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}
