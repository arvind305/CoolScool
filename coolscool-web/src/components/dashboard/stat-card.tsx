'use client';

import * as React from 'react';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  className?: string;
}

export function StatCard({ label, value, icon, trend, className = '' }: StatCardProps) {
  return (
    <div className={`stat-card ${className}`}>
      <div className="stat-card-header">
        {icon && <div className="stat-card-icon">{icon}</div>}
        <span className="stat-card-label">{label}</span>
      </div>
      <div className="stat-card-value">{value}</div>
      {trend && (
        <div className={`stat-card-trend ${trend.positive ? 'positive' : 'neutral'}`}>
          {trend.positive && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          )}
          <span>{trend.value > 0 ? '+' : ''}{trend.value}</span>
          <span className="stat-card-trend-label">{trend.label}</span>
        </div>
      )}
    </div>
  );
}

export default StatCard;
