/**
 * Button Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  describe('rendering', () => {
    it('renders with default variant and size', () => {
      render(<Button>Click me</Button>);

      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('btn', 'btn-primary');
      // Default size has no additional class
      expect(button).not.toHaveClass('btn-sm', 'btn-lg', 'btn-icon');
    });

    it('renders children correctly', () => {
      render(<Button>Test Button</Button>);

      expect(screen.getByText('Test Button')).toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it('renders with primary variant', () => {
      render(<Button variant="primary">Primary</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-primary');
    });

    it('renders with secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-secondary');
    });

    it('renders with ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-ghost');
    });

    it('renders with ghost-light variant', () => {
      render(<Button variant="ghost-light">Ghost Light</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-ghost-light');
    });
  });

  describe('sizes', () => {
    it('renders with small size', () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-sm');
    });

    it('renders with default size', () => {
      render(<Button size="default">Default</Button>);

      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('btn-sm', 'btn-lg', 'btn-icon');
    });

    it('renders with large size', () => {
      render(<Button size="lg">Large</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-lg');
    });

    it('renders with icon size', () => {
      render(<Button size="icon">Icon</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-icon');
    });
  });

  describe('loading state', () => {
    it('shows loading spinner when loading=true', () => {
      render(<Button loading>Loading</Button>);

      const spinner = document.querySelector('.loading-spinner');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
    });

    it('shows screen reader loading text when loading', () => {
      render(<Button loading>Loading</Button>);

      expect(screen.getByText('Loading', { selector: '.sr-only' })).toBeInTheDocument();
    });

    it('disables button when loading', () => {
      render(<Button loading>Loading</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('sets aria-busy when loading', () => {
      render(<Button loading>Loading</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('does not show spinner when not loading', () => {
      render(<Button>Not Loading</Button>);

      const spinner = document.querySelector('.loading-spinner');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('disables button when disabled=true', () => {
      render(<Button disabled>Disabled</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('sets aria-disabled when disabled', () => {
      render(<Button disabled>Disabled</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('prevents onClick when disabled', () => {
      const handleClick = jest.fn();
      render(<Button disabled onClick={handleClick}>Disabled</Button>);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('onClick handler', () => {
    it('calls onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when loading', () => {
      const handleClick = jest.fn();
      render(<Button loading onClick={handleClick}>Loading</Button>);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('asChild prop', () => {
    it('renders as child component when asChild=true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );

      const link = screen.getByRole('link', { name: /link button/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/test');
      expect(link).toHaveClass('btn', 'btn-primary');
    });

    it('merges classNames when asChild', () => {
      render(
        <Button asChild className="custom-class">
          <a href="/test" className="child-class">Link</a>
        </Button>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveClass('btn', 'btn-primary', 'custom-class', 'child-class');
    });

    it('returns null when asChild with invalid child', () => {
      const { container } = render(
        <Button asChild>
          {null}
        </Button>
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('className merging', () => {
    it('merges custom className with default classes', () => {
      render(<Button className="custom-class">Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn', 'btn-primary', 'custom-class');
    });
  });

  describe('ref forwarding', () => {
    it('forwards ref to button element', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Button</Button>);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current?.tagName).toBe('BUTTON');
    });
  });

  describe('HTML attributes', () => {
    it('passes through HTML attributes', () => {
      render(
        <Button type="submit" name="test-button" data-testid="custom-button">
          Submit
        </Button>
      );

      const button = screen.getByTestId('custom-button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('name', 'test-button');
    });
  });
});
