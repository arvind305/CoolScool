'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeToggleProps {
  value?: Theme;
  onChange?: (theme: Theme) => void;
}

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  {
    value: 'light',
    label: 'Light',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
  },
  {
    value: 'system',
    label: 'System',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
];

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (theme === 'dark' || (theme === 'system' && systemDark)) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function ThemeToggle({ value = 'system', onChange }: ThemeToggleProps) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(value);

  // Apply theme on mount and when value changes
  useEffect(() => {
    setCurrentTheme(value);
    applyTheme(value);
  }, [value]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (currentTheme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('system');

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [currentTheme]);

  const handleChange = (theme: Theme) => {
    setCurrentTheme(theme);
    applyTheme(theme);
    onChange?.(theme);
  };

  return (
    <div className="theme-toggle">
      <div className="theme-toggle-label">Theme</div>
      <div className="theme-toggle-options" role="radiogroup" aria-label="Theme selection">
        {THEME_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={currentTheme === option.value}
            className={`theme-toggle-option ${currentTheme === option.value ? 'selected' : ''}`}
            onClick={() => handleChange(option.value)}
          >
            <span className="theme-toggle-option-icon">{option.icon}</span>
            <span className="theme-toggle-option-label">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default ThemeToggle;
