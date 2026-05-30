import { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Info, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useWidgetConfiguration } from '@/hooks/useWidgetConfiguration';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';
import { getWidgetGridClasses, getWidgetMinHeightStyle } from './StatisticsWidgetSizes';
import { cn } from '@/lib/utils';

interface SortableBlockProps {
  id: string;
  children: ReactNode;
  onRemove?: () => void;
  editable?: boolean;
}

export const SortableBlock = ({ id, children, onRemove, editable = false }: SortableBlockProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !editable });
  const { config } = useWidgetConfiguration(id);
  const { statuses } = useShopSAVStatuses();
  const { types } = useShopSAVTypes();

  // Taille imposée par widget (catalogue par id)
  const gridClasses = getWidgetGridClasses(id);
  const minHStyle = getWidgetMinHeightStyle(id);


  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...minHStyle,
  } as React.CSSProperties;
...
  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "relative min-w-0 isolate flex flex-col",
        // Hauteur MINIMALE responsive (le contenu peut grandir, jamais être coupé)
        "min-h-[var(--w-min-h-sm)] lg:min-h-[var(--w-min-h-lg)]",
        gridClasses,
        isDragging ? "z-50 opacity-70" : "z-0"
      )}
    >

      {editable && onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-2 left-2 z-10 rounded p-1 bg-background/80 border hover:bg-destructive hover:text-destructive-foreground cursor-pointer transition-colors"
          aria-label="Masquer le widget"
          title="Masquer ce widget"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        {config && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-1 hover:bg-muted rounded cursor-help" aria-label="Configuration du widget">
                  <Info className="w-4 h-4 text-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs z-50">
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="font-semibold">Période:</span> {getTemporalityLabel(config.temporality)}
                  </div>
                  <div>
                    <span className="font-semibold">Statuts:</span> {getStatusLabels(config.sav_statuses_filter)}
                  </div>
                  <div>
                    <span className="font-semibold">Types:</span> {getTypeLabels(config.sav_types_filter)}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {editable && (
          <button
            {...attributes}
            {...listeners}
            className="rounded p-1 bg-background/80 border hover:bg-accent cursor-grab active:cursor-grabbing"
            aria-label="Déplacer la section"
            title="Glisser pour réorganiser"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="w-full flex-1 min-h-0 flex flex-col">
        {children}
      </div>
    </div>
  );
};
