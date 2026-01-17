'use client';

import * as React from 'react';
import { StatCard } from './stat-card';

export interface ProgressOverviewProps {
  totalXP: number;
  sessionsCompleted: number;
  topicsStarted: number;
  topicsMastered: number;
  averageAccuracy: number;
  streakDays?: number;
}

export function ProgressOverview({
  totalXP,
  sessionsCompleted,
  topicsStarted,
  topicsMastered,
  averageAccuracy,
  streakDays = 0,
}: ProgressOverviewProps) {
  return (
    <div className="progress-overview">
      <h2 className="progress-overview-title">Your Progress</h2>
      <div className="progress-overview-grid">
        <StatCard
          label="Total XP"
          value={totalXP.toLocaleString()}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          }
        />
        <StatCard
          label="Sessions"
          value={sessionsCompleted}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />
        <StatCard
          label="Topics Started"
          value={topicsStarted}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          }
        />
        <StatCard
          label="Topics Mastered"
          value={topicsMastered}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="7" />
              <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
            </svg>
          }
        />
        <StatCard
          label="Accuracy"
          value={`${averageAccuracy}%`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          }
        />
        {streakDays > 0 && (
          <StatCard
            label="Day Streak"
            value={streakDays}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
              </svg>
            }
          />
        )}
      </div>
    </div>
  );
}

export default ProgressOverview;
