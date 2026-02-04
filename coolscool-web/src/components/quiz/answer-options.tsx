'use client';

import { forwardRef, useCallback, useEffect, useState, useRef } from 'react';
import type { QuestionType } from '@/lib/quiz-engine/types';

// ============================================================
// AnswerOptions Component
// ============================================================

export type AnswerState = 'default' | 'selected' | 'correct' | 'incorrect' | 'disabled';

export interface MCQOption {
  id: string;
  text: string;
}

export interface MatchPair {
  left: string;
  right: string;
}

export interface AnswerOptionsProps {
  /** Question type determines the UI layout */
  type: QuestionType;
  /** Options for MCQ questions (A, B, C, D format) */
  options?: MCQOption[];
  /** Items for ordering questions */
  orderingItems?: string[];
  /** Match pairs for match questions */
  matchPairs?: MatchPair[];
  /** Currently selected answer */
  selectedAnswer?: string | string[] | Record<string, string> | null;
  /** The correct answer (shown after submission) */
  correctAnswer?: string | string[] | Record<string, string> | null;
  /** Whether the options are disabled (after submission) */
  disabled?: boolean;
  /** Callback when an option is selected */
  onSelect?: (answer: string | string[] | Record<string, string>) => void;
  /** Optional className for the container */
  className?: string;
}

/**
 * Renders answer options for different question types:
 * - MCQ: Multiple choice with A, B, C, D markers
 * - True/False: Grid layout with T/F buttons
 * - Fill-in-the-blank: Text input field
 * - Ordering: Drag-and-drop sortable list
 */
export const AnswerOptions = forwardRef<HTMLDivElement, AnswerOptionsProps>(
  function AnswerOptions(
    {
      type,
      options = [],
      orderingItems = [],
      matchPairs = [],
      selectedAnswer,
      correctAnswer,
      disabled = false,
      onSelect,
      className = '',
    },
    ref
  ) {
    // Determine answer state for an option
    const getOptionState = useCallback(
      (value: string): AnswerState => {
        if (disabled) {
          if (correctAnswer === value) return 'correct';
          if (selectedAnswer === value && correctAnswer !== value) return 'incorrect';
          if (selectedAnswer === value) return 'selected';
          return 'disabled';
        }
        if (selectedAnswer === value) return 'selected';
        return 'default';
      },
      [selectedAnswer, correctAnswer, disabled]
    );

    // Handle option click
    const handleOptionClick = useCallback(
      (value: string) => {
        if (disabled) return;
        onSelect?.(value);
      },
      [disabled, onSelect]
    );

    // Render based on question type
    switch (type) {
      case 'mcq':
        return (
          <MCQOptions
            ref={ref}
            options={options}
            getOptionState={getOptionState}
            onSelect={handleOptionClick}
            disabled={disabled}
            className={className}
          />
        );
      case 'true_false':
        return (
          <TrueFalseOptions
            ref={ref}
            getOptionState={getOptionState}
            onSelect={handleOptionClick}
            disabled={disabled}
            className={className}
          />
        );
      case 'fill_blank':
        return (
          <FillBlankInput
            ref={ref}
            value={(selectedAnswer as string) || ''}
            onChange={(val) => onSelect?.(val)}
            disabled={disabled}
            isCorrect={correctAnswer !== undefined ? selectedAnswer === correctAnswer : undefined}
            className={className}
          />
        );
      case 'ordering':
        return (
          <OrderingOptions
            ref={ref}
            items={orderingItems}
            currentOrder={(selectedAnswer as string[]) || orderingItems}
            onReorder={(newOrder) => onSelect?.(newOrder)}
            disabled={disabled}
            correctOrder={correctAnswer as string[] | undefined}
            className={className}
          />
        );
      case 'match':
        return (
          <MatchOptions
            ref={ref}
            pairs={matchPairs}
            selectedMatches={(selectedAnswer as Record<string, string>) || {}}
            onMatch={(matches) => onSelect?.(matches)}
            disabled={disabled}
            correctMatches={correctAnswer as Record<string, string> | undefined}
            className={className}
          />
        );
      default:
        return null;
    }
  }
);

