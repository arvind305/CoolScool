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
import type { SubjectBreakdownItem } from '@/lib/api';

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: '#7c3aed',
  Science: '#14b8a6',
  Physics: '#3b82f6',
  Chemistry: '#10b981',
  Biology: '#8b5cf6',
  English: '#f97316',
  'Social Studies': '#ec4899',
};

function capitalizeSubject(subject: string): string {
  return subject
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export interface SubjectComparisonChartProps {
  data: SubjectBreakdownItem[];
  isLoading?: boolean;
}

export function SubjectComparisonChart({ data, isLoading = false }: SubjectComparisonChartProps) {
  if (isLoading) {
    return (
      <div className="subject-comparison-chart">
        <h3 className="subject-comparison-title">Subject Comparison</h3>
        <div className="subject-comparison-loading">
          <div className="subject-comparison-skeleton" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="subject-comparison-chart">
        <h3 className="subject-comparison-title">Subject Comparison</h3>
        <div className="subject-comparison-empty">
          <p>No subject data available yet</p>
        </div>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    displayName: capitalizeSubject(item.subject),
  }));

  return (
    <div className="subject-comparison-chart">
      <h3 className="subject-comparison-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        Subject Comparison
      </h3>
      <div className="subject-comparison-container">
        <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 50)}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 100 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="displayName"
              tick={{ fontSize: 13, fill: 'var(--color-text)' }}
              width={100}
            />
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
              {chartData.map((entry, index) => (
                <Cell key={index} fill={SUBJECT_COLORS[entry.displayName] || 'var(--color-primary)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="subject-comparison-details">
        {chartData.map((item) => (
          <div key={item.subject} className="subject-comparison-detail-row">
            <span
              className="subject-comparison-dot"
              style={{ backgroundColor: SUBJECT_COLORS[item.displayName] || 'var(--color-primary)' }}
            />
            <span className="subject-comparison-name">{item.displayName}</span>
            <span className="subject-comparison-meta">
              {item.sessions} sessions, {item.questions} questions
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SubjectComparisonChart;
