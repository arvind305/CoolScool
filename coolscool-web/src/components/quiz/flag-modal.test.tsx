import { render, screen, fireEvent } from '@testing-library/react';
import { FlagModal } from './flag-modal';

// Read the FlagModal component to understand its props
// It takes: open, onClose, onSubmit, isSubmitting, questionText

describe('FlagModal', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    isSubmitting: false,
    questionText: 'What is 2 + 2?',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when not open', () => {
    const { container } = render(<FlagModal {...defaultProps} open={false} />);

    // Modal should not render visible content
    expect(screen.queryByText('Report a Problem')).not.toBeInTheDocument();
  });

  it('renders modal when open', () => {
    render(<FlagModal {...defaultProps} />);

    expect(screen.getByText('Report a Problem')).toBeInTheDocument();
  });

  it('shows the prompt text', () => {
    render(<FlagModal {...defaultProps} />);

    expect(screen.getByText(/wrong with this question/i)).toBeInTheDocument();
  });

  it('shows all flag reason options', () => {
    render(<FlagModal {...defaultProps} />);

    expect(screen.getByText('Incorrect answer marked as correct')).toBeInTheDocument();
    expect(screen.getByText('Question is unclear or confusing')).toBeInTheDocument();
    expect(screen.getByText('Wrong grade level')).toBeInTheDocument();
    expect(screen.getByText('Wrong subject or topic')).toBeInTheDocument();
    expect(screen.getByText('Typo or grammatical error')).toBeInTheDocument();
    expect(screen.getByText('Other issue')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<FlagModal {...defaultProps} />);

    // Find and click the close button (X button or cancel)
    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('disables submit when no reason is selected', () => {
    render(<FlagModal {...defaultProps} />);

    const submitBtn = screen.getByText('Submit Report');
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit after selecting a reason', () => {
    render(<FlagModal {...defaultProps} />);

    // Click on a reason
    fireEvent.click(screen.getByText('Incorrect answer marked as correct'));

    const submitBtn = screen.getByText('Submit Report');
    expect(submitBtn).not.toBeDisabled();
  });

  it('shows loading state when submitting', () => {
    render(<FlagModal {...defaultProps} isSubmitting={true} />);

    // Submit button should show loading text
    expect(screen.getByText('Submitting...')).toBeInTheDocument();
  });
});