// ============================================================
// MCQ Options Sub-component
// ============================================================

interface MCQOptionsProps {
  options: MCQOption[];
  getOptionState: (value: string) => AnswerState;
  onSelect: (value: string) => void;
  disabled: boolean;
  className?: string;
}

const MCQOptions = forwardRef<HTMLDivElement, MCQOptionsProps>(
  function MCQOptions({ options, getOptionState, onSelect, disabled, className = '' }, ref) {
    // Keyboard navigation (a, b, c, d keys)
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (disabled) return;
        const key = e.key.toUpperCase();
        if (['A', 'B', 'C', 'D'].includes(key)) {
          const option = options.find((opt) => opt.id === key);
          if (option) {
            onSelect(option.id);
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [options, onSelect, disabled]);

    return (
      <div
        ref={ref}
        className={`answer-options ${className}`.trim()}
        role="radiogroup"
        aria-label="Answer options"
      >
        {options.map((option) => {
          const state = getOptionState(option.id);
          const stateClass = state !== 'default' ? state : '';

          return (
            <div
              key={option.id}
              className={`answer-option ${stateClass}`.trim()}
              data-value={option.id}
              role="radio"
              aria-checked={state === 'selected' || state === 'correct'}
              aria-disabled={disabled}
              tabIndex={disabled ? -1 : 0}
              onClick={() => onSelect(option.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(option.id);
                }
              }}
            >
              <span className="answer-option-marker">{option.id}</span>
              <span className="answer-option-text">{option.text}</span>
            </div>
          );
        })}
      </div>
    );
  }
);

// ============================================================
// True/False Options Sub-component
// ============================================================

interface TrueFalseOptionsProps {
  getOptionState: (value: string) => AnswerState;
  onSelect: (value: string) => void;
  disabled: boolean;
  className?: string;
}

