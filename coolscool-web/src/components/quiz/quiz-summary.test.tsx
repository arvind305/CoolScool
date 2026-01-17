/**
 * QuizSummary Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuizSummary, QuizSummaryProps } from './quiz-summary';
import type { SessionSummary, ProficiencyBand } from '@/lib/quiz-engine/types';

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock the quiz-engine module
jest.mock('@/lib/quiz-engine/quiz-engine', () => ({
  getBandMessage: jest.fn((band: ProficiencyBand) => {
    const messages: Record<ProficiencyBand, string> = {
      not_started: 'Start your journey!',
      building_familiarity: 'You are building familiarity with this topic.',
      growing_confidence: 'Your confidence is growing!',
      consistent_understanding: 'You have consistent understanding.',
      exam_ready: 'You are exam ready!',
    };
    return messages[band] || 'Keep practicing!';
  }),
}));

describe('QuizSummary', () => {
  const createMockSummary = (overrides: Partial<SessionSummary> = {}): SessionSummary => ({
    session_id: 'session-123',
    topic_id: 'topic-456',
    topic_name: 'Algebra Basics',
    time_mode: 'unlimited',
    status: 'completed',
    total_questions: 10,
    questions_answered: 8,
    questions_correct: 6,
    questions_skipped: 2,
    xp_earned: 150,
    time_elapsed_ms: 185000, // 3:05
    started_at: '2024-01-15T10:00:00Z',
    completed_at: '2024-01-15T10:03:05Z',
    ...overrides,
  });

  const defaultProps: QuizSummaryProps = {
    summary: createMockSummary(),
    proficiency: {
      band: 'growing_confidence',
      label: 'Growing Confidence',
    },
    onPracticeAgain: jest.fn(),
    onChooseTopic: jest.fn(),
    isAuthenticated: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering stats', () => {
    it('displays questions answered', () => {
      render(<QuizSummary {...defaultProps} />);

      const answered = screen.getByText('8');
      expect(answered).toBeInTheDocument();
      expect(screen.getByText('Answered')).toBeInTheDocument();
    });

    it('displays questions correct', () => {
      render(<QuizSummary {...defaultProps} />);

      const correct = screen.getByText('6');
      expect(correct).toBeInTheDocument();
      expect(screen.getByText('Correct')).toBeInTheDocument();
    });

    it('displays XP earned with plus sign', () => {
      render(<QuizSummary {...defaultProps} />);

      expect(screen.getByText('+150')).toBeInTheDocument();
      expect(screen.getByText('XP Earned')).toBeInTheDocument();
    });

    it('displays topic name', () => {
      render(<QuizSummary {...defaultProps} />);

      expect(screen.getByText('Algebra Basics')).toBeInTheDocument();
    });

    it('displays session complete title', () => {
      render(<QuizSummary {...defaultProps} />);

      expect(screen.getByRole('heading', { name: /session complete/i })).toBeInTheDocument();
    });
  });

  describe('time display', () => {
    it('displays time formatted correctly (minutes:seconds)', () => {
      render(<QuizSummary {...defaultProps} />);

      // 185000ms = 3:05
      expect(screen.getByText('3:05')).toBeInTheDocument();
      expect(screen.getByText('Time')).toBeInTheDocument();
    });

    it('pads seconds with leading zero', () => {
      const summary = createMockSummary({ time_elapsed_ms: 65000 }); // 1:05
      render(<QuizSummary {...defaultProps} summary={summary} />);

      expect(screen.getByText('1:05')).toBeInTheDocument();
    });

    it('shows 0:00 for zero time', () => {
      const summary = createMockSummary({ time_elapsed_ms: 0 });
      render(<QuizSummary {...defaultProps} summary={summary} />);

      expect(screen.getByText('0:00')).toBeInTheDocument();
    });

    it('shows correct time for exactly one minute', () => {
      const summary = createMockSummary({ time_elapsed_ms: 60000 });
      render(<QuizSummary {...defaultProps} summary={summary} />);

      expect(screen.getByText('1:00')).toBeInTheDocument();
    });

    it('handles large times correctly', () => {
      const summary = createMockSummary({ time_elapsed_ms: 3723000 }); // 62:03
      render(<QuizSummary {...defaultProps} summary={summary} />);

      expect(screen.getByText('62:03')).toBeInTheDocument();
    });
  });

  describe('proficiency display', () => {
    it('displays proficiency level label', () => {
      render(<QuizSummary {...defaultProps} />);

      expect(screen.getByText('Growing Confidence')).toBeInTheDocument();
    });

    it('displays proficiency message from getBandMessage', () => {
      render(<QuizSummary {...defaultProps} />);

      expect(screen.getByText('Your confidence is growing!')).toBeInTheDocument();
    });

    it('shows correct band class', () => {
      render(<QuizSummary {...defaultProps} />);

      const bandElement = document.getElementById('summary-proficiency-band');
      expect(bandElement).toHaveClass('growing-confidence');
    });

    it('handles different proficiency bands', () => {
      render(
        <QuizSummary
          {...defaultProps}
          proficiency={{ band: 'exam_ready', label: 'Exam Ready' }}
        />
      );

      expect(screen.getByText('Exam Ready')).toBeInTheDocument();
      expect(screen.getByText('You are exam ready!')).toBeInTheDocument();

      const bandElement = document.getElementById('summary-proficiency-band');
      expect(bandElement).toHaveClass('exam-ready');
    });
  });

  describe('authentication prompt', () => {
    it('shows auth prompt when isAuthenticated=false', () => {
      render(<QuizSummary {...defaultProps} isAuthenticated={false} />);

      expect(screen.getByText(/sign in to save your progress/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
    });

    it('hides auth prompt when isAuthenticated=true', () => {
      render(<QuizSummary {...defaultProps} isAuthenticated={true} />);

      expect(screen.queryByText(/sign in to save your progress/i)).not.toBeInTheDocument();
    });

    it('shows auth prompt when isAuthenticated is undefined (treated as anonymous)', () => {
      const { isAuthenticated: _, ...propsWithoutAuth } = defaultProps;
      render(<QuizSummary {...propsWithoutAuth} />);

      // When isAuthenticated is undefined, treat as anonymous and show prompt
      expect(screen.getByText(/sign in to save your progress/i)).toBeInTheDocument();
    });

    it('sign in link points to /login', () => {
      render(<QuizSummary {...defaultProps} isAuthenticated={false} />);

      const signInLink = screen.getByRole('link', { name: /sign in/i });
      expect(signInLink).toHaveAttribute('href', '/login');
    });
  });

  describe('action buttons', () => {
    it('renders Practice Again button', () => {
      render(<QuizSummary {...defaultProps} />);

      expect(screen.getByRole('button', { name: /practice again/i })).toBeInTheDocument();
    });

    it('calls onPracticeAgain when Practice Again button clicked', () => {
      const onPracticeAgain = jest.fn();
      render(<QuizSummary {...defaultProps} onPracticeAgain={onPracticeAgain} />);

      const button = screen.getByRole('button', { name: /practice again/i });
      fireEvent.click(button);

      expect(onPracticeAgain).toHaveBeenCalledTimes(1);
    });

    it('renders Choose Topic button', () => {
      render(<QuizSummary {...defaultProps} />);

      expect(screen.getByRole('button', { name: /choose topic/i })).toBeInTheDocument();
    });

    it('calls onChooseTopic when Choose Topic button clicked', () => {
      const onChooseTopic = jest.fn();
      render(<QuizSummary {...defaultProps} onChooseTopic={onChooseTopic} />);

      const button = screen.getByRole('button', { name: /choose topic/i });
      fireEvent.click(button);

      expect(onChooseTopic).toHaveBeenCalledTimes(1);
    });
  });

  describe('element IDs', () => {
    it('has correct IDs for stats elements', () => {
      render(<QuizSummary {...defaultProps} />);

      expect(document.getElementById('stat-answered')).toBeInTheDocument();
      expect(document.getElementById('stat-correct')).toBeInTheDocument();
      expect(document.getElementById('stat-xp')).toBeInTheDocument();
      expect(document.getElementById('stat-time')).toBeInTheDocument();
    });

    it('has correct IDs for proficiency elements', () => {
      render(<QuizSummary {...defaultProps} />);

      expect(document.getElementById('summary-proficiency-band')).toBeInTheDocument();
      expect(document.getElementById('summary-proficiency-message')).toBeInTheDocument();
    });

    it('has correct IDs for action buttons', () => {
      render(<QuizSummary {...defaultProps} />);

      expect(document.getElementById('practice-again-btn')).toBeInTheDocument();
      expect(document.getElementById('choose-topic-btn')).toBeInTheDocument();
    });
  });

  describe('styling classes', () => {
    it('has summary container class', () => {
      render(<QuizSummary {...defaultProps} />);

      expect(document.querySelector('.summary-container')).toBeInTheDocument();
    });

    it('has summary stats container', () => {
      render(<QuizSummary {...defaultProps} />);

      expect(document.querySelector('.summary-stats')).toBeInTheDocument();
    });

    it('has summary actions container', () => {
      render(<QuizSummary {...defaultProps} />);

      expect(document.querySelector('.summary-actions')).toBeInTheDocument();
    });
  });
});
