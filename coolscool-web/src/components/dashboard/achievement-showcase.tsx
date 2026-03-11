'use client';

import Link from 'next/link';
import type { AchievementStats } from '@/lib/api/types';

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

export interface AchievementShowcaseProps {
  stats: AchievementStats;
}

export function AchievementShowcase({ stats }: AchievementShowcaseProps) {
  return (
    <div className="achievement-showcase">
      <div className="achievement-showcase-header">
        <h3 className="achievement-showcase-title">Achievements</h3>
        <span className="achievement-showcase-count">
          {stats.earned}/{stats.total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="achievement-showcase-progress">
        <div
          className="achievement-showcase-progress-fill"
          style={{ width: `${stats.total > 0 ? (stats.earned / stats.total) * 100 : 0}%` }}
        />
      </div>

      {/* Recent achievements */}
      {stats.recentAchievements.length > 0 ? (
        <div className="achievement-showcase-recent">
          {stats.recentAchievements.map((achievement) => (
            <div key={achievement.achievementId} className="achievement-showcase-item">
              <span className="achievement-showcase-icon">
                {ICON_MAP[achievement.icon] || '\uD83C\uDFC5'}
              </span>
              <div className="achievement-showcase-item-info">
                <span className="achievement-showcase-item-name">{achievement.name}</span>
                <span className="achievement-showcase-item-xp">+{achievement.xpReward} XP</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="achievement-showcase-empty">
          Complete quizzes to earn achievements!
        </p>
      )}

      <Link href="/achievements" className="achievement-showcase-link">
        View All
      </Link>
    </div>
  );
}
