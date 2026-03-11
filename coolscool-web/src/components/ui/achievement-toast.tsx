'use client';

import { useState, useEffect } from 'react';

const ICON_MAP: Record<string, string> = {
  rocket: '\uD83D\uDE80',
  fire: '\uD83D\uDD25',
  star: '\u2B50',
  trophy: '\uD83C\uDFC6',
  target: '\uD83C\uDFAF',
  lightning: '\u26A1',
  crown: '\uD83D\uDC51',
  gem: '\uD83D\uDC8E',
  shield: '\uD83D\uDEE1\uFE0F',
  book: '\uD83D\uDCDA',
};

export interface AchievementToastData {
  achievementId: string;
  name: string;
  description: string | null;
  icon: string;
  xpReward: number;
}

export interface AchievementToastProps {
  achievements: AchievementToastData[];
  onDismiss: () => void;
}

export function AchievementToast({ achievements, onDismiss }: AchievementToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300); // Wait for exit animation
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (achievements.length === 0) return null;

  return (
    <div className={`achievement-toast-container ${visible ? 'visible' : 'hidden'}`}>
      {achievements.map((achievement) => (
        <div key={achievement.achievementId} className="achievement-toast">
          <span className="achievement-toast-icon">
            {ICON_MAP[achievement.icon] || '\uD83C\uDFC5'}
          </span>
          <div className="achievement-toast-content">
            <span className="achievement-toast-label">Achievement Unlocked!</span>
            <span className="achievement-toast-name">{achievement.name}</span>
            <span className="achievement-toast-xp">+{achievement.xpReward} XP</span>
          </div>
          <button className="achievement-toast-close" onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
