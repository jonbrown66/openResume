import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettings } from '@/hooks/useSettings';
import { DEFAULT_SETTINGS } from '@/config/settings';

describe('useSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('returns default settings when localStorage is empty', () => {
    const { result } = renderHook(() => useSettings());
    
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('loads saved settings from localStorage', () => {
    const savedSettings = {
      theme: 'dark',
      language: 'en',
    };
    localStorage.setItem('myresume-settings-v1', JSON.stringify(savedSettings));
    
    const { result } = renderHook(() => useSettings());
    
    expect(result.current.settings.theme).toBe('dark');
    expect(result.current.settings.language).toBe('en');
  });

  it('merges saved settings with defaults', () => {
    const savedSettings = { theme: 'dark' };
    localStorage.setItem('myresume-settings-v1', JSON.stringify(savedSettings));
    
    const { result } = renderHook(() => useSettings());
    
    expect(result.current.settings.theme).toBe('dark');
    expect(result.current.settings.language).toBe(DEFAULT_SETTINGS.language);
  });

  it('updates settings correctly', () => {
    const { result } = renderHook(() => useSettings());
    
    act(() => {
      result.current.updateSettings({ theme: 'dark' });
    });
    
    expect(result.current.settings.theme).toBe('dark');
  });

  it('updates provider settings correctly', () => {
    const { result } = renderHook(() => useSettings());
    
    act(() => {
      result.current.updateProvider('openai', { apiKey: 'test-key' });
    });
    
    expect(result.current.settings.providers.openai.apiKey).toBe('test-key');
  });

  it('sets active provider correctly', () => {
    const { result } = renderHook(() => useSettings());
    
    act(() => {
      result.current.setActiveProvider('gemini');
    });
    
    expect(result.current.settings.activeProvider).toBe('gemini');
  });

  it('sets theme correctly', () => {
    const { result } = renderHook(() => useSettings());
    
    act(() => {
      result.current.setTheme('dark');
    });
    
    expect(result.current.settings.theme).toBe('dark');
  });

  it('sets language correctly', () => {
    const { result } = renderHook(() => useSettings());
    
    act(() => {
      result.current.setLanguage('en');
    });
    
    expect(result.current.settings.language).toBe('en');
  });

  it('saves settings to localStorage on change', () => {
    const { result } = renderHook(() => useSettings());
    
    act(() => {
      result.current.updateSettings({ theme: 'dark' });
    });
    
    const saved = JSON.parse(localStorage.getItem('myresume-settings-v1') || '{}');
    expect(saved.theme).toBe('dark');
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('myresume-settings-v1', 'invalid-json');
    
    const { result } = renderHook(() => useSettings());
    
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });
});
