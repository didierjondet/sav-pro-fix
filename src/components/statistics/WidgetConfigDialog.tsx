import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useWidgetConfiguration } from '@/hooks/useWidgetConfiguration';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WidgetConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgetId: string;
  widgetTitle: string;
}

export function WidgetConfigDialog({ open, onOpenChange, widgetId, widgetTitle }: WidgetConfigDialogProps) {
  const { config, upsertConfig } = useWidgetConfiguration(widgetId);
  const { statuses } = useShopSAVStatuses();
  const { types } = useShopSAVTypes();

  const [temporality, setTemporality] = useState<'monthly' | 'monthly_calendar' | 'quarterly' | 'yearly'>('monthly');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // Charger la configuration existante ou réinitialiser aux valeurs par défaut
  useEffect(() => {
    if (open) {
      if (config) {
        // Charger la config du widget actuel
        setTemporality(config.temporality);
        setSelectedStatuses(config.sav_statuses_filter || []);
        setSelectedTypes(config.sav_types_filter || []);
      } else {
        // Pas de config = réinitialiser aux défauts
        setTemporality('monthly');
        setSelectedStatuses([]);
        setSelectedTypes([]);
      }
    }
  }, [config, widgetId, open]);

  const handleSave = async () => {
    await upsertConfig({
      temporality,
      sav_statuses_filter: selectedStatuses.length > 0 ? selectedStatuses : null,
      sav_types_filter: selectedTypes.length > 0 ? selectedTypes : null,
    });
    onOpenChange(false);
  };

  const toggleStatus = (statusKey: string) => {
    setSelectedStatuses(prev =>
      prev.includes(statusKey)
        ? prev.filter(s => s !== statusKey)
        : [...prev, statusKey]
    );
  };

  const toggleType = (typeKey: string) => {
    setSelectedTypes(prev =>
      prev.includes(typeKey)
        ? prev.filter(t => t !== typeKey)
        : [...prev, typeKey]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Configuration: {widgetTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4">
          <div className="space-y-6 py-2">
            {/* Temporalité */}
            <div className="space-y-2">
              <Label>Temporalité des données</Label>
              <Select value={temporality} onValueChange={(value: any) => setTemporality(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensuel glissant (30 derniers jours)</SelectItem>
                  <SelectItem value="monthly_calendar">Mensuel calendaire (depuis le 1er du mois)</SelectItem>
                  <SelectItem value="quarterly">Trimestriel (3 derniers mois)</SelectItem>
                  <SelectItem value="yearly">Annuel (12 derniers mois)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtres par statut */}
            <div className="space-y-2">
              <Label>Statuts SAV à inclure</Label>
              <p className="text-xs text-muted-foreground">Laisser vide pour inclure tous les statuts</p>
              <div className="max-h-36 overflow-y-auto border rounded-md p-3">
                <div className="space-y-2">
                  {statuses.map((status) => (
                    <div key={status.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${status.id}`}
                        checked={selectedStatuses.includes(status.status_key)}
                        onCheckedChange={() => toggleStatus(status.status_key)}
                      />
                      <Label
                        htmlFor={`status-${status.id}`}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.status_color }}
                        />
                        {status.status_label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Filtres par type */}
            <div className="space-y-2">
              <Label>Types SAV à inclure</Label>
              <p className="text-xs text-muted-foreground">Laisser vide pour inclure tous les types</p>
              <div className="max-h-36 overflow-y-auto border rounded-md p-3">
                <div className="space-y-2">
                  {types.map((type) => (
                    <div key={type.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`type-${type.id}`}
                        checked={selectedTypes.includes(type.type_key)}
                        onCheckedChange={() => toggleType(type.type_key)}
                      />
                      <Label
                        htmlFor={`type-${type.id}`}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: type.type_color }}
                        />
                        {type.type_label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
