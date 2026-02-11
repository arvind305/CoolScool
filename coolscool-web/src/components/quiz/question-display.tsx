'use client';

import { forwardRef, useState, useCallback } from 'react';
import { SpeakerButton } from './speaker-button';
import { FlagButton } from './flag-button';

// ============================================================
// QuestionDisplay Component
// ============================================================

export interface QuestionDisplayProps {
  /** Current question number (1-indexed) */
  questionNumber: number;
  /** Total number of questions in the session */
  totalQuestions: number;
  /** The question text to display */
  questionText: string;
  /** Pass answer options for reading */
  answerTexts?: string[];
  /** Optional className for the container */
  className?: string;
  /** Callback when flag button is clicked */
  onFlagClick?: () => void;
  /** Whether this question has already been flagged */
  isFlagged?: boolean;
  /** Optional image URL for the question */
  imageUrl?: string;
}

/**
 * Displays the current question with a numbered badge and styled text container.
 * Uses CSS classes: .question-number, .question-text
 */
export const QuestionDisplay = forwardRef<HTMLDivElement, QuestionDisplayProps>(
  function QuestionDisplay(
    { questionNumber, totalQuestions, questionText, answerTexts, className = '', onFlagClick, isFlagged, imageUrl },
    ref
  ) {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [zoomOpen, setZoomOpen] = useState(false);

    const handleImageLoad = useCallback(() => setImageLoaded(true), []);
    const handleImageError = useCallback(() => {
      setImageError(true);
      setImageLoaded(true);
    }, []);

    return (
      <div
        ref={ref}
        className={`question-container ${className}`.trim()}
        role="region"
        aria-label={`Question ${questionNumber} of ${totalQuestions}`}
      >
        <div className="question-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--spacing-md)' }}>
          <span className="question-number" aria-hidden="true" style={{ marginBottom: 0 }}>
            Question {questionNumber}
          </span>
          <SpeakerButton
            questionText={questionText}
            answerTexts={answerTexts}
          />
          {onFlagClick && (
            <FlagButton
              onClick={onFlagClick}
              isFlagged={isFlagged || false}
            />
          )}
        </div>

        {/* Question Image (between header and text) */}
        {imageUrl && !imageError && (
          <div className="question-image">
            {!imageLoaded && (
              <div className="question-image-loading" aria-label="Loading image" />
            )}
            <img
              src={imageUrl}
              alt="Question diagram"
              onLoad={handleImageLoad}
              onError={handleImageError}
              onClick={() => setZoomOpen(true)}
              style={{ display: imageLoaded ? 'block' : 'none', cursor: 'zoom-in' }}
            />
          </div>
        )}

        <p className="question-text" id="question-text">
          {questionText}
        </p>

        {/* Zoom Modal */}
        {zoomOpen && imageUrl && (
          <div
            className="question-image-zoom"
            onClick={() => setZoomOpen(false)}
            role="dialog"
            aria-label="Enlarged question image"
          >
            <button
              className="question-image-zoom-close"
              onClick={() => setZoomOpen(false)}
              aria-label="Close enlarged image"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <img src={imageUrl} alt="Question diagram (enlarged)" />
          </div>
        )}
      </div>
    );
  }
);

// Styles for this component (add to globals.css or a CSS module)
// These match the reference styles.css lines 926-950
const styles = `
.question-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: var(--container-sm);
  margin: 0 auto;
  width: 100%;
}

.question-number {
  display: inline-block;
  font-size: var(--font-size-xs);
  color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-md);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-primary-subtle);
  border-radius: var(--radius-md);
  width: fit-content;
}

.question-text {
  font-size: var(--font-size-xl);
  line-height: var(--line-height-relaxed);
  margin-bottom: var(--spacing-xl);
  color: var(--color-text);
  font-weight: var(--font-weight-medium);
  padding: var(--spacing-lg);
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  border-left: 4px solid var(--color-primary);
  box-shadow: var(--shadow-sm);
}
`;

export default QuestionDisplay;
