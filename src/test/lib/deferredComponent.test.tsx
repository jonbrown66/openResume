import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { deferredComponent } from '@/lib/deferredComponent';

describe('deferredComponent', () => {
  it('shows feedback immediately and replaces it as soon as code resolves', async () => {
    let finish!: (module: { default: () => React.ReactNode }) => void;
    const loader = vi.fn(() => new Promise<{ default: () => React.ReactNode }>(resolve => { finish = resolve; }));
    const Component = deferredComponent(loader, () => <p role="status">Preparing panel</p>);
    render(<Component />);
    expect(screen.getByRole('status')).toHaveTextContent('Preparing panel');
    await act(async () => finish({ default: () => <button>Panel ready</button> }));
    expect(screen.getByRole('button', { name: 'Panel ready' })).toBeVisible();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('reuses a preload across mounts and renders the latest props without a fallback', async () => {
    const loader = vi.fn(async () => ({ default: ({ title }: { title: string }) => <h2>{title}</h2> }));
    const Component = deferredComponent(loader, () => <p role="status">Loading</p>);
    await Promise.all([Component.preload(), Component.preload()]);
    const first = render(<Component title="First panel" />);
    expect(screen.getByRole('heading')).toHaveTextContent('First panel');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    first.unmount();
    render(<Component title="Current panel" />);
    expect(screen.getByRole('heading')).toHaveTextContent('Current panel');
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
