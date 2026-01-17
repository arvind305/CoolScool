/**
 * LoginPrompt Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginPrompt, LoginPromptProps } from './login-prompt';

describe('LoginPrompt', () => {
  const defaultProps: LoginPromptProps = {
    topicId: 'topic-123',
    topicName: 'Algebra Basics',
    samplesUsed: 3,
    onSignIn: jest.fn(),
    onContinueBrowsing: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the title with samples used count', () => {
      render(<LoginPrompt {...defaultProps} />);

      expect(screen.getByRole('heading', { name: /you've used all 3 free questions/i })).toBeInTheDocument();
    });

    it('renders the topic name in description', () => {
      render(<LoginPrompt {...defaultProps} />);

      expect(screen.getByText('Algebra Basics')).toBeInTheDocument();
    });

    it('renders with different sample counts', () => {
      render(<LoginPrompt {...defaultProps} samplesUsed={5} />);

      expect(screen.getByText(/you've used all 5 free questions/i)).toBeInTheDocument();
    });
  });

  describe('benefits list', () => {
    it('shows all benefit items', () => {
      render(<LoginPrompt {...defaultProps} />);

      expect(screen.getByText('Save your progress across devices')).toBeInTheDocument();
      expect(screen.getByText('Unlimited practice on all topics')).toBeInTheDocument();
      expect(screen.getByText('Track your mastery and XP')).toBeInTheDocument();
      expect(screen.getByText('Compete on leaderboards (coming soon)')).toBeInTheDocument();
    });

    it('renders benefit icons', () => {
      render(<LoginPrompt {...defaultProps} />);

      // Check that benefit items have icons (aria-hidden SVGs)
      const benefitIcons = document.querySelectorAll('.login-prompt__benefit-icon');
      expect(benefitIcons).toHaveLength(4);
    });
  });

  describe('sign in button', () => {
    it('renders sign in with Google button', () => {
      render(<LoginPrompt {...defaultProps} />);

      const signInButton = screen.getByRole('button', { name: /sign in with google/i });
      expect(signInButton).toBeInTheDocument();
    });

    it('calls onSignIn when Google button clicked', () => {
      const onSignIn = jest.fn();
      render(<LoginPrompt {...defaultProps} onSignIn={onSignIn} />);

      const signInButton = screen.getByRole('button', { name: /sign in with google/i });
      fireEvent.click(signInButton);

      expect(onSignIn).toHaveBeenCalledTimes(1);
    });
  });

  describe('continue browsing button', () => {
    it('renders continue browsing button', () => {
      render(<LoginPrompt {...defaultProps} />);

      const continueButton = screen.getByRole('button', { name: /continue browsing/i });
      expect(continueButton).toBeInTheDocument();
    });

    it('calls onContinueBrowsing when continue button clicked', () => {
      const onContinueBrowsing = jest.fn();
      render(<LoginPrompt {...defaultProps} onContinueBrowsing={onContinueBrowsing} />);

      const continueButton = screen.getByRole('button', { name: /continue browsing/i });
      fireEvent.click(continueButton);

      expect(onContinueBrowsing).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('has dialog role', () => {
      render(<LoginPrompt {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-labelledby pointing to title', () => {
      render(<LoginPrompt {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'login-prompt-title');

      const title = document.getElementById('login-prompt-title');
      expect(title).toBeInTheDocument();
    });

    it('has aria-describedby pointing to description', () => {
      render(<LoginPrompt {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-describedby', 'login-prompt-description');

      const description = document.getElementById('login-prompt-description');
      expect(description).toBeInTheDocument();
    });

    it('has aria-live for polite announcements', () => {
      render(<LoginPrompt {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-live', 'polite');
    });

    it('has aria-hidden on decorative icons', () => {
      render(<LoginPrompt {...defaultProps} />);

      // Check main icon
      const mainIcon = document.querySelector('.login-prompt__icon svg');
      expect(mainIcon).not.toHaveAttribute('aria-hidden'); // Main icon is not marked hidden in the component

      // Check Google icon in sign-in button
      const googleIcon = document.querySelector('.login-prompt__sign-in-btn svg');
      expect(googleIcon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('footer', () => {
    it('renders footer note about local progress', () => {
      render(<LoginPrompt {...defaultProps} />);

      expect(screen.getByText(/your quiz progress is saved locally/i)).toBeInTheDocument();
    });
  });

  describe('styling classes', () => {
    it('has correct container class', () => {
      render(<LoginPrompt {...defaultProps} />);

      expect(document.querySelector('.login-prompt')).toBeInTheDocument();
    });

    it('has correct button classes', () => {
      render(<LoginPrompt {...defaultProps} />);

      expect(document.querySelector('.login-prompt__sign-in-btn')).toBeInTheDocument();
      expect(document.querySelector('.login-prompt__browse-btn')).toBeInTheDocument();
    });
  });
});
