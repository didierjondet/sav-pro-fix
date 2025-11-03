import { useState } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, Plus, X, Sparkles } from 'lucide-react';
import { useStatisticsConfig } from '@/hooks/useStatisticsConfig';
import { AIWidgetCreator } from './AIWidgetCreator';
import { CustomWidgetList } from './CustomWidgetList';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface WidgetManagerProps {
  availableModuleIds: string[];
  onClose?: () => void;
}

export function WidgetManager({ availableModuleIds }: WidgetManagerProps) {
  const { modules, updateModule, deleteCustomWidget, refetch } = useStatisticsConfig();
  const [showCreator, setShowCreator] = useState(false);
  const [deleteWidgetId, setDeleteWidgetId] = useState<string | null>(null);

  const dashboardModules = modules.filter(m => !m.isCustom && availableModuleIds.includes(m.id));
  const customWidgets = modules.filter(m => m.isCustom);

  const handleToggle = (moduleId: string, currentEnabled: boolean) => {
    updateModule(moduleId, { enabled: !currentEnabled });
  };

  const confirmDelete = async () => {
    if (!deleteWidgetId) return;
    await deleteCustomWidget(deleteWidgetId);
    toast.success('Widget supprimé');
    setDeleteWidgetId(null);
  };

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      {/* Section 1 : Widgets standards */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Widgets standards</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Activez ou désactivez les widgets prédéfinis.
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
                    onCheckedChange={() => handleToggle(module.id, module.enabled)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* Section 2 : Widgets personnalisés */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Widgets personnalisés
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Créez des widgets sur-mesure avec l'IA.
            </p>
          </div>
          <Button 
            variant={showCreator ? "ghost" : "outline"}
            onClick={() => setShowCreator(!showCreator)}
          >
            {showCreator ? (
              <>
                <X className="mr-2 h-4 w-4" />
                Annuler
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Créer un widget
              </>
            )}
          </Button>
        </div>

        {/* Formulaire de création (conditionnel) */}
        {showCreator && (
          <div className="mb-4 p-4 border rounded-lg bg-muted/20">
            <AIWidgetCreator 
              onSuccess={() => {
                setShowCreator(false);
                refetch();
                toast.success('Widget créé avec succès !');
              }}
              onCancel={() => setShowCreator(false)}
            />
          </div>
        )}

        {/* Liste des widgets personnalisés */}
        <CustomWidgetList 
          widgets={customWidgets.map(m => ({
            id: m.customWidgetId!,
            name: m.name,
            description: m.description,
            original_prompt: m.originalPrompt!,
            enabled: m.enabled,
            widget_type: m.widget_type!,
          }))}
          onEdit={() => {
            toast.info('Modification à venir');
          }}
          onDelete={setDeleteWidgetId}
          onToggle={(id, enabled) => updateModule(`custom-${id}`, { enabled })}
        />
      </div>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!deleteWidgetId} onOpenChange={() => setDeleteWidgetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce widget ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le widget sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}