'use client';

import { useState } from 'react';
import { useSpeech } from '@/hooks';

// ============================================================
// SpeakerButton Component
// ============================================================

export interface SpeakerButtonProps {
  /** The question text to read aloud */
  questionText: string;
  /** Array of answer option texts to read after question */
  answerTexts?: string[];
  /** Optional className for the button */
  className?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
}

/**
 * A button that reads the question and answer options aloud using speech synthesis.
 * Uses CSS classes: .speaker-btn, .speaking (when active)
 * Sound wave animations are controlled via CSS classes: .sound-wave-1, .sound-wave-2
 * Shows a tooltip with fallback message if speech is not supported.
 */
export function SpeakerButton({
  questionText,
  answerTexts = [],
  className = '',
  disabled = false,
}: SpeakerButtonProps) {
  const { isSpeaking, isSupported, speakSequence, stop } = useSpeech();
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = () => {
    // If not supported, show tooltip briefly
    if (!isSupported) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000);
      return;
    }

    if (isSpeaking) {
      stop();
    } else {
      // Filter out empty or whitespace-only texts
      const validAnswerTexts = answerTexts.filter(t => t && t.trim().length > 0);
      // Build the sequence: question, then optionally "The options are:" with answers
      const sequence = validAnswerTexts.length > 0
        ? [questionText, 'The options are:', ...validAnswerTexts]
        : [questionText];
      speakSequence(sequence);
    }
  };

  const buttonClassName = [
    'speaker-btn',
    isSpeaking ? 'speaking' : '',
    !isSupported ? 'unsupported' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="speaker-btn-wrapper">
      <button
        type="button"
        className={buttonClassName}
        onClick={handleClick}
        disabled={disabled}
        aria-label={
          !isSupported
            ? 'Voice not available on this device'
            : isSpeaking
              ? 'Stop reading'
              : 'Read question aloud'
        }
        title={!isSupported ? 'Voice not available on this device' : undefined}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          {/* Speaker body */}
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          {/* Sound waves - animated when speaking, or crossed out if unsupported */}
          {isSupported ? (
            <>
              <path className="sound-wave-1" d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path className="sound-wave-2" d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </>
          ) : (
            /* X mark for unsupported */
            <path className="speaker-x" d="M22 2L14 10M14 2L22 10" strokeLinecap="round" />
          )}
        </svg>
      </button>
      {/* Tooltip for unsupported devices */}
      {showTooltip && (
        <div className="speaker-tooltip" role="alert">
          Voice not available on this device
        </div>
      )}
    </div>
  );
}

export default SpeakerButton;
