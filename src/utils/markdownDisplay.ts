export function sanitizeMarkdownForDisplay(markdown: string): string {
  return markdown.replace(
    /^(image:\s*)data:image\/[^;]+;base64,[^\n]+/gm,
    '$1[avatar]'
  );
}

export function restoreAvatarFromDisplay(displayMarkdown: string, originalMarkdown: string): string {
  const avatarMatch = originalMarkdown.match(/^image:\s*(data:image\/[^;]+;base64,[^\n]+)/m);
  if (!avatarMatch) {
    return displayMarkdown;
  }
  
  const originalAvatar = avatarMatch[1];
  
  if (!displayMarkdown.includes('image: [avatar]')) {
    return displayMarkdown;
  }
  
  return displayMarkdown.replace(/^image:\s*\[avatar\]/m, `image: ${originalAvatar}`);
}
