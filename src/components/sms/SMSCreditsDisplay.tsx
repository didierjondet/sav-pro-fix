import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, AlertTriangle, CheckCircle } from 'lucide-react';
import { useShopSettings } from '@/hooks/useShopSettings';

export function SMSCreditsDisplay() {
  const { settings } = useShopSettings();

  if (!settings) return null;

  const remainingCredits = settings.sms_credits_allocated - settings.sms_credits_used;
  const usagePercentage = settings.sms_credits_allocated > 0 
    ? Math.round((settings.sms_credits_used / settings.sms_credits_allocated) * 100)
    : 0;

  const getStatusIcon = () => {
    if (usagePercentage >= 90) return <AlertTriangle className="h-4 w-4 text-destructive" />;
    if (usagePercentage >= 70) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusColor = () => {
    if (usagePercentage >= 90) return 'destructive';
    if (usagePercentage >= 70) return 'secondary';
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
              <span className="text-2xl font-bold">{remainingCredits}</span>
              <span className="text-sm text-muted-foreground">
                / {settings.sms_credits_allocated}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <Badge variant={getStatusColor()}>
              {usagePercentage}% utilisé
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progression mensuelle</span>
            <span>{settings.sms_credits_used} utilisés</span>
          </div>
          <Progress value={usagePercentage} className="h-2" />
        </div>

        {usagePercentage >= 90 && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="font-medium text-destructive">Limite presque atteinte</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Contactez votre administrateur pour ajouter des crédits SMS.
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>Plan actuel: <span className="font-medium capitalize">{settings.subscription_tier}</span></p>
          <p>Les crédits se renouvellent chaque mois</p>
        </div>
      </CardContent>
    </Card>
  );
}