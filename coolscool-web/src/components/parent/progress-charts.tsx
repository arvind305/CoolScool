'use client';

import * as React from 'react';
import type { SubjectProgress, TopicProgressDetail } from '@/types/parent';

export interface ProgressChartsProps {
  subjectProgress: SubjectProgress[];
  topicProgress: TopicProgressDetail[];
}

/**
 * CSS-only bar chart for subject progress
 */
function SubjectProgressChart({ subjects }: { subjects: SubjectProgress[] }) {
  if (subjects.length === 0) {
    return (
      <div className="progress-chart-empty">
        <p>No subject data available</p>
      </div>
    );
  }

  return (
    <div className="subject-progress-chart">
      {subjects.map((subject) => {
        const masteryPercent = subject.topicsTotal > 0
          ? Math.round((subject.topicsMastered / subject.topicsTotal) * 100)
          : 0;
        const startedPercent = subject.topicsTotal > 0
          ? Math.round((subject.topicsStarted / subject.topicsTotal) * 100)
          : 0;

        return (
          <div key={subject.subject} className="subject-progress-row">
            <div className="subject-progress-label">
              <span className="subject-progress-name">{subject.subjectName}</span>
              <span className="subject-progress-stats">
                {subject.topicsMastered}/{subject.topicsTotal} topics mastered
              </span>
            </div>
            <div className="subject-progress-bar">
              <div
                className="subject-progress-fill mastered"
                style={{ width: `${masteryPercent}%` }}
                title={`${masteryPercent}% mastered`}
              />
              <div
                className="subject-progress-fill started"
                style={{ width: `${startedPercent - masteryPercent}%` }}
                title={`${startedPercent - masteryPercent}% in progress`}
              />
            </div>
            <div className="subject-progress-percent">{startedPercent}%</div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * CSS-only accuracy gauge
 */
function AccuracyGauge({ accuracy }: { accuracy: number }) {
  // Calculate the stroke-dasharray for the circular progress
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (accuracy / 100) * circumference;

  return (
    <div className="accuracy-gauge">
      <svg viewBox="0 0 100 100" className="accuracy-gauge-svg">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={accuracy >= 80 ? 'var(--color-success)' : accuracy >= 60 ? 'var(--color-warning)' : 'var(--color-error)'}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          className="accuracy-gauge-progress"
        />
        {/* Center text */}
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="middle"
          className="accuracy-gauge-text"
        >
          {accuracy}%
        </text>
      </svg>
      <span className="accuracy-gauge-label">Average Accuracy</span>
    </div>
  );
}

/**
 * Proficiency distribution bar
 */
function ProficiencyDistribution({ topics }: { topics: TopicProgressDetail[] }) {
  const distribution = {
    exam_ready: 0,
    consistent_understanding: 0,
    growing_confidence: 0,
    building_familiarity: 0,
    not_started: 0,
  };

  topics.forEach((topic) => {
    distribution[topic.proficiencyBand]++;
  });

  const total = topics.length || 1;

  return (
    <div className="proficiency-distribution">
      <h4 className="proficiency-distribution-title">Proficiency Levels</h4>
      <div className="proficiency-distribution-bar">
        {distribution.exam_ready > 0 && (
          <div
            className="proficiency-segment exam-ready"
            style={{ width: `${(distribution.exam_ready / total) * 100}%` }}
            title={`Exam Ready: ${distribution.exam_ready}`}
          />
        )}
        {distribution.consistent_understanding > 0 && (
          <div
            className="proficiency-segment consistent-understanding"
            style={{ width: `${(distribution.consistent_understanding / total) * 100}%` }}
            title={`Consistent Understanding: ${distribution.consistent_understanding}`}
          />
        )}
        {distribution.growing_confidence > 0 && (
          <div
            className="proficiency-segment growing-confidence"
            style={{ width: `${(distribution.growing_confidence / total) * 100}%` }}
            title={`Growing Confidence: ${distribution.growing_confidence}`}
          />
        )}
        {distribution.building_familiarity > 0 && (
          <div
            className="proficiency-segment building-familiarity"
            style={{ width: `${(distribution.building_familiarity / total) * 100}%` }}
            title={`Building Familiarity: ${distribution.building_familiarity}`}
          />
        )}
      </div>
      <div className="proficiency-distribution-legend">
        <div className="proficiency-legend-item">
          <span className="proficiency-legend-color exam-ready" />
          <span>Exam Ready ({distribution.exam_ready})</span>
        </div>
        <div className="proficiency-legend-item">
          <span className="proficiency-legend-color consistent-understanding" />
          <span>Consistent ({distribution.consistent_understanding})</span>
        </div>
        <div className="proficiency-legend-item">
          <span className="proficiency-legend-color growing-confidence" />
          <span>Growing ({distribution.growing_confidence})</span>
        </div>
        <div className="proficiency-legend-item">
          <span className="proficiency-legend-color building-familiarity" />
          <span>Building ({distribution.building_familiarity})</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Time spent visualization
 */
function TimeSpentChart({ totalMs }: { totalMs: number }) {
  const hours = Math.floor(totalMs / (1000 * 60 * 60));
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="time-spent-chart">
      <div className="time-spent-value">
        {hours > 0 && <span className="time-spent-hours">{hours}h</span>}
        <span className="time-spent-minutes">{minutes}m</span>
      </div>
      <span className="time-spent-label">Total Practice Time</span>
    </div>
  );
}

export function ProgressCharts({ subjectProgress, topicProgress }: ProgressChartsProps) {
  // Calculate overall stats
  const totalAccuracy = subjectProgress.length > 0
    ? Math.round(
        subjectProgress.reduce((sum, s) => sum + s.averageAccuracy, 0) / subjectProgress.length
      )
    : 0;
  const totalTimeMs = subjectProgress.reduce((sum, s) => sum + s.totalTimeSpentMs, 0);

  return (
    <div className="progress-charts">
      <div className="progress-charts-overview">
        <AccuracyGauge accuracy={totalAccuracy} />
        <TimeSpentChart totalMs={totalTimeMs} />
      </div>

      <div className="progress-charts-subjects">
        <h3 className="progress-charts-section-title">Subject Progress</h3>
        <SubjectProgressChart subjects={subjectProgress} />
      </div>

      <div className="progress-charts-proficiency">
        <ProficiencyDistribution topics={topicProgress} />
      </div>
    </div>
  );
}

export default ProgressCharts;
