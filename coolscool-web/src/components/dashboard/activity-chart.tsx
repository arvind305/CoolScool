'use client';
import * as React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface DailyTrend {
  date: string;
  sessions: number;
  questions: number;
  xp: number;
  accuracy: number;
}

export interface ActivityChartProps {
  data: DailyTrend[];
}

export function ActivityChart({ data }: ActivityChartProps) {
  if (data.length === 0) {
    return (
      <div className="activity-chart-empty">
        <p>No activity data yet. Start practicing to see your trends!</p>
      </div>
    );
  }

  // Format date labels
  const formattedData = data.map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <div className="activity-chart">
      <h3 className="activity-chart-title">Activity (Last 30 Days)</h3>
      <div className="activity-chart-container">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={formattedData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
              label={{ value: 'Questions', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: 'var(--color-text-muted)' } }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
              label={{ value: 'Accuracy %', angle: 90, position: 'insideRight', style: { fontSize: 12, fill: 'var(--color-text-muted)' } }}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
              }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="questions"
              stroke="var(--color-primary)"
              strokeWidth={2}
              dot={false}
              name="Questions"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="accuracy"
              stroke="var(--color-secondary)"
              strokeWidth={2}
              dot={false}
              name="Accuracy %"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
