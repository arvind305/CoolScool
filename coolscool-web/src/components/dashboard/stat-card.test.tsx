import { render, screen } from '@testing-library/react';
import { StatCard } from './stat-card';

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Total XP" value={500} />);

    expect(screen.getByText('Total XP')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('renders string value', () => {
    render(<StatCard label="Accuracy" value="75%" />);

    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(
      <StatCard
        label="Score"
        value={100}
        icon={<span data-testid="test-icon">icon</span>}
      />
    );

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('renders positive trend', () => {
    render(
      <StatCard
        label="XP"
        value={500}
        trend={{ value: 12, label: 'vs last week', positive: true }}
      />
    );

    expect(screen.getByText('+12')).toBeInTheDocument();
    expect(screen.getByText('vs last week')).toBeInTheDocument();
  });

  it('renders neutral trend (no positive indicator)', () => {
    render(
      <StatCard
        label="Questions"
        value={50}
        trend={{ value: -5, label: 'vs last week', positive: false }}
      />
    );

    expect(screen.getByText('-5')).toBeInTheDocument();
  });

  it('does not render trend when not provided', () => {
    const { container } = render(<StatCard label="Test" value={0} />);

    expect(container.querySelector('.stat-card-trend')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <StatCard label="Test" value={0} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('stat-card', 'custom-class');
  });
});
