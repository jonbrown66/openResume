import { useState, useCallback } from 'react';

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

interface UseAsyncStateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseAsyncStateReturn<T> {
  data: T | null;
  error: Error | null;
  state: LoadingState;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  execute: (asyncFn: () => Promise<T>) => Promise<T | null>;
  reset: () => void;
}

export function useAsyncState<T = unknown>(
  options: UseAsyncStateOptions<T> = {}
): UseAsyncStateReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [state, setState] = useState<LoadingState>('idle');

  const execute = useCallback(async (asyncFn: () => Promise<T>): Promise<T | null> => {
    setState('loading');
    setError(null);
    
    try {
      const result = await asyncFn();
      setData(result);
      setState('success');
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setState('error');
      options.onError?.(error);
      return null;
    }
  }, [options]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setState('idle');
  }, []);

  return {
    data,
    error,
    state,
    isLoading: state === 'loading',
    isSuccess: state === 'success',
    isError: state === 'error',
    execute,
    reset,
  };
}

export function useLoadingState(initialState: LoadingState = 'idle') {
  const [state, setState] = useState<LoadingState>(initialState);
  
  return {
    state,
    setState,
    isLoading: state === 'loading',
    isSuccess: state === 'success',
    isError: state === 'error',
    isIdle: state === 'idle',
    startLoading: () => setState('loading'),
    setSuccess: () => setState('success'),
    setError: () => setState('error'),
    reset: () => setState('idle'),
  };
}
