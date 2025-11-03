import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, Sparkles, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { WidgetPreview } from './WidgetPreview';

interface AIWidgetCreatorProps {
  onSuccess: (widget: any) => void;
  onCancel: () => void;
}

export const AIWidgetCreator = ({ onSuccess, onCancel }: AIWidgetCreatorProps) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [interpretation, setInterpretation] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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
      toast.success('3 suggestions générées !');
    } catch (error: any) {
      console.error('Error generating widget:', error);
      toast.error('Erreur lors de la génération des suggestions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (selectedIndex === null) {
      toast.error('Veuillez sélectionner une suggestion');
      return;
    }

    const selected = suggestions[selectedIndex];
    setIsSaving(true);

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
          data_config: selected.data_config,
          display_config: selected.display_config,
        },
      });

      if (error) throw error;

      toast.success('Widget créé avec succès !');
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