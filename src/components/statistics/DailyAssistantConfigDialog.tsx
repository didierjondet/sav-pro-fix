import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useDailyAssistantConfig, DailyAssistantConfig } from '@/hooks/useDailyAssistantConfig';
import { useShop } from '@/hooks/useShop';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';
import { Loader2 } from 'lucide-react';

interface DailyAssistantConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DailyAssistantConfigDialog({ open, onOpenChange }: DailyAssistantConfigDialogProps) {
  const { shop } = useShop();
  const { statuses } = useShopSAVStatuses();
  const { types } = useShopSAVTypes();
  const { config, updateConfig, resetConfig, isUpdating } = useDailyAssistantConfig(shop?.id || null);

  const [localConfig, setLocalConfig] = useState<Partial<DailyAssistantConfig>>({});

  const effectiveConfig = { ...config, ...localConfig };

  const handleSave = () => {
    updateConfig(localConfig);
    setLocalConfig({});
    onOpenChange(false);
  };

  const handleReset = () => {
    resetConfig();
    setLocalConfig({});
    onOpenChange(false);
  };

  const toggleStatus = (statusKey: string) => {
    const current = localConfig.sav_statuses_included || config.sav_statuses_included;
    const updated = current.includes(statusKey)
      ? current.filter(s => s !== statusKey)
      : [...current, statusKey];
    setLocalConfig({ ...localConfig, sav_statuses_included: updated });
  };

  const toggleType = (typeKey: string) => {
    const current = localConfig.sav_types_included ?? config.sav_types_included ?? [];
    if (current.length === 0) {
      setLocalConfig({ ...localConfig, sav_types_included: [typeKey] });
    } else {
      const updated = current.includes(typeKey)
        ? current.filter(t => t !== typeKey)
        : [...current, typeKey];
      setLocalConfig({ ...localConfig, sav_types_included: updated.length > 0 ? updated : null });
    }
  };

  const toggleSection = (section: keyof typeof effectiveConfig.sections_enabled) => {
    setLocalConfig({
      ...localConfig,
      sections_enabled: {
        ...effectiveConfig.sections_enabled,
        [section]: !effectiveConfig.sections_enabled[section],
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuration de l'Assistant Quotidien IA</DialogTitle>
          <DialogDescription>
            Personnalisez l'analyse et les recommandations de votre assistant
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="filters" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="filters">Filtres SAV</TabsTrigger>
            <TabsTrigger value="priorities">Seuils & Priorités</TabsTrigger>
            <TabsTrigger value="style">Style & Affichage</TabsTrigger>
          </TabsList>

          {/* Onglet 1: Filtres SAV */}
          <TabsContent value="filters" className="space-y-4">
            <div className="space-y-3">
              <Label>Statuts SAV à analyser</Label>
              <div className="grid grid-cols-2 gap-2">
                {statuses.map(status => (
                  <div key={status.id} className="flex items-center space-x-2">
                    <Switch
                      checked={effectiveConfig.sav_statuses_included.includes(status.status_key)}
                      onCheckedChange={() => toggleStatus(status.status_key)}
                    />
                    <Label className="cursor-pointer">{status.status_label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Types SAV à analyser</Label>
              <p className="text-xs text-muted-foreground">
                Aucune sélection = tous les types inclus
              </p>
              <div className="grid grid-cols-2 gap-2">
                {types.map(type => (
                  <div key={type.id} className="flex items-center space-x-2">
                    <Switch
                      checked={
                        !effectiveConfig.sav_types_included ||
                        effectiveConfig.sav_types_included.includes(type.type_key)
                      }
                      onCheckedChange={() => toggleType(type.type_key)}
                    />
                    <Label className="cursor-pointer">{type.type_label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_age">Ancienneté minimale (jours)</Label>
              <Input
                id="min_age"
                type="number"
                min="0"
                value={localConfig.min_sav_age_days ?? config.min_sav_age_days}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, min_sav_age_days: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </TabsContent>

          {/* Onglet 2: Seuils & Priorités */}
          <TabsContent value="priorities" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="late_threshold">Seuil de retard SAV (jours)</Label>
              <Input
                id="late_threshold"
                type="number"
                min="1"
                value={localConfig.late_threshold_days ?? config.late_threshold_days}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, late_threshold_days: parseInt(e.target.value) || 3 })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock_threshold">Seuil de stock faible</Label>
              <Input
                id="stock_threshold"
                type="number"
                min="1"
                value={localConfig.low_stock_threshold ?? config.low_stock_threshold}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, low_stock_threshold: parseInt(e.target.value) || 5 })
                }
              />
            </div>

            <div className="space-y-3">
              <Label>Priorité d'analyse</Label>
              <RadioGroup
                value={localConfig.analysis_priority ?? config.analysis_priority}
                onValueChange={(value) =>
                  setLocalConfig({ ...localConfig, analysis_priority: value as any })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="revenue" id="revenue" />
                  <Label htmlFor="revenue">💰 Focus Revenus</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="satisfaction" id="satisfaction" />
                  <Label htmlFor="satisfaction">😊 Focus Satisfaction Client</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="productivity" id="productivity" />
                  <Label htmlFor="productivity">⚡ Focus Productivité</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="balanced" id="balanced" />
                  <Label htmlFor="balanced">⚖️ Équilibré</Label>
                </div>
              </RadioGroup>
            </div>
          </TabsContent>

          {/* Onglet 3: Style & Affichage */}
          <TabsContent value="style" className="space-y-4">
            <div className="space-y-3">
              <Label>Ton des recommandations</Label>
              <RadioGroup
                value={localConfig.tone ?? config.tone}
                onValueChange={(value) => setLocalConfig({ ...localConfig, tone: value as any })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="professional" id="professional" />
                  <Label htmlFor="professional">👔 Professionnel</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="motivating" id="motivating" />
                  <Label htmlFor="motivating">🎯 Motivant</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="concise" id="concise" />
                  <Label htmlFor="concise">📝 Concis</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="detailed" id="detailed" />
                  <Label htmlFor="detailed">📚 Détaillé</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label>Sections à inclure</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={effectiveConfig.sections_enabled.daily_priorities}
                    onCheckedChange={() => toggleSection('daily_priorities')}
                  />
                  <Label>Priorités du jour</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={effectiveConfig.sections_enabled.quick_actions}
                    onCheckedChange={() => toggleSection('quick_actions')}
                  />
                  <Label>Actions rapides</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={effectiveConfig.sections_enabled.parts_management}
                    onCheckedChange={() => toggleSection('parts_management')}
                  />
                  <Label>Gestion des pièces</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={effectiveConfig.sections_enabled.productivity_tips}
                    onCheckedChange={() => toggleSection('productivity_tips')}
                  />
                  <Label>Conseils productivité</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={effectiveConfig.sections_enabled.revenue_optimization}
                    onCheckedChange={() => toggleSection('revenue_optimization')}
                  />
                  <Label>Optimisation revenus</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="top_items">Nombre d'items à afficher (Top N)</Label>
              <Input
                id="top_items"
                type="number"
                min="1"
                max="20"
                value={localConfig.top_items_count ?? config.top_items_count}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, top_items_count: parseInt(e.target.value) || 5 })
                }
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handleReset} disabled={isUpdating}>
            Réinitialiser
          </Button>
          <Button onClick={handleSave} disabled={isUpdating}>
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
