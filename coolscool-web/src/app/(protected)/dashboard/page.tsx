'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useProgress } from '@/hooks/use-progress';
import { useAnalytics } from '@/hooks/use-analytics';
import { ProgressOverview } from '@/components/dashboard/progress-overview';
import { SessionHistory } from '@/components/dashboard/session-history';
import { TopicProgressCard } from '@/components/dashboard/topic-progress-card';
import { StreakBadge } from '@/components/dashboard/streak-badge';
import { ActivityChart } from '@/components/dashboard/activity-chart';
import { SubjectBreakdown } from '@/components/dashboard/subject-breakdown';
import { WeakAreas } from '@/components/dashboard/weak-areas';
import { StatCard } from '@/components/dashboard/stat-card';
import { Button } from '@/components/ui/button';

/**
 * Compute a simple week-over-week percentage change from trend data.
 * Compares the sum of the last 7 days against the preceding 7 days.
 */
function computeWeekOverWeekChange(
  trends: { date: string; xp: number; questions: number; accuracy: number }[]
): { xpChange: number; questionsChange: number; accuracyChange: number } {
  if (trends.length < 2) {
    return { xpChange: 0, questionsChange: 0, accuracyChange: 0 };
  }

  const sorted = [...trends].sort((a, b) => a.date.localeCompare(b.date));
  const recentWeek = sorted.slice(-7);
  const previousWeek = sorted.slice(-14, -7);

  const sumField = (arr: typeof sorted, field: 'xp' | 'questions' | 'accuracy') =>
    arr.reduce((sum, d) => sum + d[field], 0);

  const recentXP = sumField(recentWeek, 'xp');
  const prevXP = sumField(previousWeek, 'xp');
  const recentQ = sumField(recentWeek, 'questions');
  const prevQ = sumField(previousWeek, 'questions');

  const recentAcc = recentWeek.length > 0
    ? Math.round(sumField(recentWeek, 'accuracy') / recentWeek.length)
    : 0;
  const prevAcc = previousWeek.length > 0
    ? Math.round(sumField(previousWeek, 'accuracy') / previousWeek.length)
    : 0;

  const pctChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  return {
    xpChange: pctChange(recentXP, prevXP),
    questionsChange: pctChange(recentQ, prevQ),
    accuracyChange: recentAcc - prevAcc,
  };
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { isLoading: progressLoading, error: progressError, data: progressData, refresh: refreshProgress } = useProgress();
  const { isLoading: analyticsLoading, error: analyticsError, data: analyticsData, refresh: refreshAnalytics } = useAnalytics();

  const userName = session?.user?.displayName?.split(' ')[0] || 'Student';

  const isLoading = progressLoading || analyticsLoading;

  if (isLoading) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-container">
          <div className="dashboard-skeleton-header">
            <div className="skeleton skeleton-text" style={{ width: '50%', height: 32, marginBottom: 8 }} />
            <div className="skeleton skeleton-text" style={{ width: '30%', height: 16 }} />
          </div>
          <div className="progress-overview-grid" style={{ marginTop: 'var(--spacing-lg)' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton-stat-card">
                <div className="skeleton skeleton-circle" style={{ width: 40, height: 40, marginBottom: 8 }} />
                <div className="skeleton skeleton-text" style={{ width: '60%', height: 20, marginBottom: 4 }} />
                <div className="skeleton skeleton-text" style={{ width: '40%', height: 12 }} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 'var(--spacing-xl)' }}>
            <div className="skeleton skeleton-text" style={{ width: '100%', height: 200, borderRadius: 'var(--radius-xl)' }} />
          </div>
        </div>
      </main>
    );
  }

  const handleRefresh = async () => {
    await Promise.all([refreshProgress(), refreshAnalytics()]);
  };

  if (progressError && !progressData) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-container">
          <div className="dashboard-error">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>{progressError}</p>
            <Button variant="primary" onClick={handleRefresh}>
              Try Again
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const progress = progressData || {
    totalXP: 0,
    sessionsCompleted: 0,
    topicsStarted: 0,
    topicsMastered: 0,
    averageAccuracy: 0,
    sessionHistory: [],
    topicProgresses: [],
  };

  // Analytics may be null if user has no data or API errors - handle gracefully
  const trends = analyticsData?.trends || [];
  const subjects = analyticsData?.subjects || [];
  const streak = analyticsData?.streak || { currentStreak: 0, longestStreak: 0, lastActiveDate: null };
  const weakAreas = analyticsData?.weakAreas || [];

  // Compute week-over-week trend changes
  const weekChanges = computeWeekOverWeekChange(trends);

  // Determine the most recently practiced topic for "Continue" button
  const lastTopic = progress.topicProgresses.length > 0 ? progress.topicProgresses[0] : null;

  // Compute questions answered today from trends
  const today = new Date().toISOString().slice(0, 10);
  const todayTrend = trends.find(t => t.date === today);
  const questionsToday = todayTrend?.questions || 0;

  return (
    <main className="dashboard-page page-enter">
      <div className="dashboard-container">
        {/* Header */}
        <header className="dashboard-header">
          <div className="dashboard-header-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
              <h1 className="dashboard-title">
                Welcome back, {userName}!
              </h1>
              {streak.currentStreak > 0 && (
                <StreakBadge
                  currentStreak={streak.currentStreak}
                  longestStreak={streak.longestStreak}
                />
              )}
            </div>
            <p className="dashboard-subtitle">
              Track your learning progress and continue practicing
            </p>
          </div>
          <div className="dashboard-header-actions">
            {lastTopic && (
              <Link href={`/quiz?topic=${lastTopic.topic_id}`} className="btn btn-primary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Continue: {lastTopic.topic_name}
              </Link>
            )}
            <Link href="/browse" className="btn btn-secondary">
              Browse Topics
            </Link>
          </div>
        </header>

        {/* Stat Cards - Progress Overview */}
        <section className="dashboard-section">
          <ProgressOverview
            totalXP={progress.totalXP}
            sessionsCompleted={progress.sessionsCompleted}
            topicsStarted={progress.topicsStarted}
            topicsMastered={progress.topicsMastered}
            averageAccuracy={progress.averageAccuracy}
          />
          {/* Additional stat cards row for trend-enhanced data */}
          <div className="progress-overview-grid" style={{ marginTop: 'var(--spacing-md)' }}>
            <StatCard
              label="Accuracy"
              value={`${progress.averageAccuracy}%`}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              }
              trend={weekChanges.accuracyChange !== 0 ? {
                value: weekChanges.accuracyChange,
                label: 'vs last week',
                positive: weekChanges.accuracyChange > 0,
              } : undefined}
            />
            <StatCard
              label="Questions Today"
              value={questionsToday}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              }
            />
          </div>
        </section>

        {/* Activity Chart - 30 day trends */}
        <section className="dashboard-section">
          <ActivityChart data={trends} />
        </section>

        {/* Analytics Row - Subject Breakdown + Weak Areas */}
        <div className="dashboard-analytics-row">
          <SubjectBreakdown data={subjects} />
          <WeakAreas areas={weakAreas} />
        </div>

        {/* Main Content Grid */}
        <div className="dashboard-grid">
          {/* Session History */}
          <section className="dashboard-section dashboard-sessions">
            <SessionHistory
              sessions={progress.sessionHistory}
              maxItems={5}
              showViewAll={progress.sessionHistory.length > 5}
            />
          </section>

          {/* Topic Progress */}
          <section className="dashboard-section dashboard-topics">
            <div className="dashboard-topics-header">
              <h2 className="dashboard-section-title">Topics In Progress</h2>
              <Link href="/browse" className="btn btn-ghost btn-sm">
                Browse All
              </Link>
            </div>
            {progress.topicProgresses.length > 0 ? (
              <div className="dashboard-topics-list">
                {progress.topicProgresses.slice(0, 6).map((topic) => (
                  <TopicProgressCard
                    key={topic.topic_id}
                    topicId={topic.topic_id}
                    topicName={topic.topic_name}
                    themeName={topic.theme_name}
                    proficiencyBand={topic.proficiency_band}
                    proficiencyLabel={topic.proficiency_label}
                    conceptsStarted={topic.concepts_started}
                    conceptsTotal={topic.concepts_count}
                    xpEarned={topic.xp_earned}
                    totalAttempts={topic.total_attempts}
                    lastAttemptedAt={topic.last_attempted_at}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                </div>
                <h3 className="empty-state-title">No Topics Started</h3>
                <p className="empty-state-message">Pick a subject and topic to begin your learning journey!</p>
                <Link href="/browse" className="btn btn-primary">
                  Explore Topics
                </Link>
              </div>
            )}
          </section>
        </div>

        {/* Quick Actions */}
        <section className="dashboard-section dashboard-quick-actions">
          <h2 className="dashboard-section-title">Quick Actions</h2>
          <div className="dashboard-actions-grid">
            <Link href="/browse" className="dashboard-action-card">
              <div className="dashboard-action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <div className="dashboard-action-content">
                <div className="dashboard-action-title">Browse Topics</div>
                <div className="dashboard-action-description">Explore all available topics</div>
              </div>
            </Link>
            {lastTopic && (
              <Link href={`/quiz?topic=${lastTopic.topic_id}`} className="dashboard-action-card">
                <div className="dashboard-action-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
                <div className="dashboard-action-content">
                  <div className="dashboard-action-title">Resume Last Topic</div>
                  <div className="dashboard-action-description">{lastTopic.topic_name}</div>
                </div>
              </Link>
            )}
            {weakAreas.length > 0 && (
              <Link href={`/quiz?topic=${weakAreas[0].topicId}`} className="dashboard-action-card">
                <div className="dashboard-action-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div className="dashboard-action-content">
                  <div className="dashboard-action-title">Practice Weak Area</div>
                  <div className="dashboard-action-description">{weakAreas[0].topicName} ({weakAreas[0].accuracy}%)</div>
                </div>
              </Link>
            )}
            <Link href="/settings" className="dashboard-action-card">
              <div className="dashboard-action-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </div>
              <div className="dashboard-action-content">
                <div className="dashboard-action-title">Settings</div>
                <div className="dashboard-action-description">Manage preferences and data</div>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
