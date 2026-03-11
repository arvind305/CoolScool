'use client';

import Link from 'next/link';
import { useAchievements, useLevelInfo } from '@/hooks';
import { LevelProgress } from '@/components/dashboard/level-progress';

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

const CATEGORY_LABELS: Record<string, string> = {
  milestone: 'Milestones',
  streak: 'Streaks',
  accuracy: 'Accuracy',
  mastery: 'Mastery',
};

export default function AchievementsPage() {
  const { isLoading, error, achievements } = useAchievements();
  const { levelInfo } = useLevelInfo();

  if (isLoading) {
    return (
      <main className="achievements-page">
        <div className="achievements-container">
          <div className="skeleton skeleton-text" style={{ width: '40%', height: 32, marginBottom: 24 }} />
          <div className="achievements-grid">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="achievements-page">
        <div className="achievements-container">
          <p className="text-[var(--color-text-muted)]">{error}</p>
        </div>
      </main>
    );
  }

  const earned = achievements.filter(a => a.earned).length;

  // Group by category
  const grouped = achievements.reduce<Record<string, typeof achievements>>((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category]!.push(a);
    return acc;
  }, {});

  return (
    <main className="achievements-page page-enter">
      <div className="achievements-container">
        <header className="achievements-header">
          <div>
            <h1 className="achievements-title">Achievements</h1>
            <p className="achievements-subtitle">
              {earned} of {achievements.length} earned
            </p>
          </div>
          {levelInfo && <LevelProgress levelInfo={levelInfo} />}
        </header>

        {Object.entries(grouped).map(([category, items]) => (
          <section key={category} className="achievements-category">
            <h2 className="achievements-category-title">
              {CATEGORY_LABELS[category] || category}
            </h2>
            <div className="achievements-grid">
              {items.map((achievement) => (
                <div
                  key={achievement.achievementId}
                  className={`achievement-card ${achievement.earned ? 'earned' : 'locked'}`}
                >
                  <span className="achievement-card-icon">
                    {ICON_MAP[achievement.icon] || '\uD83C\uDFC5'}
                  </span>
                  <div className="achievement-card-info">
                    <h3 className="achievement-card-name">{achievement.name}</h3>
                    <p className="achievement-card-desc">
                      {achievement.description}
                    </p>
                    <span className="achievement-card-xp">+{achievement.xpReward} XP</span>
                  </div>
                  {achievement.earned && achievement.earnedAt && (
                    <span className="achievement-card-date">
                      {new Date(achievement.earnedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        <div style={{ marginTop: 'var(--spacing-lg)', textAlign: 'center' }}>
          <Link href="/dashboard" className="btn btn-secondary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
