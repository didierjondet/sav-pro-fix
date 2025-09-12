import { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';

interface DraggableStatisticsWidgetProps {
  id: string;
  title: string;
  children: ReactNode;
  isEnabled: boolean;
  className?: string;
}

export const DraggableStatisticsWidget = ({ 
  id, 
  title, 
  children, 
  isEnabled,
  className = ""
}: DraggableStatisticsWidgetProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEnabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!isEnabled) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${className}`}
    >
      <Card className={`${isDragging ? 'opacity-50' : ''} transition-opacity`}>
        <CardHeader className="relative">
          <CardTitle className="flex items-center justify-between">
            {title}
            <div
              {...attributes}
              {...listeners}
              className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
              title="Glisser pour réorganiser"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
      </Card>
    </div>
  );
};