import { describe, expect, it } from 'vitest';

import { getResumeAssistantRiskWarnings } from '@/utils/resumeAssistantGuard';

describe('getResumeAssistantRiskWarnings', () => {
  it('warns when a proposal drops every work entry or changes personal facts and metrics', () => {
    const original = '---\nname: Candidate\ncontact: original@example.com\n---\n\n## Work experience\n\n### Developer | 2020 - Present\n**Company**\n- Improved reliability.';
    const changed = '---\nname: Changed\ncontact: other@example.com\n---\n\n## Summary\nImproved revenue by 90%.';
    expect(getResumeAssistantRiskWarnings(original, changed)).toEqual(expect.arrayContaining(['resume sections removed', 'personal information changed', 'new numeric claims added']));
  });
  it('flags work experience reordering and date changes', () => {
    const original = `---
name: Jane Doe
title: Product Designer
contact: jane@example.com
---

## WORK EXPERIENCE

### Product Designer | 2021 - 2024
**Acme**
- Shipped

### Senior Designer | 2024 - Present
**Beta Inc**
- Led`;

    const revised = `---
name: Jane Doe
title: Product Designer
contact: jane@example.com
---

## WORK EXPERIENCE

### Senior Designer | 2023 - Present
**Beta Inc**
- Led

### Product Designer | 2021 - 2024
**Acme**
- Shipped`;

    expect(getResumeAssistantRiskWarnings(original, revised)).toEqual([
      'work experience order changed',
      'work experience dates changed',
    ]);
  });
});
