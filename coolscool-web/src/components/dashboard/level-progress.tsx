'use client';

import type { LevelInfo } from '@/lib/api/types';

export interface LevelProgressProps {
  levelInfo: LevelInfo;
}

export function LevelProgress({ levelInfo }: LevelProgressProps) {
  const { level, currentXp, xpForNextLevel, progress } = levelInfo;

  return (
    <div className="level-progress">
      <div className="level-progress-badge">
        <span className="level-progress-number">{level}</span>
      </div>
      <div className="level-progress-info">
        <div className="level-progress-bar-container">
          <div
            className="level-progress-bar-fill"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <span className="level-progress-text">
          {xpForNextLevel - currentXp} XP to Level {level + 1}
        </span>
      </div>
    </div>
  );
}
