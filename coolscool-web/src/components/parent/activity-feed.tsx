'use client';

import * as React from 'react';
import type { ActivityItem } from '@/types/parent';

export interface ActivityFeedProps {
  activities: ActivityItem[];
  maxItems?: number;
  showChildName?: boolean;
  isLoading?: boolean;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 5) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getActivityIcon(type: ActivityItem['type']): React.ReactNode {
  switch (type) {
    case 'session_completed':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case 'topic_mastered':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case 'achievement_earned':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="8" r="7" />
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
      );
    case 'streak_milestone':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2Z" />
        </svg>
      );
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
  }
}

function getActivityTypeClass(type: ActivityItem['type']): string {
  switch (type) {
    case 'session_completed':
      return 'activity-type-session';
    case 'topic_mastered':
      return 'activity-type-mastered';
    case 'achievement_earned':
      return 'activity-type-achievement';
    case 'streak_milestone':
      return 'activity-type-streak';
    default:
      return '';
  }
}

export function ActivityFeed({
  activities,
  maxItems = 10,
  showChildName = true,
  isLoading = false,
}: ActivityFeedProps) {
  const displayActivities = activities.slice(0, maxItems);

  if (isLoading) {
    return (
      <div className="activity-feed">
        <h2 className="activity-feed-title">Recent Activity</h2>
        <div className="activity-feed-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="activity-item-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="activity-feed">
        <h2 className="activity-feed-title">Recent Activity</h2>
        <div className="activity-feed-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <p>No recent activity yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-feed">
      <h2 className="activity-feed-title">Recent Activity</h2>
      <div className="activity-feed-list">
        {displayActivities.map((activity) => (
          <div
            key={activity.id}
            className={`activity-item ${getActivityTypeClass(activity.type)}`}
          >
            <div className="activity-item-icon">{getActivityIcon(activity.type)}</div>
            <div className="activity-item-content">
              <div className="activity-item-header">
                {showChildName && (
                  <span className="activity-item-child">{activity.childName}</span>
                )}
                <span className="activity-item-title">{activity.title}</span>
              </div>
              <p className="activity-item-description">{activity.description}</p>
              {activity.metadata && (
                <div className="activity-item-meta">
                  {activity.metadata.xpEarned && (
                    <span className="activity-meta-xp">+{activity.metadata.xpEarned} XP</span>
                  )}
                  {activity.metadata.questionsCorrect !== undefined && (
                    <span className="activity-meta-score">
                      {activity.metadata.questionsCorrect}/{activity.metadata.questionsTotal} correct
                    </span>
                  )}
                  {activity.metadata.streakDays && (
                    <span className="activity-meta-streak">{activity.metadata.streakDays} days</span>
                  )}
                </div>
              )}
            </div>
            <div className="activity-item-time">{formatTimeAgo(activity.timestamp)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ActivityFeed;
