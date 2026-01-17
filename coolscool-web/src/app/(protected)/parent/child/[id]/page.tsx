'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { StatCard } from '@/components/dashboard/stat-card';
import { SessionHistory } from '@/components/dashboard/session-history';
import { TopicProgressCard } from '@/components/dashboard/topic-progress-card';
import { ProgressCharts } from '@/components/parent/progress-charts';
import { ActivityFeed } from '@/components/parent/activity-feed';
import { getChildFullProgress, getActivityFeed } from '@/services/parent-api';
import type { ChildFullProgress, ActivityItem } from '@/types/parent';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ChildProgressPage() {
  const params = useParams();
  const childId = params.id as string;

  const [progressData, setProgressData] = React.useState<ChildFullProgress | null>(null);
  const [activities, setActivities] = React.useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        const [progress, activityData] = await Promise.all([
          getChildFullProgress(childId),
          getActivityFeed(childId, 5),
        ]);

        if (!progress) {
          setError('Child not found. They may have been unlinked from your account.');
          return;
        }

        setProgressData(progress);
        setActivities(activityData);
      } catch (err) {
        setError('Failed to load progress data. Please try again.');
        console.error('Error loading child progress:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [childId]);

  if (isLoading) {
    return (
      <main className="child-progress-page">
        <div className="child-progress-container">
          <div className="child-progress-loading">
            <div className="child-progress-loading-spinner" />
            <p>Loading progress data...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !progressData) {
    return (
      <main className="child-progress-page">
        <div className="child-progress-container">
          <div className="child-progress-error">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>{error || 'Something went wrong'}</p>
            <Link href="/parent" className="btn btn-primary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { child, summary, subjectProgress, topicProgress, recentSessions, strengths, areasToImprove } = progressData;

  return (
    <main className="child-progress-page">
      <div className="child-progress-container">
        {/* Breadcrumb */}
        <nav className="child-progress-breadcrumb">
          <Link href="/parent" className="breadcrumb-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Dashboard
          </Link>
        </nav>

        {/* Child Header */}
        <header className="child-progress-header">
          <div className="child-progress-avatar">
            {child.avatarUrl ? (
              <img src={child.avatarUrl} alt="" />
            ) : (
              <span className="child-progress-avatar-initials">
                {getInitials(child.displayName)}
              </span>
            )}
          </div>
          <div className="child-progress-info">
            <h1 className="child-progress-name">{child.displayName}</h1>
            <p className="child-progress-last-active">
              Last active: {formatTimeAgo(summary.lastActiveAt)}
            </p>
          </div>
          {summary.currentStreak > 0 && (
            <div className="child-progress-streak">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2c.55 0 1 .45 1 1v2c0 .55-.45 1-1 1s-1-.45-1-1V3c0-.55.45-1 1-1zm0 15a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
              <span className="child-progress-streak-count">{summary.currentStreak}</span>
              <span className="child-progress-streak-label">day streak</span>
            </div>
          )}
        </header>

        {/* Stats Overview */}
        <section className="child-progress-section">
          <div className="child-progress-stats-grid">
            <StatCard
              label="Total XP"
              value={summary.totalXP.toLocaleString()}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              }
            />
            <StatCard
              label="Sessions"
              value={summary.sessionsCompleted}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              }
            />
            <StatCard
              label="Topics Started"
              value={summary.topicsStarted}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                </svg>
              }
            />
            <StatCard
              label="Topics Mastered"
              value={summary.topicsMastered}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="7" />
                  <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                </svg>
              }
            />
            <StatCard
              label="Accuracy"
              value={`${summary.averageAccuracy}%`}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              }
            />
            <StatCard
              label="Longest Streak"
              value={`${summary.longestStreak} days`}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2Z" />
                </svg>
              }
            />
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="child-progress-grid">
          {/* Left Column - Charts and Insights */}
          <div className="child-progress-main">
            {/* Progress Charts */}
            <section className="child-progress-section">
              <h2 className="child-progress-section-title">Progress Overview</h2>
              <ProgressCharts
                subjectProgress={subjectProgress}
                topicProgress={topicProgress}
              />
            </section>

            {/* Strengths and Areas to Improve */}
            <section className="child-progress-section child-progress-insights">
              <div className="child-progress-insights-grid">
                <div className="insight-card strengths">
                  <h3 className="insight-card-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                    </svg>
                    Strengths
                  </h3>
                  <ul className="insight-list">
                    {strengths.map((strength, i) => (
                      <li key={i}>{strength}</li>
                    ))}
                  </ul>
                </div>
                <div className="insight-card improvements">
                  <h3 className="insight-card-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </svg>
                    Areas to Practice
                  </h3>
                  <ul className="insight-list">
                    {areasToImprove.map((area, i) => (
                      <li key={i}>{area}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* Topics In Progress */}
            <section className="child-progress-section">
              <h2 className="child-progress-section-title">Topics In Progress</h2>
              {topicProgress.length > 0 ? (
                <div className="child-progress-topics-list">
                  {topicProgress.map((topic) => (
                    <TopicProgressCard
                      key={topic.topicId}
                      topicId={topic.topicId}
                      topicName={topic.topicName}
                      themeName={topic.themeName}
                      proficiencyBand={topic.proficiencyBand}
                      proficiencyLabel={topic.proficiencyLabel}
                      conceptsStarted={topic.conceptsStarted}
                      conceptsTotal={topic.conceptsTotal}
                      xpEarned={topic.xpEarned}
                      totalAttempts={topic.totalAttempts}
                      lastAttemptedAt={topic.lastAttemptedAt}
                    />
                  ))}
                </div>
              ) : (
                <div className="child-progress-topics-empty">
                  <p>No topics started yet</p>
                </div>
              )}
            </section>
          </div>

          {/* Right Column - Activity and Sessions */}
          <div className="child-progress-sidebar">
            {/* Recent Activity */}
            <section className="child-progress-section">
              <ActivityFeed
                activities={activities}
                maxItems={5}
                showChildName={false}
              />
            </section>

            {/* Recent Sessions */}
            <section className="child-progress-section">
              <SessionHistory
                sessions={recentSessions}
                maxItems={5}
                showViewAll={false}
              />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
