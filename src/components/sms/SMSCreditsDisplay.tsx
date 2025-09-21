import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUnifiedSMSCredits } from '@/hooks/useUnifiedSMSCredits';

export function SMSCreditsDisplay() {
  const { credits, loading } = useUnifiedSMSCredits();

  if (loading || !credits) return null;

  const getStatusIcon = () => {
    if (credits.is_exhausted) return <XCircle className="h-4 w-4 text-destructive" />;
    if (credits.is_critical) return <AlertTriangle className="h-4 w-4 text-destructive" />;
    if (credits.is_warning) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusColor = () => {
    if (credits.is_exhausted || credits.is_critical) return 'destructive';
    if (credits.is_warning) return 'secondary';
    return 'default';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5" />
          Crédits SMS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Crédits restants</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{credits.total_remaining}</span>
              <span className="text-sm text-muted-foreground">
                / {credits.total_available}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <Badge variant={getStatusColor()}>
              {credits.overall_usage_percent}% utilisé
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Utilisation globale</span>
              <span>{credits.overall_usage_percent}%</span>
            </div>
            <Progress value={credits.overall_usage_percent} className="h-2" />
          </div>

          {/* Détail des sources de crédits */}
          <div className="space-y-3">
            {/* Crédits mensuels (plan) */}
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Plan mensuel</span>
                <Badge variant="outline">{credits.monthly_usage_percent}% utilisé</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {credits.monthly_remaining} / {credits.monthly_allocated} restants
              </div>
              <Progress value={credits.monthly_usage_percent} className="h-1 mt-1" />
            </div>

            {/* Crédits épuisables (achetés + admin) */}
            {credits.has_purchased_credits && (
              <div className="p-3 rounded-lg bg-primary/5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Crédits épuisables</span>
                  <Badge variant="secondary">
                    {credits.purchasable_remaining} restants
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>• Achetés: {credits.purchased_total}</div>
                  {credits.admin_added > 0 && (
                    <div>• Ajoutés: {credits.admin_added}</div>
                  )}
                  <div>• Utilisés: {credits.purchasable_used}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {(credits.is_warning || credits.is_critical || credits.is_exhausted) && (
          <Alert variant={credits.is_exhausted || credits.is_critical ? "destructive" : "default"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {credits.is_exhausted && "Tous vos crédits SMS sont épuisés ! Achetez des crédits pour continuer."}
              {credits.is_critical && !credits.is_exhausted && "Crédits SMS critiques ! Plus de crédits achetés disponibles."}
              {credits.is_warning && !credits.is_critical && "Attention ! Plus de 80% de vos crédits SMS sont utilisés."}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground">
          <p>Plan actuel: <span className="font-medium capitalize">{credits.subscription_tier}</span></p>
          <p>Les crédits mensuels se renouvellent le 1er de chaque mois</p>
        </div>
      </CardContent>
    </Card>
  );
}