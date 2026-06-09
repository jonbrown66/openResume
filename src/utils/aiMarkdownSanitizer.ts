export function sanitizeMarkdownImagesForAi(markdown: string): string {
  return markdown
    .replace(
      /(\s*image:\s*)['"]?data:image\/[^;\s]+;base64,[A-Za-z0-9+/=\s\r\n]+['"]?/gi,
      '$1[avatar]',
    )
    .replace(
      /!\[([^\]]*)\]\(['"]?data:image\/[^;\s]+;base64,[A-Za-z0-9+/=\s\r\n]+['"]?\)/gi,
      '![$1](avatar)',
    );
}
