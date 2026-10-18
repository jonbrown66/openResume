import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { AssistantReply } from '@/components/assistant/AssistantReply';
it('renders semantic headings, lists and tables while ignoring HTML and remote images', () => {
  const { container } = render(<AssistantReply content={'## Priority\n\n**Evidence** matters.\n\n- First improvement\n\n| Need | Evidence |\n| --- | --- |\n| React | Project |\n\n[Docs](https://example.com)\n\n![tracking](https://example.com/pixel.png)\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))'} />);
  expect(screen.getByRole('heading', { name: 'Priority' })).toBeInTheDocument();
  expect(screen.getByRole('listitem')).toHaveTextContent('First improvement');
  expect(screen.getByRole('table')).toHaveTextContent('React');
  expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('rel', 'noopener noreferrer');
  expect(container.querySelector('img, script, [href^="javascript:"]')).toBeNull();
});
