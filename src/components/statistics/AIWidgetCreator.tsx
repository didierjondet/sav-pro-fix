import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, ChevronDown, CheckCircle2, AlertCircle, Database, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { WidgetPreview } from './WidgetPreview';
import { useShop } from '@/hooks/useShop';
import { AVAILABLE_METRICS } from '@/hooks/useCustomWidgetData';

interface AIWidgetCreatorProps {
  onSuccess: (widget: any) => void;
  onCancel: () => void;
}

export const AIWidgetCreator = ({ onSuccess, onCancel }: AIWidgetCreatorProps) => {
  const { shop } = useShop();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [interpretation, setInterpretation] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, { hasData: boolean; rowCount: number; error?: string } | null>>({});
  const [isTesting, setIsTesting] = useState<Record<number, boolean>>({});
  const [editingMetrics, setEditingMetrics] = useState<string[]>([]);
  const [showMetricsPicker, setShowMetricsPicker] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Veuillez saisir une description du widget');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-custom-widget', {
        body: { prompt },
      });

      if (error) throw error;

      setSuggestions(data.suggestions || []);
      setInterpretation(data.interpretation || '');
      setSelectedIndex(null);
      setEditingMetrics([]);
      setShowMetricsPicker(false);
      toast.success('3 suggestions générées !');
    } catch (error: any) {
      console.error('Error generating widget:', error);
      toast.error('Erreur lors de la génération des suggestions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTestData = async (index: number) => {
    // Pour les widgets basés sur metrics, on vérifie juste qu'il y a des SAV
    setIsTesting(prev => ({ ...prev, [index]: true }));
    
    try {
      const { count, error } = await supabase
        .from('sav_cases')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shop?.id);
      
      if (error) throw error;
      
      setTestResults(prev => ({ 
        ...prev, 
        [index]: { hasData: (count || 0) > 0, rowCount: count || 0 } 
      }));
    } catch (error: any) {
      setTestResults(prev => ({ 
        ...prev, 
        [index]: { hasData: false, rowCount: 0, error: error.message } 
      }));
    } finally {
      setIsTesting(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleSave = async () => {
    if (selectedIndex === null) {
      toast.error('Veuillez sélectionner une suggestion');
      return;
    }

    const selected = suggestions[selectedIndex];
    setIsSaving(true);

    // Utiliser les métriques éditées si elles existent
    const finalDataConfig = editingMetrics.length > 0 
      ? { ...selected.data_config, metrics: editingMetrics }
      : selected.data_config;

    try {
      const { data, error } = await supabase.functions.invoke('save-custom-widget', {
        body: {
          original_prompt: prompt,
          ai_interpretation: { interpretation, selectedIndex },
          name: selected.name,
          description: selected.description,
          widget_type: selected.widget_type,
          chart_type: selected.chart_type,
          data_source: selected.data_source,
          data_config: finalDataConfig,
          display_config: selected.display_config,
        },
      });

      if (error) throw error;

      onSuccess(data.widget);
    } catch (error: any) {
      console.error('Error saving widget:', error);
      toast.error('Erreur lors de la création du widget');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Étape 1: Saisie du prompt */}
      <div className="space-y-2">
        <Label htmlFor="prompt" className="text-base font-semibold">
          Décrivez le widget que vous souhaitez créer
        </Label>
        <Textarea
          id="prompt"
          placeholder="Ex: Un graphique montrant l'évolution du chiffre d'affaires par mois sur l'année en cours"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <Button 
          onClick={handleGenerate} 
          disabled={isGenerating || !prompt.trim()}
          className="w-full sm:w-auto"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Générer des suggestions
            </>
          )}
        </Button>
      </div>

      {/* Interprétation de l'IA */}
      {interpretation && (
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold">Analyse :</span> {interpretation}
          </p>
        </div>
      )}

      {/* Interface de sélection des variables */}
      {selectedIndex !== null && (
        <div className="p-4 border rounded-lg space-y-3">
          <h3 className="text-sm font-semibold">Variables utilisées :</h3>
          <div className="flex flex-wrap gap-2">
            {(editingMetrics.length > 0 ? editingMetrics : suggestions[selectedIndex]?.data_config?.metrics || []).map((metric: string) => {
              const metricDef = AVAILABLE_METRICS.find(m => m.key === metric);
              return (
                <Badge key={metric} variant="secondary" className="cursor-pointer gap-1">
                  <span className="font-mono text-xs">{metric}</span>
                  <X 
                    className="h-3 w-3 hover:text-destructive" 
                    onClick={() => setEditingMetrics(prev => 
                      prev.length > 0 
                        ? prev.filter(m => m !== metric)
                        : (suggestions[selectedIndex]?.data_config?.metrics || []).filter((m: string) => m !== metric)
                    )}
                  />
                </Badge>
              );
            })}
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowMetricsPicker(!showMetricsPicker)}
          >
            + Ajouter une variable
          </Button>

          {showMetricsPicker && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
              {AVAILABLE_METRICS.map(metric => (
                <Card 
                  key={metric.key}
                  onClick={() => {
                    const currentMetrics = editingMetrics.length > 0 
                      ? editingMetrics 
                      : suggestions[selectedIndex]?.data_config?.metrics || [];
                    setEditingMetrics([...currentMetrics, metric.key]);
                    setShowMetricsPicker(false);
                  }}
                  className="cursor-pointer hover:bg-accent p-3 transition-colors"
                >
                  <p className="font-mono text-sm font-semibold">{metric.key}</p>
                  <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                  <Badge variant="outline" className="mt-2 text-xs">{metric.category}</Badge>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Étape 2: Affichage des suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">3 propositions de widgets</h3>
          <div className="grid gap-4">
            {suggestions.map((suggestion, index) => (
              <Card 
                key={index} 
                className={`cursor-pointer transition-all ${
                  selectedIndex === index 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => setSelectedIndex(index)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {suggestion.name}
                    <span className="text-xs font-normal text-muted-foreground">
                      ({suggestion.widget_type})
                    </span>
                  </CardTitle>
                  <CardDescription>{suggestion.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Prévisualisation */}
                  <WidgetPreview config={suggestion} />
                  
                  {/* Test des données */}
                  <div className="space-y-2">
                    <Button 
                      onClick={() => handleTestData(index)}
                      disabled={isTesting[index]}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {isTesting[index] ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Test en cours...
                        </>
                      ) : (
                        <>
                          <Database className="mr-2 h-4 w-4" />
                          Tester les données
                        </>
                      )}
                    </Button>
                    
                    {testResults[index] && (
                      <Alert variant={testResults[index]!.hasData ? 'default' : 'destructive'}>
                        <div className="flex items-center gap-2">
                          {testResults[index]!.hasData ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <AlertDescription>
                                ✅ {testResults[index]!.rowCount} lignes trouvées - Données disponibles
                              </AlertDescription>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                {testResults[index]!.error 
                                  ? `❌ Erreur: ${testResults[index]!.error}`
                                  : '❌ Aucune donnée disponible pour ce widget'
                                }
                              </AlertDescription>
                            </>
                          )}
                        </div>
                      </Alert>
                    )}
                  </div>
                  
                  {/* Détails techniques */}
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full">
                        <ChevronDown className="mr-2 h-4 w-4" />
                        Voir les détails techniques
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2 text-xs text-muted-foreground">
                      <div><strong>Type :</strong> {suggestion.widget_type}</div>
                      {suggestion.chart_type && (
                        <div><strong>Graphique :</strong> {suggestion.chart_type}</div>
                      )}
                      <div><strong>Source :</strong> {suggestion.data_source}</div>
                      {suggestion.data_config.useEdgeFunction && (
                        <div className="p-2 bg-primary/5 rounded">
                          <strong>⚡ Calculs complexes (Edge Function)</strong>
                          <p className="text-xs mt-1 font-mono">{suggestion.data_config.sqlQuery}</p>
                        </div>
                      )}
                      <div className="pt-2 border-t">
                        <strong>Raison :</strong>
                        <p className="mt-1 text-sm">{suggestion.reasoning}</p>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => setSelectedIndex(index)}
                    variant={selectedIndex === index ? 'default' : 'outline'}
                    className="w-full"
                  >
                    {selectedIndex === index ? '✓ Sélectionné' : 'Sélectionner'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Étape 3: Confirmation et sauvegarde */}
      {selectedIndex !== null && (
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création...
              </>
            ) : (
              'Créer ce widget'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};