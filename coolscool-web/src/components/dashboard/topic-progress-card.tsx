'use client';

import * as React from 'react';
import Link from 'next/link';
import type { TopicProgress, ProficiencyBand } from '@/lib/quiz-engine/types';
import { ProficiencyBadge } from '@/components/topics/proficiency-badge';

export interface TopicProgressCardProps {
  topicId: string;
  topicName: string;
  themeName?: string;
  proficiencyBand: ProficiencyBand;
  proficiencyLabel: string;
  conceptsStarted: number;
  conceptsTotal: number;
  xpEarned: number;
  totalAttempts: number;
  lastAttemptedAt: string | null;
  board?: string;
  classLevel?: number;
  subject?: string;
}

function formatLastAttempt(dateString: string | null): string {
  if (!dateString) return 'Never practiced';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Practiced today';
  } else if (diffDays === 1) {
    return 'Practiced yesterday';
  } else if (diffDays < 7) {
    return `Practiced ${diffDays} days ago`;
  } else {
    return `Last practiced ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
}

export function TopicProgressCard({
  topicId,
  topicName,
  themeName,
  proficiencyBand,
  proficiencyLabel,
  conceptsStarted,
  conceptsTotal,
  xpEarned,
  totalAttempts,
  lastAttemptedAt,
  board = 'icse',
  classLevel = 5,
  subject = 'mathematics',
}: TopicProgressCardProps) {
  const progressPercent = conceptsTotal > 0 ? Math.round((conceptsStarted / conceptsTotal) * 100) : 0;
  const quizUrl = `/quiz?topic=${topicId}&board=${board}&class=${classLevel}&subject=${subject}`;

  return (
    <div className="topic-progress-card">
      <div className="topic-progress-card-header">
        <div className="topic-progress-card-info">
          {themeName && <span className="topic-progress-card-theme">{themeName}</span>}
          <h3 className="topic-progress-card-name">{topicName}</h3>
        </div>
        <ProficiencyBadge band={proficiencyBand} label={proficiencyLabel} />
      </div>

      <div className="topic-progress-card-progress">
        <div className="topic-progress-card-progress-bar">
          <div
            className="topic-progress-card-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="topic-progress-card-progress-label">
          {conceptsStarted}/{conceptsTotal} concepts
        </span>
      </div>

      <div className="topic-progress-card-stats">
        <div className="topic-progress-card-stat">
          <span className="topic-progress-card-stat-value">{xpEarned}</span>
          <span className="topic-progress-card-stat-label">XP</span>
        </div>
        <div className="topic-progress-card-stat">
          <span className="topic-progress-card-stat-value">{totalAttempts}</span>
          <span className="topic-progress-card-stat-label">Questions</span>
        </div>
      </div>

      <div className="topic-progress-card-footer">
        <span className="topic-progress-card-last-attempt">
          {formatLastAttempt(lastAttemptedAt)}
        </span>
        <Link href={quizUrl} className="btn btn-sm btn-primary">
          Practice
        </Link>
      </div>
    </div>
  );
}

export default TopicProgressCard;
