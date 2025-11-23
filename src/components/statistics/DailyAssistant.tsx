import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw, AlertCircle, TrendingUp, Settings } from 'lucide-react';
import { DailyAssistantConfigDialog } from './DailyAssistantConfigDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export function DailyAssistant() {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const { toast } = useToast();

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      console.log('🚀 Appel de la fonction daily-assistant...');
      const { data, error } = await supabase.functions.invoke('daily-assistant');

      console.log('📦 Réponse complète:', { data, error });

      if (error) {
        console.error('❌ Erreur Supabase:', error);
        throw error;
      }

      if (!data) {
        console.error('❌ Pas de données reçues');
        throw new Error('Aucune donnée reçue du serveur');
      }

      if (data.error) {
        console.error('❌ Erreur dans les données:', data.error);
        if (data.error.includes('429') || data.error.includes('Rate limit')) {
          toast({
            title: "Limite atteinte",
            description: "Trop de requêtes IA. Veuillez réessayer dans quelques minutes.",
            variant: "destructive",
          });
        } else if (data.error.includes('402') || data.error.includes('Payment')) {
          toast({
            title: "Crédits insuffisants",
            description: "Ajoutez des crédits IA dans les paramètres de votre espace Lovable.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erreur",
            description: data.error,
            variant: "destructive",
          });
        }
        return;
      }

      console.log('✅ Recommandations reçues:', data.recommendations?.substring(0, 100));
      setRecommendations(data.recommendations);
      setStats(data.stats);
      
      toast({
        title: "Analyse complétée",
        description: "Vos recommandations du jour sont prêtes",
      });
    } catch (error: any) {
      console.error('❌ Erreur critique:', error);
      const errorMessage = error.message || error.toString();
      toast({
        title: "Erreur",
        description: `Impossible de générer les recommandations: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatRecommendations = (text: string) => {
    // Split by lines and format
    const lines = text.split('\n');
    return lines.map((line, index) => {
      // Headers (lines with emojis at start or numbered lists)
      if (line.match(/^[0-9]+\./)) {
        return (
          <h3 key={index} className="font-semibold text-lg mt-4 mb-2 text-primary">
            {line}
          </h3>
        );
      }
      // Bullet points
      if (line.trim().startsWith('-')) {
        return (
          <p key={index} className="ml-4 mb-1 text-muted-foreground">
            {line}
          </p>
        );
      }
      // Regular paragraphs
      if (line.trim()) {
        return (
          <p key={index} className="mb-2 text-sm">
            {line}
          </p>
        );
      }
      return null;
    });
  };

  return (
    <Card className="p-4 mb-4 bg-gradient-to-br from-primary/5 via-background to-background border-primary/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-base font-semibold">Assistant Quotidien IA</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfigOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            onClick={fetchRecommendations}
            disabled={loading}
            size="sm"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Analyse...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Analyser
              </>
            )}
          </Button>
        </div>
      </div>

      {!recommendations && !loading && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Obtenez des recommandations personnalisées pour optimiser votre journée
        </p>
      )}

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}

      {recommendations && !loading && (
        <div>
          {/* Stats badges */}
          {stats && (
            <div className="flex flex-wrap gap-2 mb-4">
              {stats.late_savs_count > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {stats.late_savs_count} en retard
                </Badge>
              )}
              {stats.ready_to_repair_count > 0 && (
                <Badge variant="default" className="gap-1 bg-green-500">
                  <TrendingUp className="h-3 w-3" />
                  {stats.ready_to_repair_count} prêts
                </Badge>
              )}
              {stats.total_potential_revenue > 0 && (
                <Badge variant="secondary" className="gap-1">
                  💰 {stats.total_potential_revenue}€ potentiel
                </Badge>
              )}
            </div>
          )}

          {/* Recommendations */}
          <div className="prose prose-sm max-w-none">
            {formatRecommendations(recommendations)}
          </div>
        </div>
      )}

      <DailyAssistantConfigDialog open={configOpen} onOpenChange={setConfigOpen} />
    </Card>
  );
}
