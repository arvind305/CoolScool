'use client';

import * as React from 'react';
import type { ChildSession, SessionDetail } from '@/lib/api';
import { useSessionDetail } from '@/queries/use-parent-queries';

export interface SessionTimelineProps {
  sessions: ChildSession[];
  childId: string;
  isLoading?: boolean;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'In progress';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function SessionDetailView({ childId, sessionId }: { childId: string; sessionId: string }) {
  const { data: detail, isLoading } = useSessionDetail(childId, sessionId);

  if (isLoading) {
    return (
      <div className="session-detail-loading">
        <div className="session-detail-spinner" />
        <span>Loading answers...</span>
      </div>
    );
  }

  if (!detail || detail.answers.length === 0) {
    return (
      <div className="session-detail-empty">
        <p>No answer details available</p>
      </div>
    );
  }

  return (
    <div className="session-detail-answers">
      {detail.answers.map((answer, index) => (
        <div
          key={answer.questionId}
          className={`session-answer ${answer.isCorrect ? 'session-answer-correct' : 'session-answer-incorrect'}`}
        >
          <div className="session-answer-header">
            <span className="session-answer-number">Q{index + 1}</span>
            <span className={`session-answer-badge ${answer.isCorrect ? 'badge-correct' : 'badge-incorrect'}`}>
              {answer.isCorrect ? 'Correct' : 'Incorrect'}
            </span>
          </div>
          <p className="session-answer-question">{answer.questionText}</p>
          {!answer.isCorrect && (
            <div className="session-answer-options">
              <span className="session-answer-selected">
                Selected: {answer.selectedOption}
              </span>
              <span className="session-answer-correct-option">
                Correct: {answer.correctOption}
              </span>
            </div>
          )}
          {answer.explanation && (
            <p className="session-answer-explanation">{answer.explanation}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function SessionItem({ session, childId }: { session: ChildSession; childId: string }) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const accuracy = session.questionsAnswered > 0
    ? Math.round((session.questionsCorrect / session.questionsAnswered) * 100)
    : 0;

  return (
    <div className={`session-timeline-item ${isExpanded ? 'expanded' : ''}`}>
      <button
        className="session-timeline-header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <div className="session-timeline-left">
          <div className={`session-timeline-dot ${accuracy >= 70 ? 'dot-good' : accuracy >= 50 ? 'dot-fair' : 'dot-poor'}`} />
          <div className="session-timeline-info">
            <span className="session-timeline-topic">{session.topicName}</span>
            <span className="session-timeline-date">{formatDate(session.completedAt)}</span>
          </div>
        </div>
        <div className="session-timeline-right">
          <span className="session-timeline-score">
            {session.questionsCorrect}/{session.questionsAnswered}
          </span>
          <span className={`session-timeline-accuracy ${accuracy >= 70 ? 'acc-good' : accuracy >= 50 ? 'acc-fair' : 'acc-poor'}`}>
            {accuracy}%
          </span>
          <span className="session-timeline-xp">+{session.xpEarned} XP</span>
          <svg
            className={`session-timeline-chevron ${isExpanded ? 'rotated' : ''}`}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>
      {isExpanded && (
        <div className="session-timeline-detail">
          <div className="session-timeline-meta">
            <span>Duration: {formatDuration(session.timeElapsedMs)}</span>
            <span>Skipped: {session.questionsSkipped}</span>
            <span>Mode: {session.timeMode}</span>
          </div>
          <SessionDetailView childId={childId} sessionId={session.id} />
        </div>
      )}
    </div>
  );
}

export function SessionTimeline({ sessions, childId, isLoading = false }: SessionTimelineProps) {
  if (isLoading) {
    return (
      <div className="session-timeline">
        <h3 className="session-timeline-title">Session History</h3>
        <div className="session-timeline-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="session-timeline-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="session-timeline">
        <h3 className="session-timeline-title">Session History</h3>
        <div className="session-timeline-empty">
          <p>No sessions recorded yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="session-timeline">
      <h3 className="session-timeline-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        Session History ({sessions.length})
      </h3>
      <div className="session-timeline-list">
        {sessions.map((session) => (
          <SessionItem key={session.id} session={session} childId={childId} />
        ))}
      </div>
    </div>
  );
}

export default SessionTimeline;
