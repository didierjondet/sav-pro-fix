import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw, AlertCircle, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export function DailyAssistant() {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const { toast } = useToast();

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('daily-assistant');

      if (error) throw error;

      if (data.error) {
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
          throw new Error(data.error);
        }
        return;
      }

      setRecommendations(data.recommendations);
      setStats(data.stats);
      
      toast({
        title: "Analyse complétée",
        description: "Vos recommandations du jour sont prêtes",
      });
    } catch (error: any) {
      console.error('Error fetching recommendations:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer les recommandations",
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
    <Card className="p-6 mb-6 bg-gradient-to-br from-primary/5 via-background to-background border-primary/20">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Assistant Quotidien IA</h2>
            <p className="text-sm text-muted-foreground">
              Organisez votre journée et optimisez votre productivité
            </p>
          </div>
        </div>
        <Button
          onClick={fetchRecommendations}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          {loading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Analyse...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              {recommendations ? 'Actualiser' : 'Analyser'}
            </>
          )}
        </Button>
      </div>

      {!recommendations && !loading && (
        <div className="text-center py-8 space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-primary/10">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <p className="text-muted-foreground mb-2">
              Obtenez des recommandations personnalisées pour optimiser votre journée
            </p>
            <p className="text-sm text-muted-foreground">
              L'IA analyse vos SAV, pièces et commandes pour vous conseiller
            </p>
          </div>
          <Button onClick={fetchRecommendations} className="mt-4">
            <Sparkles className="mr-2 h-4 w-4" />
            Générer mes recommandations
          </Button>
        </div>
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
    </Card>
  );
}
