export function sanitizeMarkdownForDisplay(markdown: string): string {
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

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function restoreAvatarFromDisplay(displayMarkdown: string, originalMarkdown: string): string {
  // Find avatar in image: field
  const avatarMatch = originalMarkdown.match(/image:\s*(['"]?data:image\/[^;]+;base64,[A-Za-z0-9+/=\s\r\n]+['"]?)/i);
  let result = displayMarkdown;

  if (avatarMatch) {
    const originalAvatar = avatarMatch[1];
    result = result.replace(/image:\s*['"]?\[avatar\]['"]?/g, `image: ${originalAvatar}`);
  }
  
  // Find avatar in ![...] (data:...) inline images (with closing parenthesis outside the URL capture group)
  const inlineMatches = [...originalMarkdown.matchAll(/(!\[([^\]]*)\]\()(['"]?data:image\/[^;\s]+;base64,[A-Za-z0-9+/=\s\r\n]+['"]?)\)/gi)];
  for (const match of inlineMatches) {
    const name = match[2];
    const originalUrl = match[3];
    const regex = new RegExp('!\\[' + escapeRegExp(name) + '\\]\\([\'"]?avatar[\'"]?\\)', 'g');
    result = result.replace(regex, `![${name}](${originalUrl})`);
  }
  
  return result;
}

