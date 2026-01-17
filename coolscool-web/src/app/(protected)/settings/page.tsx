'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { useProgress } from '@/hooks/use-progress';
import { ThemeToggle, type Theme } from '@/components/settings/theme-toggle';
import { SoundToggle } from '@/components/settings/sound-toggle';
import { DataManagement } from '@/components/settings/data-management';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

// Settings storage key
const SETTINGS_KEY = 'coolscool_settings';

interface Settings {
  theme: Theme;
  soundEnabled: boolean;
}

function loadSettings(): Settings {
  if (typeof window === 'undefined') {
    return { theme: 'system', soundEnabled: true };
  }
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore errors
  }
  return { theme: 'system', soundEnabled: true };
}

function saveSettings(settings: Settings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore errors
  }
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { isLoading, data, exportData, importData, clearAllData } = useProgress();

  const [settings, setSettings] = useState<Settings>({ theme: 'system', soundEnabled: true });
  const [isHydrated, setIsHydrated] = useState(false);

  // Load settings on mount
  useEffect(() => {
    setSettings(loadSettings());
    setIsHydrated(true);
  }, []);

  const handleThemeChange = (theme: Theme) => {
    const newSettings = { ...settings, theme };
    setSettings(newSettings);
    saveSettings(newSettings);
    // Apply theme to document (in a real app, you'd use a context/provider)
    // For now, just save the preference
  };

  const handleSoundChange = (enabled: boolean) => {
    const newSettings = { ...settings, soundEnabled: enabled };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const user = session?.user;

  return (
    <main className="settings-page">
      <div className="settings-container">
        {/* Header */}
        <header className="settings-header">
          <Link href="/dashboard" className="settings-back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="settings-title">Settings</h1>
        </header>

        {/* Profile Section */}
        {user && (
          <section className="settings-section">
            <h2 className="settings-section-title">Profile</h2>
            <div className="settings-profile">
              <div className="settings-profile-avatar">
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={user.displayName || 'User'}
                    width={64}
                    height={64}
                    className="settings-profile-image"
                  />
                ) : (
                  <div className="settings-profile-initials">
                    {(user.displayName || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="settings-profile-info">
                <div className="settings-profile-name">{user.displayName || 'User'}</div>
                <div className="settings-profile-email">{user.email}</div>
                {user.role && (
                  <span className={`settings-profile-role role-${user.role}`}>
                    {user.role === 'child' ? 'Student' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Preferences Section */}
        <section className="settings-section">
          <h2 className="settings-section-title">Preferences</h2>
          <div className="settings-preferences">
            {isHydrated && (
              <>
                <ThemeToggle
                  value={settings.theme}
                  onChange={handleThemeChange}
                />
                <div className="settings-divider" />
                <SoundToggle
                  enabled={settings.soundEnabled}
                  onChange={handleSoundChange}
                />
              </>
            )}
          </div>
        </section>

        {/* Data Management Section */}
        <section className="settings-section">
          <DataManagement
            onExport={exportData}
            onImport={importData}
            onReset={clearAllData}
            totalXP={data?.totalXP || 0}
            sessionsCount={data?.sessionsCompleted || 0}
            topicsCount={data?.topicsStarted || 0}
          />
        </section>

        {/* About Section */}
        <section className="settings-section">
          <h2 className="settings-section-title">About</h2>
          <div className="settings-about">
            <div className="settings-about-item">
              <span className="settings-about-label">App Version</span>
              <span className="settings-about-value">2.0.0</span>
            </div>
            <div className="settings-about-item">
              <span className="settings-about-label">Board</span>
              <span className="settings-about-value">ICSE</span>
            </div>
            <div className="settings-about-item">
              <span className="settings-about-label">Class</span>
              <span className="settings-about-value">Class 5</span>
            </div>
            <div className="settings-about-item">
              <span className="settings-about-label">Subject</span>
              <span className="settings-about-value">Mathematics</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
