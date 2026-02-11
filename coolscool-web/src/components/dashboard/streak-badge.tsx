'use client';
import * as React from 'react';

export interface StreakBadgeProps {
  currentStreak: number;
  longestStreak: number;
}

export function StreakBadge({ currentStreak, longestStreak }: StreakBadgeProps) {
  if (currentStreak === 0) return null;

  return (
    <div className="streak-badge">
      <div className="streak-badge-icon">🔥</div>
      <div className="streak-badge-info">
        <span className="streak-badge-count">{currentStreak} day{currentStreak !== 1 ? 's' : ''}</span>
        <span className="streak-badge-label">streak</span>
      </div>
      {longestStreak > currentStreak && (
        <span className="streak-badge-best">Best: {longestStreak}</span>
      )}
    </div>
  );
}
