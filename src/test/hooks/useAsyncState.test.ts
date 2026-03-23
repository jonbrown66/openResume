import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAsyncState, useLoadingState } from '@/hooks/useAsyncState';

describe('useAsyncState', () => {
  it('starts with idle state', () => {
    const { result } = renderHook(() => useAsyncState());
    
    expect(result.current.state).toBe('idle');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('handles successful async operation', async () => {
    const { result } = renderHook(() => useAsyncState<string>());
    
    await act(async () => {
      await result.current.execute(() => Promise.resolve('success'));
    });
    
    expect(result.current.state).toBe('success');
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toBe('success');
    expect(result.current.error).toBeNull();
  });

  it('handles failed async operation', async () => {
    const { result } = renderHook(() => useAsyncState());
    const error = new Error('test error');
    
    await act(async () => {
      await result.current.execute(() => Promise.reject(error));
    });
    
    expect(result.current.state).toBe('error');
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(error);
    expect(result.current.data).toBeNull();
  });

  it('sets loading state during async operation', async () => {
    const { result } = renderHook(() => useAsyncState());
    let resolvePromise: (value: string) => void;
    const promise = new Promise<string>((resolve) => {
      resolvePromise = resolve;
    });
    
    act(() => {
      result.current.execute(() => promise);
    });
    
    expect(result.current.state).toBe('loading');
    expect(result.current.isLoading).toBe(true);
    
    await act(async () => {
      resolvePromise('done');
      await promise;
    });
    
    expect(result.current.state).toBe('success');
  });

  it('calls onSuccess callback', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAsyncState({ onSuccess }));
    
    await act(async () => {
      await result.current.execute(() => Promise.resolve('data'));
    });
    
    expect(onSuccess).toHaveBeenCalledWith('data');
  });

  it('calls onError callback', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useAsyncState({ onError }));
    const error = new Error('test');
    
    await act(async () => {
      await result.current.execute(() => Promise.reject(error));
    });
    
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('resets state', async () => {
    const { result } = renderHook(() => useAsyncState());
    
    await act(async () => {
      await result.current.execute(() => Promise.resolve('data'));
    });
    
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.state).toBe('idle');
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

describe('useLoadingState', () => {
  it('starts with idle state by default', () => {
    const { result } = renderHook(() => useLoadingState());
    
    expect(result.current.state).toBe('idle');
    expect(result.current.isIdle).toBe(true);
  });

  it('starts with provided initial state', () => {
    const { result } = renderHook(() => useLoadingState('loading'));
    
    expect(result.current.state).toBe('loading');
    expect(result.current.isLoading).toBe(true);
  });

  it('transitions to loading state', () => {
    const { result } = renderHook(() => useLoadingState());
    
    act(() => {
      result.current.startLoading();
    });
    
    expect(result.current.state).toBe('loading');
    expect(result.current.isLoading).toBe(true);
  });

  it('transitions to success state', () => {
    const { result } = renderHook(() => useLoadingState('loading'));
    
    act(() => {
      result.current.setSuccess();
    });
    
    expect(result.current.state).toBe('success');
    expect(result.current.isSuccess).toBe(true);
  });

  it('transitions to error state', () => {
    const { result } = renderHook(() => useLoadingState('loading'));
    
    act(() => {
      result.current.setError();
    });
    
    expect(result.current.state).toBe('error');
    expect(result.current.isError).toBe(true);
  });

  it('resets to idle state', () => {
    const { result } = renderHook(() => useLoadingState('loading'));
    
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.state).toBe('idle');
    expect(result.current.isIdle).toBe(true);
  });
});
