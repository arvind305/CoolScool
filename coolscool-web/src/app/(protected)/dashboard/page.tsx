'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useProgress } from '@/hooks/use-progress';
import { ProgressOverview } from '@/components/dashboard/progress-overview';
import { SessionHistory } from '@/components/dashboard/session-history';
import { TopicProgressCard } from '@/components/dashboard/topic-progress-card';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { data: session } = useSession();
  const { isLoading, error, data, refresh } = useProgress();

  const userName = session?.user?.displayName?.split(' ')[0] || 'Student';

  if (isLoading) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-container">
          <div className="dashboard-loading">
            <div className="dashboard-loading-spinner" />
            <p>Loading your progress...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-container">
          <div className="dashboard-error">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>{error}</p>
            <Button variant="primary" onClick={refresh}>
              Try Again
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const progressData = data || {
    totalXP: 0,
    sessionsCompleted: 0,
    topicsStarted: 0,
    topicsMastered: 0,
    averageAccuracy: 0,
    sessionHistory: [],
    topicProgresses: [],
  };

  return (
    <main className="dashboard-page">
      <div className="dashboard-container">
        {/* Header */}
        <header className="dashboard-header">
          <div className="dashboard-header-content">
            <h1 className="dashboard-title">
              Welcome back, {userName}!
            </h1>
            <p className="dashboard-subtitle">
              Track your learning progress and continue practicing
            </p>
          </div>
          <div className="dashboard-header-actions">
            <Link href="/browse" className="btn btn-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Start Practice
            </Link>
          </div>
        </header>

        {/* Progress Overview */}
        <section className="dashboard-section">
          <ProgressOverview
            totalXP={progressData.totalXP}
            sessionsCompleted={progressData.sessionsCompleted}
            topicsStarted={progressData.topicsStarted}
            topicsMastered={progressData.topicsMastered}
            averageAccuracy={progressData.averageAccuracy}
          />
        </section>

        {/* Main Content Grid */}
        <div className="dashboard-grid">
          {/* Session History */}
          <section className="dashboard-section dashboard-sessions">
            <SessionHistory
              sessions={progressData.sessionHistory}
              maxItems={5}
              showViewAll={progressData.sessionHistory.length > 5}
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
            {progressData.topicProgresses.length > 0 ? (
              <div className="dashboard-topics-list">
                {progressData.topicProgresses.slice(0, 6).map((topic) => (
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
              <div className="dashboard-topics-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                <p>No topics started yet</p>
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
