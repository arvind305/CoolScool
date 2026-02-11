'use client';
import * as React from 'react';
import Link from 'next/link';

interface WeakArea {
  topicId: string;
  topicName: string;
  subject: string;
  totalAttempts: number;
  accuracy: number;
  proficiencyBand: string;
}

export interface WeakAreasProps {
  areas: WeakArea[];
}

export function WeakAreas({ areas }: WeakAreasProps) {
  if (areas.length === 0) {
    return null;
  }

  return (
    <div className="weak-areas">
      <h3 className="weak-areas-title">Needs Practice</h3>
      <div className="weak-areas-list">
        {areas.map((area) => (
          <div key={area.topicId} className="weak-area-item">
            <div className="weak-area-info">
              <span className="weak-area-subject">{area.subject}</span>
              <span className="weak-area-name">{area.topicName}</span>
              <div className="weak-area-stats">
                <span className="weak-area-accuracy">{area.accuracy}% accuracy</span>
                <span className="weak-area-attempts">{area.totalAttempts} attempts</span>
              </div>
            </div>
            <Link
              href={`/quiz?topic=${area.topicId}`}
              className="btn btn-sm btn-primary"
            >
              Practice
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
