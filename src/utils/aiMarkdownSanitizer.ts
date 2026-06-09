export function sanitizeMarkdownImagesForAi(markdown: string): string {
  // 1. Replace inline markdown images: ![name](data:...) -> ![name](avatar)
  let result = markdown.replace(
    /!\[([^\]]*)\]\(['"]?data:image\/[^;\s]+;base64,[A-Za-z0-9+/=\s\r\n]+['"]?\)/gi,
    '![$1](avatar)',
  );

  // 2. Replace image field in frontmatter: image: data:... -> image: [avatar]
  result = result.replace(
    /(\s*image:\s*)['"]?data:image\/[^;\s]+;base64,[A-Za-z0-9+/=\s\r\n]+['"]?/gi,
    '$1[avatar]',
  );

  // 3. Replace any other standalone base64 data URLs: data:image/png;base64,... -> [avatar]
  result = result.replace(
    /['"]?data:image\/[^;\s]+;base64,[A-Za-z0-9+/=\s\r\n]+['"]?/gi,
    '[avatar]',
  );

  return result;
}
