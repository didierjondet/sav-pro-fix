import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  HardDrive, 
  Image, 
  FileText, 
  Download,
  AlertTriangle,
  Trash2,
  Archive,
  ExternalLink
} from 'lucide-react';

interface StorageCategory {
  name: string;
  size: number;
  count: number;
  color: string;
  icon: string;
  percentage: number;
}

interface StorageUsageWidgetProps {
  totalUsed: number;
  totalLimit: number;
  categories: StorageCategory[];
  onManageStorage?: () => void;
  onCleanup?: () => void;
}

export const StorageUsageWidget = ({
  totalUsed,
  totalLimit,
  categories,
  onManageStorage,
  onCleanup
}: StorageUsageWidgetProps) => {

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const usagePercentage = (totalUsed / totalLimit) * 100;
  const isNearLimit = usagePercentage > 85;
  const isCritical = usagePercentage > 95;

  const getIcon = (iconName: string) => {
    const iconMap: Record<string, any> = {
      'image': Image,
      'document': FileText,
      'archive': Archive,
      'download': Download
    };
    
    const Icon = iconMap[iconName] || FileText;
    return <Icon className="w-4 h-4" />;
  };

  const getUsageStatus = () => {
    if (isCritical) return { text: 'Critique', variant: 'destructive' as const, icon: AlertTriangle };
    if (isNearLimit) return { text: 'Attention', variant: 'secondary' as const, icon: AlertTriangle };
    return { text: 'Normal', variant: 'default' as const, icon: HardDrive };
  };

  const status = getUsageStatus();

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4" />
            Stockage
          </div>
          <Badge variant={status.variant} className="text-xs flex items-center gap-1">
            <status.icon className="w-3 h-3" />
            {status.text}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Usage global */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span>Utilisé</span>
            <span className="font-semibold">
              {formatBytes(totalUsed)} / {formatBytes(totalLimit)}
            </span>
          </div>
          <Progress 
            value={usagePercentage} 
            className={`h-2 ${isCritical ? 'bg-red-100' : isNearLimit ? 'bg-yellow-100' : ''}`}
          />
          <div className="text-xs text-muted-foreground text-center">
            {Math.round(usagePercentage)}% utilisé • {formatBytes(totalLimit - totalUsed)} restant
          </div>
        </div>

        {/* Répartition par catégorie */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Répartition</h4>
          {categories.map((category) => (
            <div key={category.name} className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-1" style={{ color: category.color }}>
                  {getIcon(category.icon)}
                  <span className="text-xs truncate">{category.name}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  ({category.count})
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs font-medium">{formatBytes(category.size)}</div>
                <div className="w-8 h-2 bg-secondary/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all"
                    style={{ 
                      width: `${category.percentage}%`,
                      backgroundColor: category.color 
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCleanup}
            className="flex-1 text-xs"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Nettoyer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onManageStorage}
            className="flex-1 text-xs"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Gérer
          </Button>
        </div>

        {/* Alerte si critique */}
        {(isNearLimit || isCritical) && (
          <div className={`p-2 rounded-lg text-xs ${isCritical ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
            <div className="flex items-center gap-1 font-medium mb-1">
              <AlertTriangle className="w-3 h-3" />
              {isCritical ? 'Stockage presque plein' : 'Espace limité'}
            </div>
            <p>
              {isCritical 
                ? 'Libérez de l\'espace pour éviter les interruptions de service.' 
                : 'Pensez à nettoyer les anciens fichiers.'
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};