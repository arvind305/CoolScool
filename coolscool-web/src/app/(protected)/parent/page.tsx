'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { ChildList } from '@/components/parent/child-list';
import { ActivityFeed } from '@/components/parent/activity-feed';
import { NotificationSettings } from '@/components/parent/notification-settings';
import { useParentDashboard, useChildrenQuery } from '@/queries/use-parent-queries';
import type { ChildCardData, ActivityItem as ParentActivityItem } from '@/types/parent';
import type { LinkedChild as APILinkedChild, ActivityItem as APIActivity } from '@/lib/api';

/**
 * Maps backend API data to the ChildCardData shape used by ChildList/ChildCard.
 */
function mapToChildCardData(
  children: APILinkedChild[],
  activities: APIActivity[]
): ChildCardData[] {
  return children.map((child) => ({
    child: {
      id: child.id,
      displayName: child.displayName || child.email.split('@')[0] || 'Child',
      avatarUrl: child.avatarUrl,
      email: child.email,
      role: 'child' as const,
      linkedAt: child.linkedAt,
      consentGiven: child.parentalConsentGiven,
    },
    summary: {
      childId: child.id,
      totalXP: 0,
      sessionsCompleted: 0,
      topicsStarted: 0,
      topicsMastered: 0,
      averageAccuracy: 0,
      totalTimeSpentMs: 0,
      lastActiveAt: null,
      currentStreak: 0,
      longestStreak: 0,
    },
    recentActivity: activities
      .filter((a) => a.childId === child.id)
      .slice(0, 3)
      .map((a) => ({
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
      })),
  }));
}

function mapActivities(activities: APIActivity[]): ParentActivityItem[] {
  return activities.map((a) => ({
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
}

export default function ParentDashboardPage() {
  const { data: session } = useSession();
  const { children, activities, isLoading } = useParentDashboard();
  const [showNotifications, setShowNotifications] = React.useState(false);

  const userName = session?.user?.displayName?.split(' ')[0] || 'Parent';

  const handleAddChild = () => {
    alert('Add child functionality coming soon! This will allow you to link your children\'s accounts.');
  };

  const childCardData = mapToChildCardData(children, activities);
  const mappedActivities = mapActivities(activities);

  if (isLoading) {
    return (
      <main className="parent-dashboard-page">
        <div className="parent-dashboard-container">
          <div className="parent-dashboard-loading">
            <div className="parent-dashboard-loading-spinner" />
            <p>Loading your family dashboard...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="parent-dashboard-page">
      <div className="parent-dashboard-container">
        {/* Header */}
        <header className="parent-dashboard-header">
          <div className="parent-dashboard-header-content">
            <h1 className="parent-dashboard-title">
              Welcome, {userName}!
            </h1>
            <p className="parent-dashboard-subtitle">
              Monitor your children&apos;s learning progress and achievements
            </p>
          </div>
          <div className="parent-dashboard-header-actions">
            <button
              className="btn btn-secondary btn-icon"
              onClick={() => setShowNotifications(true)}
              title="Notification Settings"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </button>
            <button className="btn btn-primary" onClick={handleAddChild}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Child
            </button>
          </div>
        </header>

        {/* Children Section */}
        <section className="parent-dashboard-section">
          <div className="parent-dashboard-section-header">
            <h2 className="parent-dashboard-section-title">Your Children</h2>
            <span className="parent-dashboard-section-count">
              {children.length} linked
            </span>
          </div>
          <ChildList
            children={childCardData}
            isLoading={isLoading}
            onAddChild={handleAddChild}
          />
        </section>

        {/* Activity Feed Section */}
        <section className="parent-dashboard-section parent-dashboard-activity">
          <ActivityFeed
            activities={mappedActivities}
            maxItems={8}
            showChildName={true}
            isLoading={isLoading}
          />
        </section>

        {/* Quick Tips Section */}
        <section className="parent-dashboard-section parent-dashboard-tips">
          <h2 className="parent-dashboard-section-title">Parent Tips</h2>
          <div className="parent-tips-grid">
            <div className="parent-tip-card">
              <div className="parent-tip-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="parent-tip-content">
                <h3>Regular Practice</h3>
                <p>Encourage 15-20 minutes of daily practice for best results</p>
              </div>
            </div>
            <div className="parent-tip-card">
              <div className="parent-tip-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
              </div>
              <div className="parent-tip-content">
                <h3>Celebrate Progress</h3>
                <p>Acknowledge achievements and streaks to keep motivation high</p>
              </div>
            </div>
            <div className="parent-tip-card">
              <div className="parent-tip-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="parent-tip-content">
                <h3>Review Together</h3>
                <p>Check progress weekly and discuss areas for improvement</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Notification Settings Modal */}
      <NotificationSettings
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </main>
  );
}
