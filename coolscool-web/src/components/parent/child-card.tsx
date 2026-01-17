'use client';

import * as React from 'react';
import Link from 'next/link';
import type { ChildCardData } from '@/types/parent';

export interface ChildCardProps {
  data: ChildCardData;
  className?: string;
}

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
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 5) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function ChildCard({ data, className = '' }: ChildCardProps) {
  const { child, summary } = data;

  return (
    <article className={`child-card ${className}`}>
      <div className="child-card-header">
        <div className="child-card-avatar">
          {child.avatarUrl ? (
            <img src={child.avatarUrl} alt="" />
          ) : (
            <span className="child-card-avatar-initials">
              {getInitials(child.displayName)}
            </span>
          )}
        </div>
        <div className="child-card-info">
          <h3 className="child-card-name">{child.displayName}</h3>
          <span className="child-card-last-active">
            {summary.lastActiveAt ? (
              <>
                Active {formatTimeAgo(summary.lastActiveAt)}
              </>
            ) : (
              'Not started yet'
            )}
          </span>
        </div>
        {summary.currentStreak > 0 && (
          <div className="child-card-streak" title={`${summary.currentStreak}-day streak`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2c.55 0 1 .45 1 1v2c0 .55-.45 1-1 1s-1-.45-1-1V3c0-.55.45-1 1-1zm0 15a3 3 0 100-6 3 3 0 000 6zm8.53-5.47l1.41-1.41a.996.996 0 10-1.41-1.41l-1.41 1.41c.39.39.39 1.02 0 1.41s-1.02.39-1.41 0l-1.41-1.41 1.41-1.41a.996.996 0 10-1.41-1.41l-1.41 1.41c.39.39.39 1.02 0 1.41L12 17.4l-2.9-2.89a.996.996 0 10-1.41 1.41l1.41 1.41-1.41 1.41a.996.996 0 101.41 1.41l1.41-1.41c-.39-.39-.39-1.02 0-1.41s1.02-.39 1.41 0l1.41 1.41-1.41 1.41a.996.996 0 101.41 1.41l1.41-1.41c-.39-.39-.39-1.02 0-1.41L12 14.59l2.89 2.9c.39.39 1.02.39 1.41 0l.01-.01z" />
            </svg>
            <span>{summary.currentStreak}</span>
          </div>
        )}
      </div>

      <div className="child-card-stats">
        <div className="child-card-stat">
          <span className="child-card-stat-value">{summary.totalXP.toLocaleString()}</span>
          <span className="child-card-stat-label">XP Earned</span>
        </div>
        <div className="child-card-stat">
          <span className="child-card-stat-value">{summary.sessionsCompleted}</span>
          <span className="child-card-stat-label">Sessions</span>
        </div>
        <div className="child-card-stat">
          <span className="child-card-stat-value">{summary.averageAccuracy}%</span>
          <span className="child-card-stat-label">Accuracy</span>
        </div>
        <div className="child-card-stat">
          <span className="child-card-stat-value">{formatDuration(summary.totalTimeSpentMs)}</span>
          <span className="child-card-stat-label">Time Spent</span>
        </div>
      </div>

      <div className="child-card-progress">
        <div className="child-card-progress-header">
          <span>Topics Progress</span>
          <span>
            {summary.topicsMastered} / {summary.topicsStarted} mastered
          </span>
        </div>
        <div className="child-card-progress-bar">
          <div
            className="child-card-progress-fill mastered"
            style={{
              width: summary.topicsStarted > 0
                ? `${(summary.topicsMastered / summary.topicsStarted) * 100}%`
                : '0%',
            }}
          />
          <div
            className="child-card-progress-fill started"
            style={{
              width: summary.topicsStarted > 0
                ? `${((summary.topicsStarted - summary.topicsMastered) / summary.topicsStarted) * 100}%`
                : '0%',
            }}
          />
        </div>
      </div>

      <div className="child-card-actions">
        <Link href={`/parent/child/${child.id}`} className="btn btn-primary child-card-view-btn">
          View Progress
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>
    </article>
  );
}

export default ChildCard;
