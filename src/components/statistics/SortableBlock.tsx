import { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Info, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useWidgetConfiguration } from '@/hooks/useWidgetConfiguration';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';

interface SortableBlockProps {
  id: string;
  children: ReactNode;
  onRemove?: () => void;
}

export const SortableBlock = ({ id, children, onRemove }: SortableBlockProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const { config } = useWidgetConfiguration(id);
  const { statuses } = useShopSAVStatuses();
  const { types } = useShopSAVTypes();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  const getTemporalityLabel = (temp: string | null | undefined) => {
    switch (temp) {
      case 'monthly':
        return 'Mensuel (30 derniers jours)';
      case 'quarterly':
        return 'Trimestriel (3 derniers mois)';
      case 'yearly':
        return 'Annuel (12 derniers mois)';
      default:
        return 'Non configuré';
    }
  };

  const getStatusLabels = (statusKeys: string[] | null | undefined) => {
    if (!statusKeys || statusKeys.length === 0) return 'Tous les statuts';
    return statusKeys
      .map((key) => statuses.find((s) => s.status_key === key)?.status_label)
      .filter(Boolean)
      .join(', ');
  };

  const getTypeLabels = (typeKeys: string[] | null | undefined) => {
    if (!typeKeys || typeKeys.length === 0) return 'Tous les types';
    return typeKeys
      .map((key) => types.find((t) => t.type_key === key)?.type_label)
      .filter(Boolean)
      .join(', ');
  };

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

        <button
          {...attributes}
          {...listeners}
          className="rounded p-1 bg-background/80 border hover:bg-accent cursor-grab active:cursor-grabbing"
          aria-label="Déplacer la section"
          title="Glisser pour réorganiser"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {children}
    </div>
  );
};