'use client';

import * as React from 'react';
import type { WeeklySummary } from '@/lib/api';

export interface WeeklySummaryCardProps {
  summary: WeeklySummary;
  isLoading?: boolean;
}

function DeltaBadge({ value, suffix = '' }: { value: number; suffix?: string }) {
  if (value === 0) {
    return <span className="delta-badge delta-neutral">--</span>;
  }
  const isPositive = value > 0;
  return (
    <span className={`delta-badge ${isPositive ? 'delta-positive' : 'delta-negative'}`}>
      {isPositive ? '+' : ''}{value}{suffix}
    </span>
  );
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function WeeklySummaryCard({ summary, isLoading = false }: WeeklySummaryCardProps) {
  if (isLoading) {
    return (
      <div className="weekly-summary-card">
        <h3 className="weekly-summary-title">This Week</h3>
        <div className="weekly-summary-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="weekly-summary-stat skeleton" />
          ))}
        </div>
      </div>
    );
  }

  const { currentWeek, deltas } = summary;

  return (
    <div className="weekly-summary-card">
      <h3 className="weekly-summary-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        This Week
      </h3>
      <div className="weekly-summary-grid">
        <div className="weekly-summary-stat">
          <span className="weekly-summary-stat-value">{currentWeek.sessionsCompleted}</span>
          <span className="weekly-summary-stat-label">Sessions</span>
          <DeltaBadge value={deltas.sessions} />
        </div>
        <div className="weekly-summary-stat">
          <span className="weekly-summary-stat-value">{currentWeek.questionsAnswered}</span>
          <span className="weekly-summary-stat-label">Questions</span>
          <DeltaBadge value={deltas.questions} />
        </div>
        <div className="weekly-summary-stat">
          <span className="weekly-summary-stat-value">{currentWeek.accuracy}%</span>
          <span className="weekly-summary-stat-label">Accuracy</span>
          <DeltaBadge value={deltas.accuracy} suffix="%" />
        </div>
        <div className="weekly-summary-stat">
          <span className="weekly-summary-stat-value">{currentWeek.xpEarned}</span>
          <span className="weekly-summary-stat-label">XP Earned</span>
          <DeltaBadge value={deltas.xp} />
        </div>
      </div>
      <div className="weekly-summary-time">
        <span className="weekly-summary-time-label">Practice time:</span>
        <span className="weekly-summary-time-value">{formatDuration(currentWeek.timeSpentMs)}</span>
      </div>
    </div>
  );
}

export default WeeklySummaryCard;
