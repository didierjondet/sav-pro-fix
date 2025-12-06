import { useState } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, Plus, X, Sparkles, Settings } from 'lucide-react';
import { useStatisticsConfig } from '@/hooks/useStatisticsConfig';
import { AIWidgetCreator } from './AIWidgetCreator';
import { AIWidgetEditor } from './AIWidgetEditor';
import { CustomWidgetList } from './CustomWidgetList';
import { WidgetConfigDialog } from './WidgetConfigDialog';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface WidgetManagerProps {
  onClose?: () => void;
}

export function WidgetManager({ onClose }: WidgetManagerProps) {
  const { modules, updateModule, deleteCustomWidget, refetch } = useStatisticsConfig();
  const [showCreator, setShowCreator] = useState(false);
  const [editingWidget, setEditingWidget] = useState<any | null>(null);
  const [deleteWidgetId, setDeleteWidgetId] = useState<string | null>(null);
  const [configWidgetId, setConfigWidgetId] = useState<string | null>(null);
  const [configWidgetTitle, setConfigWidgetTitle] = useState<string>('');

  // Catégoriser les widgets en sections
  const dashboardModules = modules.filter(m => 
    !m.isCustom && [
      'sav-types-grid',
      'finance-kpis',
      'storage-usage',
      'monthly-profitability',
      'annual-stats'
    ].includes(m.id)
  );

  const advancedModules = modules.filter(m => 
    !m.isCustom && [
      'financial-overview',
      'performance-trends',
      'parts-usage-heatmap'
    ].includes(m.id)
  );

  const statisticsModules = modules.filter(m => 
    !m.isCustom && 
    ![
      'sav-types-grid',
      'finance-kpis',
      'storage-usage',
      'monthly-profitability',
      'annual-stats',
      'financial-overview',
      'performance-trends',
      'parts-usage-heatmap'
    ].includes(m.id)
  );

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
      {/* Section 1 : Widgets Dashboard */}
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          📊 Widgets Dashboard
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Widgets affichés sur la page principale (/dashboard)
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
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfigWidgetId(module.id);
                        setConfigWidgetTitle(module.name);
                      }}
                      className="h-8 w-8"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Switch
                      checked={module.enabled}
                      onCheckedChange={() => handleToggle(module.id, module.enabled)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* Section 2 : Widgets Statistiques Avancés */}
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          📈 Widgets Statistiques Avancés
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Widgets combinés pour analyses détaillées (page /statistics)
        </p>
        <div className="grid gap-3">
          {advancedModules.map((module) => (
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
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfigWidgetId(module.id);
                        setConfigWidgetTitle(module.name);
                      }}
                      className="h-8 w-8"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Switch
                      checked={module.enabled}
                      onCheckedChange={() => handleToggle(module.id, module.enabled)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* Section 3 : Widgets Statistiques */}
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          📉 Widgets Statistiques
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          KPIs et graphiques pour analyses (page /statistics)
        </p>
        <div className="grid gap-3">
          {statisticsModules.map((module) => (
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
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfigWidgetId(module.id);
                        setConfigWidgetTitle(module.name);
                      }}
                      className="h-8 w-8"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Switch
                      checked={module.enabled}
                      onCheckedChange={() => handleToggle(module.id, module.enabled)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* Section 4 : Widgets personnalisés */}
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
            variant={(showCreator || editingWidget) ? "ghost" : "outline"}
            onClick={() => {
              if (showCreator || editingWidget) {
                setShowCreator(false);
                setEditingWidget(null);
              } else {
                setShowCreator(true);
              }
            }}
            disabled={!!editingWidget}
          >
            {(showCreator || editingWidget) ? (
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

        {/* Formulaire de création ou édition (conditionnel) */}
        {showCreator && (
          <div className="mb-4 p-4 border rounded-lg bg-muted/20">
            <AIWidgetCreator 
              onSuccess={async () => {
                await refetch(); // Attendre le rechargement des données
                setShowCreator(false);
                toast.success('Widget créé avec succès !');
              }}
              onCancel={() => setShowCreator(false)}
            />
          </div>
        )}

        {editingWidget && (
          <div className="mb-4 p-4 border rounded-lg bg-purple-50/50">
            <AIWidgetEditor
              widget={editingWidget}
              onSuccess={async () => {
                await refetch(); // Attendre le rechargement des données
                setEditingWidget(null);
                toast.success('Widget modifié avec succès !');
              }}
              onCancel={() => setEditingWidget(null)}
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
            chart_type: m.chart_type,
            data_config: m.data_config,
            display_config: m.display_config
          }))}
          onEdit={(widget) => {
            setShowCreator(false);
            setEditingWidget(widget);
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

      {/* Dialog de configuration des widgets */}
      <WidgetConfigDialog
        open={!!configWidgetId}
        onOpenChange={(open) => {
          if (!open) {
            setConfigWidgetId(null);
            setConfigWidgetTitle('');
          }
        }}
        widgetId={configWidgetId || ''}
        widgetTitle={configWidgetTitle}
      />
    </div>
  );
}