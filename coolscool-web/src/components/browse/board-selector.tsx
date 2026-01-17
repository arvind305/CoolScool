import { BoardCard } from './board-card';

export interface Board {
  id: string;
  name: string;
  fullName: string;
  description?: string;
}

export interface BoardSelectorProps {
  boards: Board[];
}

/**
 * BoardSelector - Grid of BoardCard components
 * Shows all available education boards
 * Server component - no client-side interactivity needed
 */
export function BoardSelector({ boards }: BoardSelectorProps) {
  return (
    <div className="browse-grid" role="list" aria-label="Available education boards">
      {boards.map((board) => (
        <div key={board.id} role="listitem">
          <BoardCard
            boardId={board.id}
            name={board.name}
            fullName={board.fullName}
            description={board.description}
            href={`/browse/${board.id}`}
          />
        </div>
      ))}
    </div>
  );
}
