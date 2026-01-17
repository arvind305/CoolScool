'use client';

import * as React from 'react';
import { useCallback, useEffect, useRef } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      open,
      onClose,
      children,
      className = '',
      closeOnOverlayClick = true,
      closeOnEscape = true,
    },
    ref
  ) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    // Handle escape key
    const handleKeyDown = useCallback(
      (event: KeyboardEvent) => {
        if (closeOnEscape && event.key === 'Escape') {
          onClose();
        }
      },
      [closeOnEscape, onClose]
    );

    // Handle overlay click
    const handleOverlayClick = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (closeOnOverlayClick && event.target === event.currentTarget) {
          onClose();
        }
      },
      [closeOnOverlayClick, onClose]
    );

    // Focus trap
    useEffect(() => {
      if (!open) return;

      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Focus the modal
      const modal = modalRef.current;
      if (modal) {
        const focusableElements = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        // Focus first focusable element
        if (firstFocusable) {
          firstFocusable.focus();
        } else {
          modal.focus();
        }

        // Trap focus within modal
        const handleTabKey = (e: KeyboardEvent) => {
          if (e.key !== 'Tab') return;

          if (focusableElements.length === 0) {
            e.preventDefault();
            return;
          }

          if (e.shiftKey) {
            if (document.activeElement === firstFocusable) {
              e.preventDefault();
              lastFocusable?.focus();
            }
          } else {
            if (document.activeElement === lastFocusable) {
              e.preventDefault();
              firstFocusable?.focus();
            }
          }
        };

        document.addEventListener('keydown', handleTabKey);
        document.addEventListener('keydown', handleKeyDown);

        // Prevent body scroll
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
          document.removeEventListener('keydown', handleTabKey);
          document.removeEventListener('keydown', handleKeyDown);
          document.body.style.overflow = originalOverflow;

          // Restore focus
          if (previousActiveElement.current) {
            previousActiveElement.current.focus();
          }
        };
      }
    }, [open, handleKeyDown]);

    if (!open) return null;

    return (
      <div
        className={`modal-overlay ${open ? 'active' : ''}`}
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div
          ref={(node) => {
            (modalRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          className={`modal ${className}`}
          tabIndex={-1}
        >
          {children}
        </div>
      </div>
    );
  }
);

Modal.displayName = 'Modal';

export interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void;
  showCloseButton?: boolean;
}

const ModalHeader = React.forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ className = '', children, onClose, showCloseButton = true, ...props }, ref) => {
    return (
      <div ref={ref} className={`modal-header ${className}`} {...props}>
        {children}
        {showCloseButton && onClose && (
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              position: 'absolute',
              top: 'var(--spacing-md)',
              right: 'var(--spacing-md)',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="15" y1="5" x2="5" y2="15" />
              <line x1="5" y1="5" x2="15" y2="15" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

ModalHeader.displayName = 'ModalHeader';

export interface ModalTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const ModalTitle = React.forwardRef<HTMLHeadingElement, ModalTitleProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <h2
        ref={ref}
        id="modal-title"
        className={`modal-title ${className}`}
        {...props}
      />
    );
  }
);

ModalTitle.displayName = 'ModalTitle';

export interface ModalContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const ModalContent = React.forwardRef<HTMLDivElement, ModalContentProps>(
  ({ className = '', style, ...props }, ref) => {
    const defaultStyle: React.CSSProperties = {
      marginBottom: 'var(--spacing-lg)',
      ...style,
    };

    return (
      <div
        ref={ref}
        className={className}
        style={defaultStyle}
        {...props}
      />
    );
  }
);

ModalContent.displayName = 'ModalContent';

export interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const ModalFooter = React.forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <div ref={ref} className={`modal-actions ${className}`} {...props} />
    );
  }
);

ModalFooter.displayName = 'ModalFooter';

export { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter };
