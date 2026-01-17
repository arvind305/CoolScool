/**
 * Curriculum Configuration
 * Multi-board/class structure for Cool S-Cool
 */

export const BOARDS = {
  icse: {
    id: 'icse',
    name: 'ICSE',
    fullName: 'Indian Certificate of Secondary Education',
    description: 'Comprehensive curriculum focusing on analytical skills',
  },
  cbse: {
    id: 'cbse',
    name: 'CBSE',
    fullName: 'Central Board of Secondary Education',
    description: 'National curriculum with NCERT-aligned content',
  },
  karnataka: {
    id: 'karnataka',
    name: 'Karnataka',
    fullName: 'Karnataka State Board',
    description: 'Karnataka state curriculum',
  },
} as const;

export type BoardId = keyof typeof BOARDS;

export const CLASSES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export type ClassLevel = (typeof CLASSES)[number];

export const SUBJECTS = {
  mathematics: {
    id: 'mathematics',
    name: 'Mathematics',
    icon: '+',
    color: '#7c3aed',
  },
  science: {
    id: 'science',
    name: 'Science',
    icon: '*',
    color: '#14b8a6',
  },
  english: {
    id: 'english',
    name: 'English',
    icon: 'A',
    color: '#f97316',
  },
  social_studies: {
    id: 'social_studies',
    name: 'Social Studies',
    icon: '#',
    color: '#ec4899',
  },
} as const;

export type SubjectId = keyof typeof SUBJECTS;

// Helper functions
export function getBoardById(id: string): (typeof BOARDS)[BoardId] | undefined {
  return BOARDS[id as BoardId];
}

export function getSubjectById(id: string): (typeof SUBJECTS)[SubjectId] | undefined {
  return SUBJECTS[id as SubjectId];
}

export function formatClassLevel(level: number): string {
  return `Class ${level}`;
}

export function parseClassLevel(slug: string): number | null {
  const match = slug.match(/^class-(\d+)$/);
  if (match) {
    const level = parseInt(match[1], 10);
    if (CLASSES.includes(level as ClassLevel)) {
      return level;
    }
  }
  return null;
}

export function classLevelToSlug(level: number): string {
  return `class-${level}`;
}
