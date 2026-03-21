import { describe, expect, it } from 'vitest';

import { getResumeAssistantRiskWarnings } from '@/utils/resumeAssistantGuard';

describe('getResumeAssistantRiskWarnings', () => {
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
