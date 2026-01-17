import { ClassCard } from './class-card';
import { classLevelToSlug } from '@/lib/curriculum/config';

export interface ClassSelectorProps {
  boardId: string;
  classes: readonly number[] | number[];
}

/**
 * ClassSelector - Grid of ClassCard components
 * Shows classes 1-12 for the selected board
 * Server component - no client-side interactivity needed
 */
export function ClassSelector({ boardId, classes }: ClassSelectorProps) {
  return (
    <div className="browse-grid browse-grid-classes" role="list" aria-label="Available classes">
      {classes.map((classLevel) => (
        <div key={classLevel} role="listitem">
          <ClassCard
            classLevel={classLevel}
            boardId={boardId}
            href={`/browse/${boardId}/${classLevelToSlug(classLevel)}`}
          />
        </div>
      ))}
    </div>
  );
}
