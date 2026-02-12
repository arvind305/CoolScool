import { render, screen } from '@testing-library/react';
import { StreakBadge } from './streak-badge';

describe('StreakBadge', () => {
  it('renders nothing when streak is 0', () => {
    const { container } = render(
      <StreakBadge currentStreak={0} longestStreak={5} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders current streak with singular day', () => {
    render(<StreakBadge currentStreak={1} longestStreak={1} />);

    expect(screen.getByText('1 day')).toBeInTheDocument();
    expect(screen.getByText('streak')).toBeInTheDocument();
  });

  it('renders current streak with plural days', () => {
    render(<StreakBadge currentStreak={5} longestStreak={5} />);

    expect(screen.getByText('5 days')).toBeInTheDocument();
  });

  it('shows best streak when longest exceeds current', () => {
    render(<StreakBadge currentStreak={3} longestStreak={10} />);

    expect(screen.getByText('3 days')).toBeInTheDocument();
    expect(screen.getByText('Best: 10')).toBeInTheDocument();
  });

  it('does not show best streak when equal to current', () => {
    render(<StreakBadge currentStreak={5} longestStreak={5} />);

    expect(screen.queryByText(/Best:/)).not.toBeInTheDocument();
  });
});
