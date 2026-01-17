import { SubjectCard } from './subject-card';
import { classLevelToSlug } from '@/lib/curriculum/config';

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color?: string;
}

export interface SubjectSelectorProps {
  boardId: string;
  classLevel: number;
  subjects: Subject[];
}

/**
 * SubjectSelector - Grid of SubjectCard components
 * Shows available subjects for the selected board and class
 * Server component - no client-side interactivity needed
 */
export function SubjectSelector({ boardId, classLevel, subjects }: SubjectSelectorProps) {
  const classSlug = classLevelToSlug(classLevel);

  return (
    <div className="browse-grid" role="list" aria-label="Available subjects">
      {subjects.map((subject) => (
        <div key={subject.id} role="listitem">
          <SubjectCard
            subjectId={subject.id}
            name={subject.name}
            icon={subject.icon}
            color={subject.color}
            href={`/browse/${boardId}/${classSlug}/${subject.id}`}
          />
        </div>
      ))}
    </div>
  );
}
