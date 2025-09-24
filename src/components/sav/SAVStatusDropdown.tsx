import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { ChevronDown } from 'lucide-react';

interface SAVStatusDropdownProps {
  currentStatus: string;
  onStatusChange: (newStatus: string) => void;
  disabled?: boolean;
}

export function SAVStatusDropdown({ currentStatus, onStatusChange, disabled = false }: SAVStatusDropdownProps) {
  const { getStatusInfo, statuses } = useShopSAVStatuses();
  
  const currentStatusInfo = getStatusInfo(currentStatus);
  
  // Filtrer les statuts actifs et les trier par ordre d'affichage
  const availableStatuses = statuses
    .filter(status => status.is_active)
    .sort((a, b) => a.display_order - b.display_order);

  if (disabled) {
    // Si désactivé, afficher seulement le badge sans dropdown
    return (
      <Badge style={currentStatusInfo.color ? {
        backgroundColor: `${currentStatusInfo.color}20`,
        color: currentStatusInfo.color,
        borderColor: currentStatusInfo.color
      } : undefined}>
        {currentStatusInfo.label}
      </Badge>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center gap-1 cursor-pointer group">
          <Badge 
            className="transition-all group-hover:opacity-80"
            style={currentStatusInfo.color ? {
              backgroundColor: `${currentStatusInfo.color}20`,
              color: currentStatusInfo.color,
              borderColor: currentStatusInfo.color
            } : undefined}
          >
            {currentStatusInfo.label}
          </Badge>
          <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="start" 
        className="w-48 bg-background border shadow-lg z-50"
      >
        {availableStatuses.map((status) => {
          const isCurrentStatus = status.status_key === currentStatus;
          
          return (
            <DropdownMenuItem
              key={status.status_key}
              onClick={() => {
                if (!isCurrentStatus) {
                  onStatusChange(status.status_key);
                }
              }}
              className={`cursor-pointer ${isCurrentStatus ? 'bg-muted opacity-50' : 'hover:bg-muted'}`}
              disabled={isCurrentStatus}
            >
              <div className="flex items-center gap-2 w-full">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: status.status_color }}
                />
                <span className={isCurrentStatus ? 'font-medium' : ''}>
                  {status.status_label}
                </span>
                {isCurrentStatus && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    (actuel)
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}