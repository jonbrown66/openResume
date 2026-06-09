import { describe, it, expect } from 'vitest';
import { sanitizeMarkdownForDisplay, restoreAvatarFromDisplay } from '@/utils/markdownDisplay';

describe('markdownDisplay', () => {
  const base64Data = 'data:image/png;base64,iVBORw0KGgoAAAASDFASF';

  describe('sanitizeMarkdownForDisplay', () => {
    it('should sanitize unquoted base64 image in image field', () => {
      const markdown = `---
name: Demo
image: ${base64Data}
---
## Experience`;
      expect(sanitizeMarkdownForDisplay(markdown)).toContain('image: [avatar]');
      expect(sanitizeMarkdownForDisplay(markdown)).not.toContain(base64Data);
    });

    it('should sanitize double-quoted base64 image in image field', () => {
      const markdown = `---
name: Demo
image: "${base64Data}"
---
## Experience`;
      expect(sanitizeMarkdownForDisplay(markdown)).toContain('image: [avatar]');
      expect(sanitizeMarkdownForDisplay(markdown)).not.toContain(base64Data);
    });

    it('should sanitize single-quoted base64 image in image field', () => {
      const markdown = `---
name: Demo
image: '${base64Data}'
---
## Experience`;
      expect(sanitizeMarkdownForDisplay(markdown)).toContain('image: [avatar]');
      expect(sanitizeMarkdownForDisplay(markdown)).not.toContain(base64Data);
    });

    it('should sanitize inline base64 markdown images', () => {
      const markdown = `This is my avatar: ![my-pic](${base64Data})`;
      expect(sanitizeMarkdownForDisplay(markdown)).toBe('This is my avatar: ![my-pic](avatar)');
    });
  });

  describe('restoreAvatarFromDisplay', () => {
    it('should restore unquoted base64 image', () => {
      const original = `---
name: Demo
image: ${base64Data}
---`;
      const display = `---
name: Demo
image: [avatar]
---`;
      expect(restoreAvatarFromDisplay(display, original)).toContain(`image: ${base64Data}`);
    });

    it('should restore double-quoted base64 image', () => {
      const original = `---
name: Demo
image: "${base64Data}"
---`;
      const display = `---
name: Demo
image: [avatar]
---`;
      expect(restoreAvatarFromDisplay(display, original)).toContain(`image: "${base64Data}"`);
    });

    it('should restore single-quoted base64 image', () => {
      const original = `---
name: Demo
image: '${base64Data}'
---`;
      const display = `---
name: Demo
image: [avatar]
---`;
      expect(restoreAvatarFromDisplay(display, original)).toContain(`image: '${base64Data}'`);
    });

    it('should restore inline base64 markdown images', () => {
      const original = `This is my avatar: ![my-pic](${base64Data})`;
      const display = `This is my avatar: ![my-pic](avatar)`;
      expect(restoreAvatarFromDisplay(display, original)).toBe(`This is my avatar: ![my-pic](${base64Data})`);
    });
  });
});
