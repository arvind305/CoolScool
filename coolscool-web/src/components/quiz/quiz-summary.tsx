'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { SessionSummary, ProficiencyBand } from '@/lib/quiz-engine/types';
import { getBandMessage } from '@/lib/quiz-engine/quiz-engine';

export interface QuizSummaryProps {
  summary: SessionSummary;
  proficiency: {
    band: ProficiencyBand;
    label: string;
  };
  onPracticeAgain: () => void;
  onChooseTopic: () => void;
  /** Whether the user is authenticated */
  isAuthenticated?: boolean;
  /** Topic-level canonical explanation for post-test summary */
  canonicalExplanation?: string;
}

function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function QuizSummary({
  summary,
  proficiency,
  onPracticeAgain,
  onChooseTopic,
  isAuthenticated,
  canonicalExplanation,
}: QuizSummaryProps) {
  const bandClass = proficiency.band.replace(/_/g, '-');
  const bandMessage = getBandMessage(proficiency.band);

  return (
    <div className="summary-container">
      <div className="summary-header">
        <h1 className="summary-title">Session Complete</h1>
        <p className="summary-topic" id="summary-topic-name">
          {summary.topic_name}
        </p>
      </div>

      <div className="summary-stats">
        <div className="summary-stat">
          <div className="summary-stat-value" id="stat-answered">
            {summary.questions_answered}
          </div>
          <div className="summary-stat-label">Answered</div>
        </div>
        <div className="summary-stat">
          <div className="summary-stat-value" id="stat-correct">
            {summary.questions_correct}
          </div>
          <div className="summary-stat-label">Correct</div>
        </div>
        <div className="summary-stat">
          <div className="summary-stat-value" id="stat-xp">
            +{summary.xp_earned}
          </div>
          <div className="summary-stat-label">XP Earned</div>
        </div>
        <div className="summary-stat">
          <div className="summary-stat-value" id="stat-time">
            {formatTime(summary.time_elapsed_ms)}
          </div>
          <div className="summary-stat-label">Time</div>
        </div>
      </div>

      {/* Soft prompt for anonymous users */}
      {!isAuthenticated && (
        <div className="summary-signin-prompt">
          <div className="summary-signin-prompt-icon">
            {/* Bookmark/save icon */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="summary-signin-prompt-content">
            <p className="summary-signin-prompt-text">
              Sign in to save your progress and continue your learning journey!
            </p>
            <Link href="/login" className="summary-signin-prompt-link">
              Sign in
            </Link>
          </div>
        </div>
      )}

      <div className="summary-proficiency">
        <div className="summary-proficiency-title">Your Proficiency</div>
        <span
          className={`proficiency-band-large ${bandClass}`}
          id="summary-proficiency-band"
        >
          {proficiency.label}
        </span>
        <p className="summary-proficiency-message" id="summary-proficiency-message">
          {bandMessage}
        </p>
      </div>

      {canonicalExplanation && (
        <div className="summary-key-concepts">
          <div className="summary-key-concepts-title">Key Concepts</div>
          <p className="summary-key-concepts-text">{canonicalExplanation}</p>
        </div>
      )}

      <div className="summary-actions">
        <Button
          variant="primary"
          onClick={onPracticeAgain}
          id="practice-again-btn"
        >
          Practice Again
        </Button>
        <Button
          variant="secondary"
          onClick={onChooseTopic}
          id="choose-topic-btn"
        >
          Choose Topic
        </Button>
      </div>
    </div>
  );
}

export default QuizSummary;
