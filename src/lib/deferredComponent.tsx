import { createElement, useEffect, useSyncExternalStore, type ComponentType, type ReactNode } from 'react';

/** Split secondary UI without putting an interaction behind Suspense's fallback delay. */
export function deferredComponent<Props extends object>(
  loader: () => Promise<{ default: ComponentType<Props> }>,
  fallback: (props: Props) => ReactNode,
) {
  type Snapshot = { component: ComponentType<Props> | null; error: unknown };
  const initial: Snapshot = { component: null, error: null };
  let snapshot = initial;
  let pending: Promise<void> | undefined;
  const listeners = new Set<() => void>();
  const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
  const preload = () => pending ??= loader().then(module => {
    snapshot = { component: module.default, error: null };
    listeners.forEach(listener => listener());
  }, error => {
    snapshot = { component: null, error };
    listeners.forEach(listener => listener());
  });
  function Deferred(props: Props) {
    const state = useSyncExternalStore(subscribe, () => snapshot, () => initial);
    useEffect(() => { void preload(); }, []);
    if (state.error) throw state.error;
    return state.component ? createElement(state.component, props) : fallback(props);
  }
  return Object.assign(Deferred, { preload });
}

/** Prepare controls after first paint, while still letting an early click start loading. */
export function useIdlePreload(loaders: readonly (() => Promise<void>)[]) {
  useEffect(() => {
    const load = () => loaders.forEach(loader => { void loader(); });
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(load, { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(load, 100);
    return () => window.clearTimeout(id);
  }, [loaders]);
}
