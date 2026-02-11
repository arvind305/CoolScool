'use client';
import * as React from 'react';

export interface FlagButtonProps {
  onClick: () => void;
  isFlagged: boolean;
  disabled?: boolean;
}

export function FlagButton({ onClick, isFlagged, disabled }: FlagButtonProps) {
  return (
    <button
      type="button"
      className={`flag-button ${isFlagged ? 'flagged' : ''}`}
      onClick={onClick}
      disabled={disabled || isFlagged}
      title={isFlagged ? 'Already reported' : 'Report a problem'}
      aria-label={isFlagged ? 'Already reported' : 'Report a problem with this question'}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={isFlagged ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </svg>
      {isFlagged ? 'Reported' : 'Report'}
    </button>
  );
}