const TrueFalseOptions = forwardRef<HTMLDivElement, TrueFalseOptionsProps>(
  function TrueFalseOptions({ getOptionState, onSelect, disabled, className = '' }, ref) {
    const options = [
      { id: 'True', marker: 'T', text: 'True' },
      { id: 'False', marker: 'F', text: 'False' },
    ];

    return (
      <div
        ref={ref}
        className={`answer-options ${className}`.trim()}
        role="radiogroup"
        aria-label="True or False"
      >
        <div className="true-false-options">
          {options.map((option) => {
            const state = getOptionState(option.id);
            const stateClass = state !== 'default' ? state : '';

            return (
              <div
                key={option.id}
                className={`answer-option ${stateClass}`.trim()}
                data-value={option.id}
                role="radio"
                aria-checked={state === 'selected' || state === 'correct'}
                aria-disabled={disabled}
                tabIndex={disabled ? -1 : 0}
                onClick={() => onSelect(option.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(option.id);
                  }
                }}
              >
                <span className="answer-option-marker">{option.marker}</span>
                <span className="answer-option-text">{option.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

// ============================================================
// Fill-in-the-Blank Input Sub-component
// ============================================================

interface FillBlankInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  isCorrect?: boolean;
  className?: string;
}

const FillBlankInput = forwardRef<HTMLDivElement, FillBlankInputProps>(
  function FillBlankInput({ value, onChange, disabled, isCorrect, className = '' }, ref) {
    const stateClass =
      isCorrect === true ? 'correct' : isCorrect === false ? 'incorrect' : '';

    return (
      <div ref={ref} className={`answer-input-container ${className}`.trim()}>
        <input
          type="text"
          className={`fill-blank-input ${stateClass}`.trim()}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Type your answer here..."
          aria-label="Your answer"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </div>
    );
  }
);

// ============================================================
// Ordering Options Sub-component (Drag & Drop)
// ============================================================

interface OrderingOptionsProps {
  items: string[];
  currentOrder: string[];
  onReorder: (newOrder: string[]) => void;
  disabled: boolean;
  correctOrder?: string[];
  className?: string;
}

const OrderingOptions = forwardRef<HTMLDivElement, OrderingOptionsProps>(
  function OrderingOptions(
    { items, currentOrder, onReorder, disabled, correctOrder, className = '' },
    ref
  ) {
    const [orderedItems, setOrderedItems] = useState<string[]>(() => {
      // Initialize with shuffled items if no current order
      if (currentOrder.length > 0) return currentOrder;
      const shuffled = [...items];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync with external state
    useEffect(() => {
      if (currentOrder.length > 0 && JSON.stringify(currentOrder) !== JSON.stringify(orderedItems)) {
        setOrderedItems(currentOrder);
      }
    }, [currentOrder]);

    const handleDragStart = (index: number) => {
      if (disabled) return;
      setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (disabled || draggedIndex === null || draggedIndex === index) return;

      const newOrder = [...orderedItems];
      const draggedItem = newOrder[draggedIndex];
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(index, 0, draggedItem);

      setOrderedItems(newOrder);
      setDraggedIndex(index);
    };

    const handleDragEnd = () => {
      if (draggedIndex !== null) {
        onReorder(orderedItems);
      }
      setDraggedIndex(null);
    };

    // Keyboard navigation for reordering
    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
      if (disabled) return;

      if (e.key === 'ArrowUp' && index > 0) {
        e.preventDefault();
        const newOrder = [...orderedItems];
        [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
        setOrderedItems(newOrder);
        onReorder(newOrder);
      } else if (e.key === 'ArrowDown' && index < orderedItems.length - 1) {
        e.preventDefault();
        const newOrder = [...orderedItems];
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        setOrderedItems(newOrder);
        onReorder(newOrder);
      }
    };

    return (
      <div ref={ref} className={`ordering-container ${className}`.trim()}>
        <div
          ref={containerRef}
          className="ordering-items"
          role="listbox"
          aria-label="Drag to reorder items"
        >
          {orderedItems.map((item, index) => {
            const isDragging = draggedIndex === index;

            return (
              <div
                key={`${item}-${index}`}
                className={`ordering-item ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`.trim()}
                draggable={!disabled}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onKeyDown={(e) => handleKeyDown(e, index)}
                role="option"
                tabIndex={disabled ? -1 : 0}
                aria-selected={false}
                data-value={item}
              >
                <span className="ordering-item-handle" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="6" r="1.5"></circle>
                    <circle cx="15" cy="6" r="1.5"></circle>
                    <circle cx="9" cy="12" r="1.5"></circle>
                    <circle cx="15" cy="12" r="1.5"></circle>
                    <circle cx="9" cy="18" r="1.5"></circle>
                    <circle cx="15" cy="18" r="1.5"></circle>
                  </svg>
                </span>
                <span className="ordering-item-number">{index + 1}</span>
                <span className="ordering-item-text">{item}</span>
              </div>
            );
          })}
        </div>
        <p className="sr-only">
          Use arrow keys to reorder items, or drag and drop with mouse
        </p>
      </div>
    );
  }
);

// ============================================================
// Match Options Sub-component
// ============================================================

interface MatchOptionsProps {
  pairs: MatchPair[];
  selectedMatches: Record<string, string>;
  onMatch: (matches: Record<string, string>) => void;
  disabled: boolean;
  correctMatches?: Record<string, string>;
  className?: string;
}

const MatchOptions = forwardRef<HTMLDivElement, MatchOptionsProps>(
  function MatchOptions(
    { pairs, selectedMatches, onMatch, disabled, correctMatches, className = '' },
    ref
  ) {
    const [activeChip, setActiveChip] = useState<string | null>(null);

    // Get shuffled right items (stable across renders)
    const [shuffledRight] = useState<string[]>(() => {
      const rights = pairs.map(p => p.right);
      for (let i = rights.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rights[i], rights[j]] = [rights[j], rights[i]];
      }
      return rights;
    });

    const assignedValues = new Set(Object.values(selectedMatches).filter(Boolean));
    const availableChips = shuffledRight.filter(r => !assignedValues.has(r));

    const handleChipClick = (right: string) => {
      if (disabled) return;
      setActiveChip(activeChip === right ? null : right);
    };

    const handleSlotClick = (left: string) => {
      if (disabled) return;
      // If slot is filled, return chip to bank
      if (selectedMatches[left]) {
        const newMatches = { ...selectedMatches };
        delete newMatches[left];
        onMatch(newMatches);
        return;
      }
      // If a chip is active, place it in this slot
      if (activeChip) {
        const newMatches = { ...selectedMatches, [left]: activeChip };
        setActiveChip(null);
        onMatch(newMatches);
      }
    };

    const handleDragStart = (e: React.DragEvent, right: string) => {
      if (disabled) return;
      e.dataTransfer.setData('text/plain', right);
      e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, left: string) => {
      e.preventDefault();
      if (disabled) return;
      const right = e.dataTransfer.getData('text/plain');
      if (!right) return;
      // If slot already filled, return old chip first
      const newMatches = { ...selectedMatches, [left]: right };
      setActiveChip(null);
      onMatch(newMatches);
    };

    const getSlotState = (left: string): string => {
      if (disabled && correctMatches) {
        const correctRight = pairs.find(p => p.left === left)?.right;
        if (selectedMatches[left] === correctRight) return 'correct';
        if (selectedMatches[left] && selectedMatches[left] !== correctRight) return 'incorrect';
      }
      if (selectedMatches[left]) return 'filled';
      return '';
    };

    const getChipState = (right: string): string => {
      if (disabled && correctMatches) {
        const isCorrectlyMatched = Object.entries(selectedMatches).some(([left, r]) => {
          if (r !== right) return false;
          return pairs.find(p => p.left === left)?.right === right;
        });
        const isIncorrectlyMatched = assignedValues.has(right) && !isCorrectlyMatched;
        if (isCorrectlyMatched) return 'correct';
        if (isIncorrectlyMatched) return 'incorrect';
      }
      if (activeChip === right) return 'active';
      return '';
    };

    return (
      <div ref={ref} className={`match-container ${className}`.trim()}>
        <div className="match-prompt-list">
          {pairs.map(pair => {
            const slotState = getSlotState(pair.left);
            const filledRight = selectedMatches[pair.left];
            const chipState = filledRight ? getChipState(filledRight) : '';
            return (
              <div key={pair.left} className="match-prompt-row">
                <span className="match-prompt-text">{pair.left}</span>
                <div
                  className={`match-slot ${slotState} ${chipState}`.trim()}
                  onClick={() => handleSlotClick(pair.left)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, pair.left)}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  aria-label={filledRight ? `${pair.left} matched with ${filledRight}. Tap to remove.` : `Empty slot for ${pair.left}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSlotClick(pair.left);
                    }
                  }}
                >
                  {filledRight ? (
                    <span className="match-slot-chip">{filledRight}</span>
                  ) : (
                    <span className="match-slot-empty">drop here</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {(!disabled || availableChips.length > 0) && (
          <div className="match-word-bank">
            <span className="match-word-bank-label">Word Bank</span>
            <div className="match-word-bank-chips">
              {availableChips.map(right => {
                const state = getChipState(right);
                return (
                  <div
                    key={right}
                    className={`match-chip ${state}`.trim()}
                    onClick={() => handleChipClick(right)}
                    draggable={!disabled}
                    onDragStart={(e) => handleDragStart(e, right)}
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    aria-label={right}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleChipClick(right);
                      }
                    }}
                  >
                    {right}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!disabled && (
          <p className="match-hint">
            {activeChip ? `Tap a slot to place "${activeChip}"` : 'Tap a chip, then tap a slot. Or drag and drop.'}
          </p>
        )}
      </div>
    );
  }
);

// Styles for this component (add to globals.css or a CSS module)
// These match the reference styles.css lines 952-1127
const styles = `
.answer-options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xl);
}

.answer-option {
  display: flex;
  align-items: flex-start;
  padding: var(--spacing-md);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-height: var(--touch-target);
  background: var(--color-bg-card);
}

.answer-option:hover:not(.disabled) {
  border-color: var(--color-primary-light);
  background: var(--color-primary-subtle);
}

.answer-option.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-subtle);
}

.answer-option.correct {
  border-color: var(--color-correct);
  background: var(--color-correct-bg);
}

.answer-option.incorrect {
  border-color: var(--color-incorrect);
  background: var(--color-incorrect-bg);
}

.answer-option.disabled {
  cursor: default;
}

.answer-option-marker {
  width: 32px;
  height: 32px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-sm);
  margin-right: var(--spacing-md);
  flex-shrink: 0;
  transition: all var(--transition-fast);
  background: var(--color-bg-hover);
  color: var(--color-text-muted);
}

.answer-option:hover:not(.disabled) .answer-option-marker {
  border-color: var(--color-primary-light);
  background: var(--color-primary-subtle);
  color: var(--color-primary);
}

.answer-option.selected .answer-option-marker {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: var(--color-text-inverse);
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
}

.answer-option.correct .answer-option-marker {
  border-color: var(--color-correct);
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: var(--color-text-inverse);
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
}

.answer-option.incorrect .answer-option-marker {
  border-color: var(--color-incorrect);
  background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
  color: var(--color-text-inverse);
  box-shadow: 0 2px 8px rgba(248, 113, 113, 0.3);
}

.answer-option-text {
  flex: 1;
  padding-top: 3px;
  line-height: var(--line-height-normal);
}

/* True/False options */
.true-false-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

/* Fill in the blank */
.fill-blank-input {
  width: 100%;
  padding: var(--spacing-md);
  font-size: var(--font-size-md);
  font-family: inherit;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  transition: all var(--transition-fast);
}

.fill-blank-input:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 3px var(--color-primary-subtle);
}

.fill-blank-input.correct {
  border-color: var(--color-correct);
  background: var(--color-correct-bg);
}

.fill-blank-input.incorrect {
  border-color: var(--color-incorrect);
  background: var(--color-incorrect-bg);
}

/* Ordering interface */
.ordering-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.ordering-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-md);
  background: var(--color-bg-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: grab;
  transition: all var(--transition-fast);
}

.ordering-item:active {
  cursor: grabbing;
}

.ordering-item.dragging {
  opacity: 0.5;
  border-style: dashed;
}

.ordering-item.disabled {
  cursor: default;
}

.ordering-item-handle {
  width: 24px;
  margin-right: var(--spacing-md);
  color: var(--color-text-muted);
}

.ordering-item-number {
  width: 28px;
  height: 28px;
  background: var(--color-bg-hover);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
  margin-right: var(--spacing-md);
  flex-shrink: 0;
}

/* Match interface — drag-to-slot */
.match-container {
  margin-bottom: var(--spacing-xl);
}

.match-prompt-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.match-prompt-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.match-prompt-text {
  flex: 1;
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-normal);
  min-width: 0;
  word-break: break-word;
}

.match-slot {
  flex: 1;
  min-height: 44px;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  background: var(--color-bg-card);
  display: flex;
  align-items: center;
  justify-content: center;
}

.match-slot:hover:not([aria-disabled="true"]) {
  border-color: var(--color-primary-light);
  background: var(--color-primary-subtle);
}

.match-slot.filled {
  border-style: solid;
  border-color: var(--color-primary-light);
  background: var(--color-primary-subtle);
}

.match-slot.correct {
  border-style: solid;
  border-color: var(--color-correct);
  background: var(--color-correct-bg);
}

.match-slot.incorrect {
  border-style: solid;
  border-color: var(--color-incorrect);
  background: var(--color-incorrect-bg);
}

.match-slot-chip {
  font-weight: var(--font-weight-medium);
}

.match-slot-empty {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  font-style: italic;
}

.match-word-bank {
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
}

.match-word-bank-label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-muted);
  margin-bottom: var(--spacing-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.match-word-bank-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.match-chip {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 2px solid var(--color-border);
  border-radius: 999px;
  cursor: grab;
  transition: all var(--transition-fast);
  background: var(--color-bg-card);
  font-weight: var(--font-weight-medium);
  user-select: none;
}

.match-chip:hover {
  border-color: var(--color-primary-light);
  background: var(--color-primary-subtle);
}

.match-chip.active {
  border-color: var(--color-primary);
  background: var(--color-primary-subtle);
  box-shadow: 0 0 0 2px var(--color-primary-subtle);
}

.match-chip:active {
  cursor: grabbing;
}

.match-hint {
  text-align: center;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-md);
}
`;

export default AnswerOptions;
