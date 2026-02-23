'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { StatCard } from '@/components/dashboard/stat-card';
import { TopicProgressCard } from '@/components/dashboard/topic-progress-card';
import { ActivityFeed } from '@/components/parent/activity-feed';
import { WeeklySummaryCard } from '@/components/parent/weekly-summary-card';
import { SubjectComparisonChart } from '@/components/parent/subject-comparison-chart';
import { AreasOfConcern } from '@/components/parent/areas-of-concern';
import { SessionTimeline } from '@/components/parent/session-timeline';
import { useChildView, useChildSessionsQuery } from '@/queries/use-parent-queries';
import type { ActivityItem as ParentActivityItem } from '@/types/parent';

const BAND_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  building_familiarity: 'Building Familiarity',
  growing_confidence: 'Growing Confidence',
  consistent_understanding: 'Consistent Understanding',
  exam_ready: 'Exam Ready',
};

function getInitials(name: string | null): string {
  if (!name) return '?';
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

  const {
    progress,
    activities,
    weeklySummary,
    subjectBreakdown,
    concerns,
    isLoading,
    isLoadingWeeklySummary,
    isLoadingSubjectBreakdown,
    isLoadingConcerns,
    progressError,
  } = useChildView(childId);

  const sessionsQuery = useChildSessionsQuery(childId, { limit: 20 });

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

  if (progressError || !progress) {
    return (
      <main className="child-progress-page">
        <div className="child-progress-container">
          <div className="child-progress-error">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>Failed to load progress data. Please try again.</p>
            <Link href="/parent" className="btn btn-primary">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { child, summary, topics, recentSessions } = progress;
  const displayName = child.displayName || child.email.split('@')[0] || 'Child';

  // Map activities for ActivityFeed component
  const mappedActivities: ParentActivityItem[] = activities.map((a) => ({
    id: a.id,
    childId: a.childId,
    childName: a.childName,
    childAvatar: null,
    type: 'session_completed' as const,
    title: 'Completed Practice Session',
    description: a.description,
    timestamp: a.timestamp,
    metadata: {
      topicId: a.metadata?.topicId,
      topicName: a.metadata?.topicName,
      xpEarned: a.metadata?.xpEarned,
      questionsCorrect: a.metadata?.questionsCorrect,
      questionsTotal: a.metadata?.questionsTotal,
    },
  }));

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
                {getInitials(displayName)}
              </span>
            )}
          </div>
          <div className="child-progress-info">
            <h1 className="child-progress-name">{displayName}</h1>
            <p className="child-progress-last-active">
              Last active: {recentSessions.length > 0 ? formatTimeAgo(recentSessions[0]?.completedAt ?? null) : 'Never'}
            </p>
          </div>
        </header>

        {/* Stats Overview */}
        <section className="child-progress-section">
          <div className="child-progress-stats-grid">
            <StatCard
              label="Total XP"
              value={summary.totalXp.toLocaleString()}
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
          </div>
        </section>

        {/* Weekly Summary */}
        <section className="child-progress-section">
          <WeeklySummaryCard
            summary={weeklySummary || {
              currentWeek: { sessionsCompleted: 0, questionsAnswered: 0, questionsCorrect: 0, accuracy: 0, xpEarned: 0, timeSpentMs: 0 },
              previousWeek: { sessionsCompleted: 0, questionsAnswered: 0, questionsCorrect: 0, accuracy: 0, xpEarned: 0, timeSpentMs: 0 },
              deltas: { sessions: 0, questions: 0, accuracy: 0, xp: 0 },
            }}
            isLoading={isLoadingWeeklySummary}
          />
        </section>

        {/* Main Content Grid */}
        <div className="child-progress-grid">
          {/* Left Column */}
          <div className="child-progress-main">
            {/* Subject Comparison Chart */}
            <section className="child-progress-section">
              <SubjectComparisonChart
                data={subjectBreakdown}
                isLoading={isLoadingSubjectBreakdown}
              />
            </section>

            {/* Areas of Concern */}
            <section className="child-progress-section">
              <AreasOfConcern
                concerns={concerns}
                isLoading={isLoadingConcerns}
              />
            </section>

            {/* Topics In Progress */}
            <section className="child-progress-section">
              <h2 className="child-progress-section-title">Topics In Progress</h2>
              {topics.length > 0 ? (
                <div className="child-progress-topics-list">
                  {topics
                    .filter((t) => t.proficiencyBand !== 'not_started')
                    .map((topic) => (
                      <TopicProgressCard
                        key={topic.topicId}
                        topicId={topic.topicId}
                        topicName={topic.topicName}
                        proficiencyBand={topic.proficiencyBand as any}
                        proficiencyLabel={BAND_LABELS[topic.proficiencyBand] || topic.proficiencyBand}
                        conceptsStarted={topic.conceptsStarted}
                        conceptsTotal={topic.conceptsTotal}
                        xpEarned={topic.xpEarned}
                        totalAttempts={0}
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

          {/* Right Column */}
          <div className="child-progress-sidebar">
            {/* Session Timeline */}
            <section className="child-progress-section">
              <SessionTimeline
                sessions={sessionsQuery.data?.sessions || []}
                childId={childId}
                isLoading={sessionsQuery.isLoading}
              />
            </section>

            {/* Recent Activity */}
            <section className="child-progress-section">
              <ActivityFeed
                activities={mappedActivities}
                maxItems={5}
                showChildName={false}
              />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
