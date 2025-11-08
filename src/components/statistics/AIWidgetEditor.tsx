import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, TestTube, X, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CustomWidgetRenderer } from './CustomWidgetRenderer';

interface AIWidgetEditorProps {
  widget: {
    id: string;
    name: string;
    description: string;
    original_prompt: string;
    widget_type: string;
    chart_type?: string;
    data_config: any;
    display_config: any;
  };
  onSuccess: (widget: any) => void;
  onCancel: () => void;
}

export const AIWidgetEditor = ({ widget, onSuccess, onCancel }: AIWidgetEditorProps) => {
  const [prompt, setPrompt] = useState(widget.original_prompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [interpretation, setInterpretation] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [testingData, setTestingData] = useState<Record<number, boolean>>({});
  const [dataResults, setDataResults] = useState<Record<number, boolean>>({});

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Veuillez entrer une description");
      return;
    }

    setIsGenerating(true);
    setSuggestions([]);
    setInterpretation('');
    setSelectedIndex(null);
    setDataResults({});

    try {
      const { data, error } = await supabase.functions.invoke('update-custom-widget', {
        body: { 
          widget_id: widget.id,
          new_prompt: prompt 
        }
      });

      if (error) throw error;

      setInterpretation(data.interpretation);
      setSuggestions(data.suggestions || []);
      
      if (data.suggestions?.length > 0) {
        toast.success(`${data.suggestions.length} suggestions générées`);
      }
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      toast.error(error.message || "Erreur lors de la génération");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTestData = async (index: number) => {
    const suggestion = suggestions[index];
    setTestingData(prev => ({ ...prev, [index]: true }));

    try {
      const { count, error } = await supabase
        .from('sav_cases')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;

      const hasData = (count ?? 0) > 0;
      setDataResults(prev => ({ ...prev, [index]: hasData }));
      
      toast.success(
        hasData 
          ? `✓ Données disponibles (${count} SAV trouvés)` 
          : "⚠ Aucune donnée disponible pour cette période"
      );
    } catch (error) {
      console.error('Error testing data:', error);
      toast.error("Erreur lors du test des données");
      setDataResults(prev => ({ ...prev, [index]: false }));
    } finally {
      setTestingData(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleSave = async () => {
    if (selectedIndex === null) {
      toast.error("Veuillez sélectionner une suggestion");
      return;
    }

    const selectedSuggestion = suggestions[selectedIndex];
    
    try {
      const { error } = await supabase
        .from('custom_widgets')
        .update({
          name: selectedSuggestion.name,
          description: selectedSuggestion.description,
          original_prompt: prompt,
          widget_type: selectedSuggestion.widget_type,
          chart_type: selectedSuggestion.chart_type || null,
          data_source: selectedSuggestion.data_source,
          data_config: selectedSuggestion.data_config,
          display_config: selectedSuggestion.display_config,
          ai_interpretation: { interpretation, selectedIndex },
          updated_at: new Date().toISOString()
        })
        .eq('id', widget.id);

      if (error) throw error;

      toast.success("Widget modifié avec succès !");
      onSuccess(selectedSuggestion);
    } catch (error: any) {
      console.error('Error updating widget:', error);
      toast.error(error.message || "Erreur lors de la mise à jour");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Modifier le widget
          </h3>
          <p className="text-sm text-muted-foreground">Widget actuel : {widget.name}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Nouvelle description du widget</Label>
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ex: Évolution mensuelle de la marge..."
          onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleGenerate()}
          disabled={isGenerating}
        />
      </div>

      <Button 
        onClick={handleGenerate} 
        disabled={isGenerating || !prompt.trim()}
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Génération en cours...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Générer de nouvelles suggestions
          </>
        )}
      </Button>

      {interpretation && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Interprétation IA</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{interpretation}</p>
          </CardContent>
        </Card>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-3">
          <Label>Choisissez une suggestion ({suggestions.length})</Label>
          {suggestions.map((suggestion, index) => (
            <Card 
              key={index}
              className={`cursor-pointer transition-all hover:border-primary/50 ${
                selectedIndex === index ? 'border-primary ring-2 ring-primary/20' : ''
              }`}
              onClick={() => setSelectedIndex(index)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                      {suggestion.name}
                      <Badge variant="secondary" className="text-xs">
                        {suggestion.widget_type}
                      </Badge>
                      {suggestion.chart_type && (
                        <Badge variant="outline" className="text-xs">
                          {suggestion.chart_type}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {suggestion.description}
                    </CardDescription>
                  </div>
                  {selectedIndex === index && (
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </div>

                {/* Métriques utilisées */}
                {suggestion.data_config?.metrics && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {suggestion.data_config.metrics.map((metric: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {metric}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>

              <CardContent className="pt-0">
                {/* Prévisualisation */}
                <div className="mb-3">
                  <CustomWidgetRenderer config={suggestion} />
                </div>

                {/* Bouton tester */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTestData(index);
                  }}
                  disabled={testingData[index]}
                  className="w-full"
                >
                  {testingData[index] ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Test en cours...
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-3 w-3" />
                      {dataResults[index] !== undefined
                        ? dataResults[index]
                          ? "✓ Données disponibles"
                          : "⚠ Aucune donnée"
                        : "Tester les données"}
                    </>
                  )}
                </Button>

                {/* Reasoning */}
                {suggestion.reasoning && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    {suggestion.reasoning}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={selectedIndex === null}
            className="flex-1"
          >
            <Check className="mr-2 h-4 w-4" />
            Enregistrer les modifications
          </Button>
        </div>
      )}
    </div>
  );
};
