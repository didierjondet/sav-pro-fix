import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, LineChart, PieChart, Activity, TrendingUp, Package } from 'lucide-react';

interface WidgetPreviewProps {
  config: any;
}

export const WidgetPreview = ({ config }: WidgetPreviewProps) => {
  const getIconForWidget = () => {
    const iconName = config.display_config?.icon;
    switch (iconName) {
      case 'TrendingUp':
        return <TrendingUp className="h-8 w-8" />;
      case 'Package':
        return <Package className="h-8 w-8" />;
      case 'Activity':
        return <Activity className="h-8 w-8" />;
      default:
        return <BarChart3 className="h-8 w-8" />;
    }
  };

  const getChartIcon = () => {
    switch (config.chart_type) {
      case 'line':
        return <LineChart className="h-16 w-16 text-muted-foreground" />;
      case 'bar':
        return <BarChart3 className="h-16 w-16 text-muted-foreground" />;
      case 'pie':
        return <PieChart className="h-16 w-16 text-muted-foreground" />;
      default:
        return <Activity className="h-16 w-16 text-muted-foreground" />;
    }
  };

  if (config.widget_type === 'kpi') {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Exemple de valeur</p>
              <p className="text-3xl font-bold mt-1">1,234</p>
              <p className="text-xs text-muted-foreground mt-1">
                +12.5% ce mois
              </p>
            </div>
            <div style={{ color: config.display_config?.color || 'hsl(var(--primary))' }}>
              {getIconForWidget()}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (config.widget_type === 'chart') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center h-32 text-center">
            {getChartIcon()}
            <p className="text-sm text-muted-foreground mt-2">
              Graphique {config.chart_type}
            </p>
            <p className="text-xs text-muted-foreground">
              (Prévisualisation avec données réelles après création)
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (config.widget_type === 'table') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex gap-2 text-xs font-semibold text-muted-foreground pb-2 border-b">
              <div className="flex-1">Colonne 1</div>
              <div className="flex-1">Colonne 2</div>
              <div className="flex-1">Colonne 3</div>
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-2 text-sm">
                <div className="flex-1 text-muted-foreground">Donnée {i}</div>
                <div className="flex-1 text-muted-foreground">Valeur {i}</div>
                <div className="flex-1 text-muted-foreground">Info {i}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground text-center">
          Prévisualisation non disponible
        </p>
      </CardContent>
    </Card>
  );
};