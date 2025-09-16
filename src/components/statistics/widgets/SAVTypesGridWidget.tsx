import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Smartphone, 
  Tablet, 
  Laptop, 
  Watch, 
  Headphones, 
  Camera,
  Plus,
  TrendingUp,
  Clock
} from 'lucide-react';

interface SAVType {
  id: string;
  name: string;
  count: number;
  averageTime: number;
  trend: 'up' | 'down' | 'stable';
  color: string;
  icon: string;
}

interface SAVTypesGridWidgetProps {
  savTypes: SAVType[];
  totalSAV: number;
  onCreateNewSAV?: (typeId: string) => void;
}

export const SAVTypesGridWidget = ({
  savTypes,
  totalSAV,
  onCreateNewSAV
}: SAVTypesGridWidgetProps) => {

  const getIcon = (iconName: string) => {
    const iconMap: Record<string, any> = {
      'smartphone': Smartphone,
      'tablet': Tablet,
      'laptop': Laptop,
      'watch': Watch,
      'headphones': Headphones,
      'camera': Camera
    };
    
    const Icon = iconMap[iconName] || Smartphone;
    return <Icon className="w-5 h-5" />;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'down': return <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />;
      default: return <TrendingUp className="w-3 h-3 text-gray-500" />;
    }
  };

  const formatTime = (hours: number) => {
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}j ${remainingHours}h` : `${days}j`;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Types de SAV
          </div>
          <Badge variant="outline" className="text-xs">
            {totalSAV} total
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-2">
          {savTypes.map((type) => (
            <Button
              key={type.id}
              variant="ghost"
              className="h-auto p-3 flex flex-col items-start text-left border border-border hover:bg-accent/50 transition-colors"
              onClick={() => onCreateNewSAV?.(type.id)}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <div className="flex items-center gap-2" style={{ color: type.color }}>
                  {getIcon(type.icon)}
                  <span className="font-medium text-xs truncate">{type.name}</span>
                </div>
                {getTrendIcon(type.trend)}
              </div>
              
              <div className="w-full space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Nombre</span>
                  <span className="font-bold">{type.count}</span>
                </div>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-2 h-2" />
                    Temps moy.
                  </span>
                  <span className="font-medium">{formatTime(type.averageTime)}</span>
                </div>
                
                <div className="w-full bg-secondary/30 rounded-full h-1 mt-2">
                  <div 
                    className="h-1 rounded-full transition-all"
                    style={{ 
                      width: `${Math.min((type.count / Math.max(...savTypes.map(s => s.count))) * 100, 100)}%`,
                      backgroundColor: type.color 
                    }}
                  />
                </div>
              </div>
            </Button>
          ))}
          
          {/* Bouton ajouter nouveau type */}
          <Button
            variant="outline"
            className="h-auto p-3 flex flex-col items-center justify-center text-center border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-accent/30 transition-colors"
            onClick={() => onCreateNewSAV?.('new')}
          >
            <Plus className="w-5 h-5 text-muted-foreground mb-1" />
            <span className="text-xs text-muted-foreground">Nouveau SAV</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};