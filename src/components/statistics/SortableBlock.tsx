import { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';

interface SortableBlockProps {
  id: string;
  children: ReactNode;
  onRemove?: () => void;
}

export const SortableBlock = ({ id, children, onRemove }: SortableBlockProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  return (
    <div ref={setNodeRef} style={style} className={`relative ${isDragging ? 'opacity-70' : ''}`}>
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-2 left-2 z-10 rounded p-1 bg-background/80 border hover:bg-destructive hover:text-destructive-foreground cursor-pointer transition-colors"
          aria-label="Masquer le widget"
          title="Masquer ce widget"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <button
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 rounded p-1 bg-background/80 border hover:bg-accent cursor-grab active:cursor-grabbing"
        aria-label="Déplacer la section"
        title="Glisser pour réorganiser"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>
      {children}
    </div>
  );
};