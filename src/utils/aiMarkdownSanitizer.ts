const BASE64_CONTINUATION_LINE = String.raw`(?:\r?\n[ A-Za-z0-9+/=]{80,})*`;

export function sanitizeMarkdownImagesForAi(markdown: string): string {
  return markdown
    .replace(
      new RegExp(
        String.raw`^(\s*image:\s*)data:image\/[^;\s]+;base64,[A-Za-z0-9+/=]+${BASE64_CONTINUATION_LINE}(?=\r?\n|$)`,
        'gim',
      ),
      '$1[avatar]',
    )
    .replace(
      /!\[([^\]]*)\]\(data:image\/[^;\s]+;base64,[^)]+\)/gi,
      '![$1](avatar)',
    );
}
