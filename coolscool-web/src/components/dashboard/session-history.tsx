'use client';

import * as React from 'react';
import Link from 'next/link';
import type { SessionSummary } from '@/lib/quiz-engine/types';
import { ProficiencyBadge } from '@/components/topics/proficiency-badge';

export interface SessionHistoryProps {
  sessions: SessionSummary[];
  maxItems?: number;
  showViewAll?: boolean;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

export function SessionHistory({
  sessions,
  maxItems = 10,
  showViewAll = true,
}: SessionHistoryProps) {
  const displaySessions = sessions.slice(0, maxItems);

  if (sessions.length === 0) {
    return (
      <div className="session-history">
        <h2 className="session-history-title">Recent Sessions</h2>
        <div className="session-history-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <p>No practice sessions yet</p>
          <Link href="/browse" className="btn btn-primary">
            Start Practicing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="session-history">
      <div className="session-history-header">
        <h2 className="session-history-title">Recent Sessions</h2>
        {showViewAll && sessions.length > maxItems && (
          <button className="btn btn-ghost btn-sm">View All</button>
        )}
      </div>
      <div className="session-history-list">
        {displaySessions.map((session, index) => (
          <div key={session.session_id || index} className="session-history-item">
            <div className="session-history-item-main">
              <div className="session-history-item-topic">{session.topic_name}</div>
              <div className="session-history-item-meta">
                <span className="session-history-item-date">
                  {formatDate(session.started_at)}
                </span>
                <span className="session-history-item-separator">|</span>
                <span className="session-history-item-duration">
                  {formatDuration(session.time_elapsed_ms)}
                </span>
              </div>
            </div>
            <div className="session-history-item-stats">
              <div className="session-history-item-score">
                <span className="session-history-item-correct">{session.questions_correct}</span>
                <span className="session-history-item-total">/{session.questions_answered}</span>
              </div>
              <div className="session-history-item-xp">+{session.xp_earned} XP</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SessionHistory;
