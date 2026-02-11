'use client';
import * as React from 'react';
import { useState } from 'react';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import type { FlagReason } from '@/hooks/use-flags';

const FLAG_REASONS: { value: FlagReason; label: string }[] = [
  { value: 'incorrect_answer', label: 'Incorrect answer marked as correct' },
  { value: 'unclear_question', label: 'Question is unclear or confusing' },
  { value: 'wrong_grade', label: 'Wrong grade level' },
  { value: 'wrong_subject', label: 'Wrong subject or topic' },
  { value: 'typo', label: 'Typo or grammatical error' },
  { value: 'other', label: 'Other issue' },
];

export interface FlagModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: FlagReason, comment?: string) => Promise<void>;
  isSubmitting: boolean;
  questionText: string;
}

export function FlagModal({ open, onClose, onSubmit, isSubmitting, questionText }: FlagModalProps) {
  const [selectedReason, setSelectedReason] = useState<FlagReason | null>(null);
  const [comment, setComment] = useState('');

  const handleSubmit = async () => {
    if (!selectedReason) return;
    await onSubmit(selectedReason, comment || undefined);
    setSelectedReason(null);
    setComment('');
  };

  const handleClose = () => {
    setSelectedReason(null);
    setComment('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <ModalHeader onClose={handleClose}>
        <ModalTitle>Report a Problem</ModalTitle>
      </ModalHeader>
      <ModalContent>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-md)' }}>
          What&apos;s wrong with this question?
        </p>
        <div className="flag-modal-reasons">
          {FLAG_REASONS.map((reason) => (
            <button
              key={reason.value}
              type="button"
              className={`flag-reason-option ${selectedReason === reason.value ? 'selected' : ''}`}
              onClick={() => setSelectedReason(reason.value)}
            >
              <span>{reason.label}</span>
            </button>
          ))}
        </div>
        <textarea
          className="flag-comment-input"
          placeholder="Additional details (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
        />
      </ModalContent>
      <ModalFooter>
        <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!selectedReason || isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Report'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
