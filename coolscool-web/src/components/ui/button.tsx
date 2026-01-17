'use client';

import * as React from 'react';

/**
 * Slot component that merges props onto its single child element.
 * A lightweight alternative to @radix-ui/react-slot.
 */
interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
}

const Slot = React.forwardRef<HTMLElement, SlotProps>(
  ({ children, ...slotProps }, forwardedRef) => {
    if (!React.isValidElement(children)) {
      return null;
    }

    const childProps = children.props as Record<string, unknown>;

    // Merge classNames
    const mergedClassName = [slotProps.className, childProps.className]
      .filter(Boolean)
      .join(' ');

    // Merge styles
    const mergedStyle = {
      ...(slotProps.style || {}),
      ...(childProps.style as React.CSSProperties || {}),
    };

    // Merge refs
    const childRef = (children as React.ReactElement & { ref?: React.Ref<unknown> }).ref;
    const mergedRef = forwardedRef
      ? composeRefs(forwardedRef, childRef)
      : childRef;

    return React.cloneElement(children, {
      ...slotProps,
      ...childProps,
      className: mergedClassName || undefined,
      style: Object.keys(mergedStyle).length > 0 ? mergedStyle : undefined,
      ref: mergedRef,
    } as React.Attributes);
  }
);

Slot.displayName = 'Slot';

// Helper to compose multiple refs
function composeRefs<T>(
  ...refs: (React.Ref<T> | undefined)[]
): React.RefCallback<T> {
  return (node) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = node;
      }
    });
  };
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'ghost-light';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  loading?: boolean;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'default',
      loading = false,
      disabled,
      asChild = false,
      children,
      ...props
    },
    ref
  ) => {
    const variantClasses: Record<string, string> = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      ghost: 'btn-ghost',
      'ghost-light': 'btn-ghost-light',
    };

    const sizeClasses: Record<string, string> = {
      default: '',
      sm: 'btn-sm',
      lg: 'btn-lg',
      icon: 'btn-icon',
    };

    const classes = [
      'btn',
      variantClasses[variant],
      sizeClasses[size],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const sharedProps = {
      className: classes,
      'aria-disabled': disabled || loading || undefined,
      'aria-busy': loading || undefined,
    };

    const content = loading ? (
      <>
        <span
          className="loading-spinner"
          style={{
            width: '1em',
            height: '1em',
            marginRight: 'var(--spacing-sm)',
            borderWidth: '2px',
          }}
          aria-hidden="true"
        />
        <span className="sr-only">Loading</span>
        {children}
      </>
    ) : (
      children
    );

    if (asChild) {
      return (
        <Slot ref={ref as React.Ref<HTMLElement>} {...sharedProps}>
          {React.isValidElement(children)
            ? React.cloneElement(
                children as React.ReactElement<{ children?: React.ReactNode }>,
                {
                  children: loading
                    ? content
                    : (children as React.ReactElement<{ children?: React.ReactNode }>).props.children,
                }
              )
            : children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        {...sharedProps}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
