'use client';

import * as React from 'react';
import type { AreaOfConcern } from '@/lib/api';

export interface AreasOfConcernProps {
  concerns: AreaOfConcern[];
  isLoading?: boolean;
}

function TrendIndicator({ concern }: { concern: AreaOfConcern }) {
  if (concern.trend === 'declining') {
    const drop = Math.round(concern.previousAccuracy - concern.recentAccuracy);
    return (
      <span className="concern-trend concern-trend-declining">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
          <polyline points="17 18 23 18 23 12" />
        </svg>
        {drop}% drop
      </span>
    );
  }
  return (
    <span className="concern-trend concern-trend-low">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      Needs practice
    </span>
  );
}

export function AreasOfConcern({ concerns, isLoading = false }: AreasOfConcernProps) {
  if (isLoading) {
    return (
      <div className="areas-of-concern">
        <h3 className="areas-of-concern-title">Areas of Concern</h3>
        <div className="areas-of-concern-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="concern-item-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (concerns.length === 0) {
    return (
      <div className="areas-of-concern">
        <h3 className="areas-of-concern-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Areas of Concern
        </h3>
        <div className="areas-of-concern-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <p>No concerns right now — great work!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="areas-of-concern">
      <h3 className="areas-of-concern-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        Areas of Concern ({concerns.length})
      </h3>
      <div className="areas-of-concern-list">
        {concerns.map((concern) => (
          <div key={concern.topicId} className={`concern-item concern-${concern.trend}`}>
            <div className="concern-item-header">
              <span className="concern-item-topic">{concern.topicName}</span>
              <TrendIndicator concern={concern} />
            </div>
            <div className="concern-item-details">
              <span className="concern-item-subject">{concern.subject}</span>
              <div className="concern-item-accuracy">
                <div className="concern-accuracy-bar">
                  <div
                    className="concern-accuracy-fill"
                    style={{ width: `${concern.accuracy}%` }}
                  />
                </div>
                <span className="concern-accuracy-value">{concern.accuracy}%</span>
              </div>
            </div>
            {concern.trend === 'declining' && (
              <div className="concern-item-comparison">
                <span>Previous: {concern.previousAccuracy}%</span>
                <span>Recent: {concern.recentAccuracy}%</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AreasOfConcern;
