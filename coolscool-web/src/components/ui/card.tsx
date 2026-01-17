import * as React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', interactive = false, ...props }, ref) => {
    const classes = [
      'card',
      interactive ? 'card-interactive' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        ref={ref}
        className={classes}
        tabIndex={interactive ? 0 : undefined}
        role={interactive ? 'button' : undefined}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', style, ...props }, ref) => {
    const defaultStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-xs)',
      marginBottom: 'var(--spacing-md)',
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

CardHeader.displayName = 'CardHeader';

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = '', ...props }, ref) => {
    return <div ref={ref} className={className} {...props} />;
  }
);

CardContent.displayName = 'CardContent';

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = '', style, ...props }, ref) => {
    const defaultStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--spacing-sm)',
      marginTop: 'var(--spacing-md)',
      paddingTop: 'var(--spacing-md)',
      borderTop: '1px solid var(--color-border)',
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

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardContent, CardFooter };
