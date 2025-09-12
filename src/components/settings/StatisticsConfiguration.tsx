import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStatisticsConfig } from '@/hooks/useStatisticsConfig';
import { BarChart3, LineChart, PieChart, TrendingUp } from 'lucide-react';

const getModuleIcon = (moduleId: string) => {
  if (moduleId.includes('chart')) return <LineChart className="w-4 h-4" />;
  if (moduleId.includes('kpi')) return <TrendingUp className="w-4 h-4" />;
  if (moduleId.includes('top-')) return <BarChart3 className="w-4 h-4" />;
  return <PieChart className="w-4 h-4" />;
};

export const StatisticsConfiguration = () => {
  const { modules, loading, updateModule } = useStatisticsConfig();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-4 bg-muted animate-pulse rounded" />
        <div className="h-4 bg-muted animate-pulse rounded" />
        <div className="h-4 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Modules de statistiques
        </CardTitle>
        <CardDescription>
          Configurez les modules affichés sur votre tableau de bord. Vous pourrez réorganiser leur ordre directement sur la page de statistiques.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {modules.map((module) => (
            <div
              key={module.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-muted-foreground">
                  {getModuleIcon(module.id)}
                </div>
                <div className="flex-1">
                  <Label htmlFor={`module-${module.id}`} className="font-medium cursor-pointer">
                    {module.name}
                  </Label>
                  <div className="text-sm text-muted-foreground">
                    {module.description}
                  </div>
                </div>
              </div>
              <Switch
                id={`module-${module.id}`}
                checked={module.enabled}
                onCheckedChange={(enabled) => 
                  updateModule(module.id, { enabled })
                }
              />
            </div>
          ))}
        </div>
        <div className="mt-6 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Astuce :</strong> Les modules activés apparaîtront sur votre tableau de bord avec des icônes de déplacement pour réorganiser leur ordre par glisser-déposer.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};