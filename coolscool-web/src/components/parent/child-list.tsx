'use client';

import * as React from 'react';
import { ChildCard } from './child-card';
import type { ChildCardData } from '@/types/parent';

export interface ChildListProps {
  children: ChildCardData[];
  isLoading?: boolean;
  onAddChild?: () => void;
}

export function ChildList({ children, isLoading = false, onAddChild }: ChildListProps) {
  if (isLoading) {
    return (
      <div className="child-list child-list-loading">
        <div className="child-card-skeleton" />
        <div className="child-card-skeleton" />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="child-list-empty">
        <div className="child-list-empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
        </div>
        <h3 className="child-list-empty-title">No children linked yet</h3>
        <p className="child-list-empty-description">
          Link your children&apos;s accounts to monitor their learning progress and achievements.
        </p>
        {onAddChild && (
          <button className="btn btn-primary" onClick={onAddChild}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Child
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="child-list">
      {children.map((childData) => (
        <ChildCard key={childData.child.id} data={childData} />
      ))}
    </div>
  );
}

export default ChildList;
