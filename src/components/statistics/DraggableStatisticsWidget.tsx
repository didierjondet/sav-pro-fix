import { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GripVertical, Info } from 'lucide-react';
import { useWidgetConfiguration } from '@/hooks/useWidgetConfiguration';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';

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
  const { config } = useWidgetConfiguration(id);
  const { statuses } = useShopSAVStatuses();
  const { types } = useShopSAVTypes();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEnabled });

  const getTemporalityLabel = (temp: string) => {
    switch (temp) {
      case 'monthly': return 'Mensuel (30 derniers jours)';
      case 'quarterly': return 'Trimestriel (3 derniers mois)';
      case 'yearly': return 'Annuel (12 derniers mois)';
      default: return 'Non configuré';
    }
  };

  const getStatusLabels = (statusKeys: string[] | null | undefined) => {
    if (!statusKeys || statusKeys.length === 0) return 'Tous les statuts';
    return statusKeys
      .map(key => statuses.find(s => s.status_key === key)?.status_label)
      .filter(Boolean)
      .join(', ');
  };

  const getTypeLabels = (typeKeys: string[] | null | undefined) => {
    if (!typeKeys || typeKeys.length === 0) return 'Tous les types';
    return typeKeys
      .map(key => types.find(t => t.type_key === key)?.type_label)
      .filter(Boolean)
      .join(', ');
  };

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
      className={`relative h-full ${className}`}
    >
      <Card className={`h-full overflow-hidden ${isDragging ? 'opacity-50' : ''} transition-opacity`}>
        <CardHeader className="relative py-3">
          <CardTitle className="flex items-center justify-between gap-2 text-sm sm:text-base">
            <span className="flex-1 truncate">{title}</span>
            <div className="flex items-center gap-1 shrink-0">
              {config && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-1 hover:bg-muted rounded cursor-help">
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
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
                title="Glisser pour réorganiser"
              >
                <GripVertical className="w-4 h-4 text-foreground" />
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100%-60px)] overflow-hidden p-3 pt-0">
          {children}
        </CardContent>
      </Card>
    </div>
  );
};