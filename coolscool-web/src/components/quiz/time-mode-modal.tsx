'use client';

import { useState, useCallback } from 'react';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import type { TimeMode } from '@/lib/quiz-engine/types';

export interface TimeModeOption {
  mode: TimeMode;
  label: string;
  description: string;
  icon: string;
}

const TIME_MODE_OPTIONS: TimeModeOption[] = [
  {
    mode: 'unlimited',
    label: 'Unlimited',
    description: 'Take your time, no pressure',
    icon: '∞',
  },
  {
    mode: '10min',
    label: '10 Minutes',
    description: 'Relaxed timed practice',
    icon: '10',
  },
  {
    mode: '5min',
    label: '5 Minutes',
    description: 'Quick focused session',
    icon: '5',
  },
  {
    mode: '3min',
    label: '3 Minutes',
    description: 'Challenge mode',
    icon: '3',
  },
];

export interface TimeModeModalProps {
  open: boolean;
  onClose: () => void;
  onStart: (timeMode: TimeMode) => void;
  topicName: string;
  isLoading?: boolean;
}

export function TimeModeModal({
  open,
  onClose,
  onStart,
  topicName,
  isLoading = false,
}: TimeModeModalProps) {
  const [selectedMode, setSelectedMode] = useState<TimeMode>('unlimited');

  const handleModeSelect = useCallback((mode: TimeMode) => {
    setSelectedMode(mode);
  }, []);

  const handleStart = useCallback(() => {
    onStart(selectedMode);
  }, [selectedMode, onStart]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, mode: TimeMode) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleModeSelect(mode);
      }
    },
    [handleModeSelect]
  );

  return (
    <Modal open={open} onClose={onClose} className="time-mode-modal">
      <ModalHeader onClose={onClose}>
        <ModalTitle>Start Practice</ModalTitle>
      </ModalHeader>

      <ModalContent>
        <p className="text-[var(--color-text-secondary)] mb-4" id="modal-topic-name">
          {topicName}
        </p>

        <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
          Choose Time Mode
        </h3>

        <div className="time-mode-options" role="radiogroup" aria-label="Time mode selection">
          {TIME_MODE_OPTIONS.map((option) => {
            const isSelected = selectedMode === option.mode;

            return (
              <div
                key={option.mode}
                className={`time-mode-option ${isSelected ? 'selected' : ''}`}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                data-mode={option.mode}
                onClick={() => handleModeSelect(option.mode)}
                onKeyDown={(e) => handleKeyDown(e, option.mode)}
              >
                <div className="time-mode-icon">{option.icon}</div>
                <div className="time-mode-info">
                  <div className="time-mode-label">{option.label}</div>
                  <div className="time-mode-description">{option.description}</div>
                </div>
                {isSelected && (
                  <svg
                    className="time-mode-check"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </ModalContent>

      <ModalFooter>
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isLoading}
          id="modal-cancel-btn"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleStart}
          loading={isLoading}
          id="modal-start-btn"
        >
          Start Quiz
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default TimeModeModal;
