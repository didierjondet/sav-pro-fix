import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useStatisticsConfig } from '@/hooks/useStatisticsConfig';
import { Eye, EyeOff } from 'lucide-react';

interface WidgetManagerProps {
  availableModuleIds: string[];
  onClose?: () => void;
}

export function WidgetManager({ availableModuleIds }: WidgetManagerProps) {
  const { modules, updateModule } = useStatisticsConfig();
  
  const dashboardModules = modules
    .filter(m => availableModuleIds.includes(m.id))
    .sort((a, b) => a.order - b.order);

  const handleToggle = (moduleId: string, currentEnabled: boolean) => {
    updateModule(moduleId, { enabled: !currentEnabled });
  };

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
      <p className="text-sm text-muted-foreground">
        Activez ou désactivez les widgets à afficher sur votre Dashboard.
      </p>
      
      <div className="grid gap-3">
        {dashboardModules.map((module) => (
          <Card 
            key={module.id}
            className={`cursor-pointer transition-all ${
              module.enabled 
                ? 'border-primary bg-primary/5' 
                : 'border-muted hover:border-border'
            }`}
            onClick={() => handleToggle(module.id, module.enabled)}
          >
            <CardHeader className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    {module.enabled ? (
                      <Eye className="h-4 w-4 text-primary" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    {module.name}
                  </CardTitle>
                  <CardDescription className="text-sm mt-1">
                    {module.description}
                  </CardDescription>
                </div>
                <Switch
                  checked={module.enabled}
                  onCheckedChange={(checked) => handleToggle(module.id, module.enabled)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
