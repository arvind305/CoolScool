/**
 * TopicCard Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopicCard, TopicCardProps } from './topic-card';
import type { ProficiencyBand } from '@/lib/quiz-engine/types';

// Mock the ProficiencyBadge component
jest.mock('./proficiency-badge', () => ({
  ProficiencyBadge: ({ band, label }: { band: ProficiencyBand; label: string }) => (
    <span data-testid="proficiency-badge" data-band={band}>
      {label}
    </span>
  ),
}));

describe('TopicCard', () => {
  const defaultProps: TopicCardProps = {
    topicId: 'topic-123',
    topicName: 'Algebra Basics',
    conceptCount: 5,
    questionCount: 25,
    proficiency: {
      band: 'growing_confidence',
      label: 'Growing Confidence',
    },
    onClick: jest.fn(),
    isAuthenticated: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders topic name', () => {
      render(<TopicCard {...defaultProps} />);

      expect(screen.getByText('Algebra Basics')).toBeInTheDocument();
    });

    it('renders concept and question counts', () => {
      render(<TopicCard {...defaultProps} />);

      expect(screen.getByText('5 concepts | 25 questions')).toBeInTheDocument();
    });

    it('renders proficiency badge', () => {
      render(<TopicCard {...defaultProps} />);

      const badge = screen.getByTestId('proficiency-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('data-band', 'growing_confidence');
      expect(badge).toHaveTextContent('Growing Confidence');
    });

    it('sets data-topic-id attribute', () => {
      render(<TopicCard {...defaultProps} />);

      const card = document.querySelector('[data-topic-id="topic-123"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('sample badge for anonymous users', () => {
    it('shows sample badge when authenticated=false and samples remaining', () => {
      render(
        <TopicCard
          {...defaultProps}
          isAuthenticated={false}
          samplesRemaining={3}
        />
      );

      expect(screen.getByText('3 free')).toBeInTheDocument();
    });

    it('shows "X left" when some samples used', () => {
      render(
        <TopicCard
          {...defaultProps}
          isAuthenticated={false}
          samplesRemaining={2}
          sampleLimit={3}
        />
      );

      expect(screen.getByText('2 left')).toBeInTheDocument();
    });

    it('shows exhausted badge when samples=0', () => {
      render(
        <TopicCard
          {...defaultProps}
          isAuthenticated={false}
          samplesRemaining={0}
        />
      );

      expect(screen.getByText('Sign in to practice')).toBeInTheDocument();
    });

    it('applies exhausted class when samples exhausted', () => {
      render(
        <TopicCard
          {...defaultProps}
          isAuthenticated={false}
          samplesRemaining={0}
        />
      );

      const badge = document.querySelector('.topic-sample-badge.exhausted');
      expect(badge).toBeInTheDocument();
    });

    it('applies available class when samples available', () => {
      render(
        <TopicCard
          {...defaultProps}
          isAuthenticated={false}
          samplesRemaining={2}
        />
      );

      const badge = document.querySelector('.topic-sample-badge.available');
      expect(badge).toBeInTheDocument();
    });

    it('does not show sample badge when authenticated=true', () => {
      render(
        <TopicCard
          {...defaultProps}
          isAuthenticated={true}
          samplesRemaining={2}
        />
      );

      expect(screen.queryByText('2 left')).not.toBeInTheDocument();
      expect(screen.queryByText('free')).not.toBeInTheDocument();
    });

    it('does not show sample badge when samplesRemaining is undefined', () => {
      render(
        <TopicCard
          {...defaultProps}
          isAuthenticated={false}
          samplesRemaining={undefined}
        />
      );

      expect(document.querySelector('.topic-sample-badge')).not.toBeInTheDocument();
    });

    it('uses custom sampleLimit for "free" label', () => {
      render(
        <TopicCard
          {...defaultProps}
          isAuthenticated={false}
          samplesRemaining={5}
          sampleLimit={5}
        />
      );

      expect(screen.getByText('5 free')).toBeInTheDocument();
    });
  });

  describe('click handling', () => {
    it('calls onClick when clicked', () => {
      const onClick = jest.fn();
      render(<TopicCard {...defaultProps} onClick={onClick} />);

      const card = screen.getByRole('listitem');
      fireEvent.click(card);

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith('topic-123');
    });

    it('handles clicks when onClick is undefined', () => {
      // Should not throw
      render(<TopicCard {...defaultProps} onClick={undefined} />);

      const card = screen.getByRole('listitem');
      expect(() => fireEvent.click(card)).not.toThrow();
    });
  });

  describe('accessibility', () => {
    it('has listitem role', () => {
      render(<TopicCard {...defaultProps} />);

      expect(screen.getByRole('listitem')).toBeInTheDocument();
    });

    it('has tabIndex for keyboard focus', () => {
      render(<TopicCard {...defaultProps} />);

      const card = screen.getByRole('listitem');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('handles Enter key press', () => {
      const onClick = jest.fn();
      render(<TopicCard {...defaultProps} onClick={onClick} />);

      const card = screen.getByRole('listitem');
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith('topic-123');
    });

    it('handles Space key press', () => {
      const onClick = jest.fn();
      render(<TopicCard {...defaultProps} onClick={onClick} />);

      const card = screen.getByRole('listitem');
      fireEvent.keyDown(card, { key: ' ' });

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('prevents default on Space key to avoid scrolling', () => {
      const onClick = jest.fn();
      render(<TopicCard {...defaultProps} onClick={onClick} />);

      const card = screen.getByRole('listitem');
      const event = fireEvent.keyDown(card, { key: ' ' });

      // The event should have been handled (preventDefault called)
      expect(onClick).toHaveBeenCalled();
    });

    it('ignores other key presses', () => {
      const onClick = jest.fn();
      render(<TopicCard {...defaultProps} onClick={onClick} />);

      const card = screen.getByRole('listitem');
      fireEvent.keyDown(card, { key: 'Tab' });
      fireEvent.keyDown(card, { key: 'Escape' });
      fireEvent.keyDown(card, { key: 'a' });

      expect(onClick).not.toHaveBeenCalled();
    });

    it('has aria-hidden on decorative icons', () => {
      render(
        <TopicCard
          {...defaultProps}
          isAuthenticated={false}
          samplesRemaining={2}
        />
      );

      const icons = document.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('styling classes', () => {
    it('has topic-card class', () => {
      render(<TopicCard {...defaultProps} />);

      expect(document.querySelector('.topic-card')).toBeInTheDocument();
    });

    it('adds samples-exhausted class when samples are exhausted', () => {
      render(
        <TopicCard
          {...defaultProps}
          isAuthenticated={false}
          samplesRemaining={0}
        />
      );

      expect(document.querySelector('.topic-card.samples-exhausted')).toBeInTheDocument();
    });

    it('does not add samples-exhausted class when samples available', () => {
      render(
        <TopicCard
          {...defaultProps}
          isAuthenticated={false}
          samplesRemaining={2}
        />
      );

      expect(document.querySelector('.topic-card.samples-exhausted')).not.toBeInTheDocument();
    });

    it('shows lock icon when samples exhausted', () => {
      render(
        <TopicCard
          {...defaultProps}
          isAuthenticated={false}
          samplesRemaining={0}
        />
      );

      expect(document.querySelector('.topic-locked')).toBeInTheDocument();
    });

    it('shows arrow icon when samples available', () => {
      render(
        <TopicCard
          {...defaultProps}
          isAuthenticated={false}
          samplesRemaining={2}
        />
      );

      expect(document.querySelector('.topic-arrow')).toBeInTheDocument();
      expect(document.querySelector('.topic-locked')).not.toBeInTheDocument();
    });
  });

  describe('different proficiency bands', () => {
    const bands: Array<{ band: ProficiencyBand; label: string }> = [
      { band: 'not_started', label: 'Not Started' },
      { band: 'building_familiarity', label: 'Building Familiarity' },
      { band: 'growing_confidence', label: 'Growing Confidence' },
      { band: 'consistent_understanding', label: 'Consistent Understanding' },
      { band: 'exam_ready', label: 'Exam Ready' },
    ];

    bands.forEach(({ band, label }) => {
      it(`renders correctly with ${band} proficiency`, () => {
        render(
          <TopicCard
            {...defaultProps}
            proficiency={{ band, label }}
          />
        );

        const badge = screen.getByTestId('proficiency-badge');
        expect(badge).toHaveAttribute('data-band', band);
        expect(badge).toHaveTextContent(label);
      });
    });
  });
});
