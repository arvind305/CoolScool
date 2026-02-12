'use client';

interface SkeletonProps {
  variant?: 'text' | 'card' | 'circle';
  width?: string;
  height?: string;
  className?: string;
  count?: number;
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  count = 1,
}: SkeletonProps) {
  const baseClass = `skeleton skeleton-${variant}`;
  const style: React.CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;

  if (count > 1) {
    return (
      <div className="skeleton-group">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={`${baseClass} ${className}`} style={style} />
        ))}
      </div>
    );
  }

  return <div className={`${baseClass} ${className}`} style={style} />;
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card-wrapper">
      <div className="skeleton skeleton-circle" style={{ width: 48, height: 48 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton skeleton-text" style={{ width: '70%', marginBottom: 8 }} />
        <div className="skeleton skeleton-text" style={{ width: '40%' }} />
      </div>
    </div>
  );
}

export function TopicBrowserSkeleton() {
  return (
    <div className="skeleton-topic-browser">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-theme-section">
          <div className="skeleton skeleton-text" style={{ width: '40%', height: 24, marginBottom: 16 }} />
          <div className="skeleton-topic-grid">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="skeleton-topic-card">
                <div className="skeleton skeleton-text" style={{ width: '80%', marginBottom: 8 }} />
                <div className="skeleton skeleton-text" style={{ width: '50%', height: 12 }} />
                <div className="skeleton skeleton-text" style={{ width: '30%', height: 12, marginTop: 8 }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
