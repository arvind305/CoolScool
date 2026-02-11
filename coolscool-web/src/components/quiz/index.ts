/**
 * Quiz Session Components
 *
 * Components for the quiz session view including question display,
 * answer options, timer, progress bar, header, and feedback.
 */

// Question display with numbered badge
export { QuestionDisplay } from './question-display';
export type { QuestionDisplayProps } from './question-display';

// Answer options for MCQ, True/False, Fill-blank, Ordering
export { AnswerOptions } from './answer-options';
export type { AnswerOptionsProps, MCQOption, AnswerState } from './answer-options';

// Timer display with warning state
export { Timer } from './timer';
export type { TimerProps } from './timer';

// Quiz progress bar
export { QuizProgress } from './quiz-progress';
export type { QuizProgressProps } from './quiz-progress';

// Quiz header with topic name, timer, and progress
export { QuizHeader } from './quiz-header';
export type { QuizHeaderProps } from './quiz-header';

// Correct/incorrect feedback display
export { Feedback } from './feedback';
export type { FeedbackProps } from './feedback';

// Time mode selection modal
export { TimeModeModal } from './time-mode-modal';
export type { TimeModeModalProps, TimeModeOption } from './time-mode-modal';

// Quiz summary display
export { QuizSummary } from './quiz-summary';
export type { QuizSummaryProps } from './quiz-summary';

// Flag button for reporting question issues
export { FlagButton } from './flag-button';
export type { FlagButtonProps } from './flag-button';

// Flag modal for submitting flag details
export { FlagModal } from './flag-modal';
export type { FlagModalProps } from './flag-modal';
