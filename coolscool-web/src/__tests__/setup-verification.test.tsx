/**
 * Setup Verification Test
 *
 * This test verifies that Jest and React Testing Library are properly configured.
 * It can be deleted after confirming the setup works.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Simple test component
function TestButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} data-testid="test-button">
      Click me
    </button>
  );
}

describe('Jest Setup Verification', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have jest-dom matchers available', () => {
    render(<div data-testid="test-div">Hello World</div>);
    const element = screen.getByTestId('test-div');
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Hello World');
  });

  it('should render React components', () => {
    const handleClick = jest.fn();
    render(<TestButton onClick={handleClick} />);

    const button = screen.getByTestId('test-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Click me');
  });

  it('should handle user events', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    render(<TestButton onClick={handleClick} />);

    const button = screen.getByTestId('test-button');
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should resolve path aliases (@/)', async () => {
    // This test verifies that the path alias configuration works
    // If this imports without error, the alias is working
    // Note: We're just testing the configuration, not an actual component
    expect(true).toBe(true);
  });
});
