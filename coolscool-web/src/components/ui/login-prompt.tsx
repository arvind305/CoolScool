'use client';

/**
 * Login Prompt Component
 *
 * A compelling prompt shown when anonymous users exhaust their free samples.
 * Encourages sign-in while offering a graceful way to continue browsing.
 */

import { Button } from './button';

// ============================================
// TYPES
// ============================================

export interface LoginPromptProps {
  /** The topic ID for tracking */
  topicId: string;
  /** Human-readable topic name */
  topicName: string;
  /** Number of samples the user has used */
  samplesUsed: number;
  /** Callback when user clicks sign in */
  onSignIn: () => void;
  /** Callback when user clicks continue browsing */
  onContinueBrowsing: () => void;
}

// ============================================
// BENEFITS DATA
// ============================================

const SIGN_IN_BENEFITS = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    ),
    text: 'Save your progress across devices',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    text: 'Unlimited practice on all topics',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    text: 'Track your mastery and XP',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 9l6 6 6-6" />
        <line x1="12" y1="3" x2="12" y2="15" />
        <path d="M3 17h18" />
        <path d="M3 21h18" />
      </svg>
    ),
    text: 'Compete on leaderboards (coming soon)',
  },
];

// ============================================
// COMPONENT
// ============================================

export function LoginPrompt({
  topicName,
  samplesUsed,
  onSignIn,
  onContinueBrowsing,
}: LoginPromptProps) {
  return (
    <div
      className="login-prompt"
      role="dialog"
      aria-labelledby="login-prompt-title"
      aria-describedby="login-prompt-description"
      aria-live="polite"
    >
      {/* Icon */}
      <div className="login-prompt__icon">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      </div>

      {/* Title */}
      <h2 id="login-prompt-title" className="login-prompt__title">
        You&apos;ve used all {samplesUsed} free questions
      </h2>

      {/* Subtitle */}
      <p id="login-prompt-description" className="login-prompt__subtitle">
        for <strong>{topicName}</strong>
      </p>

      {/* Message */}
      <p className="login-prompt__message">
        Sign in to continue practicing and unlock all features:
      </p>

      {/* Benefits List */}
      <ul className="login-prompt__benefits">
        {SIGN_IN_BENEFITS.map((benefit, index) => (
          <li key={index} className="login-prompt__benefit">
            <span className="login-prompt__benefit-icon" aria-hidden="true">
              {benefit.icon}
            </span>
            <span className="login-prompt__benefit-text">{benefit.text}</span>
          </li>
        ))}
      </ul>

      {/* Actions */}
      <div className="login-prompt__actions">
        <Button
          variant="primary"
          onClick={onSignIn}
          className="login-prompt__sign-in-btn"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ marginRight: '8px' }}
            aria-hidden="true"
          >
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
        </Button>

        <Button
          variant="secondary"
          onClick={onContinueBrowsing}
          className="login-prompt__browse-btn"
        >
          Continue browsing
        </Button>
      </div>

      {/* Footer note */}
      <p className="login-prompt__footer">
        Your quiz progress is saved locally. Sign in to keep it forever!
      </p>
    </div>
  );
}

export default LoginPrompt;
