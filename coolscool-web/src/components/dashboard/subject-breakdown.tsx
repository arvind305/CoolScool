'use client';
import * as React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

interface SubjectData {
  subject: string;
  sessions: number;
  questions: number;
  correct: number;
  accuracy: number;
}

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: '#7c3aed',
  Science: '#14b8a6',
  Physics: '#3b82f6',
  Chemistry: '#10b981',
  Biology: '#8b5cf6',
  English: '#f97316',
  'Social Studies': '#ec4899',
};

export interface SubjectBreakdownProps {
  data: SubjectData[];
}

export function SubjectBreakdown({ data }: SubjectBreakdownProps) {
  if (data.length === 0) {
    return (
      <div className="subject-breakdown-empty">
        <p>No subject data yet. Start practicing to see your breakdown!</p>
      </div>
    );
  }

  return (
    <div className="subject-breakdown">
      <h3 className="subject-breakdown-title">Subject Breakdown</h3>
      <div className="subject-breakdown-container">
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 50)}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
            <YAxis type="category" dataKey="subject" tick={{ fontSize: 13, fill: 'var(--color-text)' }} width={80} />
            <Tooltip
              contentStyle={{
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
              }}
              formatter={(value, name) => [`${value ?? 0}%`, name ?? '']}
            />
            <Bar dataKey="accuracy" name="Accuracy" radius={[0, 4, 4, 0]} barSize={24}>
              {data.map((entry, index) => (
                <Cell key={index} fill={SUBJECT_COLORS[entry.subject] || 'var(--color-primary)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
