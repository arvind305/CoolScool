'use client';

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
 */
export function SpeakerButton({
  questionText,
  answerTexts = [],
  className = '',
  disabled = false,
}: SpeakerButtonProps) {
  const { isSpeaking, isSupported, speakSequence, stop } = useSpeech();

  // Hide the button if speech synthesis is not supported
  if (!isSupported) {
    return null;
  }

  const handleClick = () => {
    if (isSpeaking) {
      stop();
    } else {
      // Build the sequence: question, "The options are:", then each answer
      const sequence = [questionText, 'The options are:', ...answerTexts];
      speakSequence(sequence);
    }
  };

  const buttonClassName = [
    'speaker-btn',
    isSpeaking ? 'speaking' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={handleClick}
      disabled={disabled}
      aria-label={isSpeaking ? 'Stop reading' : 'Read question aloud'}
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
        {/* Sound waves - animated when speaking */}
        <path className="sound-wave-1" d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path className="sound-wave-2" d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </svg>
    </button>
  );
}

export default SpeakerButton;
