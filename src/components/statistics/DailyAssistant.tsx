import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw, AlertCircle, TrendingUp, Settings, Printer } from 'lucide-react';
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
        } else if (data.error.includes('503') || data.error.includes('indisponible') || data.error.includes('surchargé')) {
          toast({
            title: "Service temporairement indisponible",
            description: "Le modèle IA est surchargé. Réessayez dans quelques instants.",
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
  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  const handlePrint = () => {
    if (!recommendations) return;
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) {
      toast({
        title: 'Popup bloquée',
        description: "Autorisez les popups pour imprimer le rapport.",
        variant: 'destructive',
      });
      return;
    }

    const dateStr = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const lines = recommendations.split('\n');
    const bodyHtml = lines.map((line) => {
      const t = line.trim();
      if (!t) return '';
      if (/^[0-9]+\./.test(t)) return `<h3>${escapeHtml(t)}</h3>`;
      if (t.startsWith('-')) return `<p class="bullet">${escapeHtml(t)}</p>`;
      return `<p>${escapeHtml(t)}</p>`;
    }).join('\n');

    const badgesHtml = stats ? `
      <div class="badges">
        ${stats.late_savs_count > 0 ? `<span class="badge red">⚠ ${stats.late_savs_count} en retard</span>` : ''}
        ${stats.ready_to_repair_count > 0 ? `<span class="badge green">↗ ${stats.ready_to_repair_count} prêts</span>` : ''}
        ${stats.total_potential_revenue > 0 ? `<span class="badge gray">💰 ${stats.total_potential_revenue}€ potentiel</span>` : ''}
      </div>` : '';

    printWindow.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"/>
      <title>Rapport Quotidien IA - ${escapeHtml(dateStr)}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: Arial, sans-serif; color: #111827; margin: 0; padding: 20px; font-size: 12px; line-height: 1.5; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        .subtitle { font-size: 12px; color: #6b7280; margin-bottom: 16px; text-transform: capitalize; }
        h3 { font-size: 14px; margin: 14px 0 6px; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
        p { margin: 4px 0; }
        p.bullet { margin-left: 16px; color: #374151; }
        .badges { margin: 12px 0 16px; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; margin-right: 6px; border: 1px solid #d1d5db; }
        .badge.red { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
        .badge.green { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
        .badge.gray { background: #f3f4f6; color: #374151; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>Rapport Quotidien IA</h1>
      <div class="subtitle">${escapeHtml(dateStr)}</div>
      ${badgesHtml}
      ${bodyHtml}
      <script>window.onload = () => { setTimeout(() => window.print(), 200); };</script>
    </body></html>`);
    printWindow.document.close();
  };

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
