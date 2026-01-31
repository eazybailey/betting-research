'use client';

import { useState, useCallback } from 'react';
import { UserSettings } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/constants';

/**
 * Hook for managing user settings in local state.
 * Settings persist in localStorage so they survive page refreshes.
 */
export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const stored = localStorage.getItem('odds-platform-settings');
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore parse errors, use defaults
    }
    return DEFAULT_SETTINGS;
  });

  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      // Keep kellyMultiplier in sync with kellyMode
      if (updates.kellyMode) {
        if (updates.kellyMode === 'full') next.kellyMultiplier = 1.0;
        else if (updates.kellyMode === 'half') next.kellyMultiplier = 0.5;
      }
      try {
        localStorage.setItem('odds-platform-settings', JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.removeItem('odds-platform-settings');
    } catch {
      // Ignore
    }
  }, []);

  return { settings, updateSettings, resetSettings };
}
