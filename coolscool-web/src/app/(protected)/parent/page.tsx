'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { ChildList } from '@/components/parent/child-list';
import { ActivityFeed } from '@/components/parent/activity-feed';
import { getParentDashboardData } from '@/services/parent-api';
import type { ParentDashboardData } from '@/types/parent';

export default function ParentDashboardPage() {
  const { data: session } = useSession();
  const [dashboardData, setDashboardData] = React.useState<ParentDashboardData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const userName = session?.user?.displayName?.split(' ')[0] || 'Parent';

  React.useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getParentDashboardData();
        setDashboardData(data);
      } catch (err) {
        setError('Failed to load dashboard data. Please try again.');
        console.error('Error loading parent dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const handleAddChild = () => {
    // TODO: Implement add child modal
    alert('Add child functionality coming soon! This will allow you to link your children\'s accounts.');
  };

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

  if (error) {
    return (
      <main className="parent-dashboard-page">
        <div className="parent-dashboard-container">
          <div className="parent-dashboard-error">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Try Again
            </button>
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
              {dashboardData?.children.length || 0} linked
            </span>
          </div>
          <ChildList
            children={dashboardData?.children || []}
            isLoading={isLoading}
            onAddChild={handleAddChild}
          />
        </section>

        {/* Activity Feed Section */}
        <section className="parent-dashboard-section parent-dashboard-activity">
          <ActivityFeed
            activities={dashboardData?.activityFeed || []}
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
    </main>
  );
}
