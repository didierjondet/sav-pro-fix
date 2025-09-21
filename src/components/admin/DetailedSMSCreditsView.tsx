import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, Calendar, ShoppingCart, Settings, TrendingUp } from 'lucide-react';

interface DetailedCredits {
  shop_id: string;
  shop_name: string;
  subscription_tier: string;
  
  // Source 1: Plan mensuel (remis à zéro chaque mois)
  monthly_allocated: number;
  monthly_used: number;
  monthly_remaining: number;
  monthly_usage_percent: number;
  
  // Source 2: SMS achetés via packages
  purchased_total: number;
  
  // Source 3: SMS ajoutés par admin
  admin_added: number;
  
  // Crédits épuisables combinés (source 2 + 3)
  purchasable_used: number;
  purchasable_remaining: number;
  
  // Totaux
  total_available: number;
  total_remaining: number;
  overall_usage_percent: number;
}

interface DetailedSMSCreditsViewProps {
  shopCredits: DetailedCredits[];
  loading?: boolean;
}

export function DetailedSMSCreditsView({ shopCredits, loading }: DetailedSMSCreditsViewProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Vue Détaillée des Crédits SMS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculer les totaux généraux
  const totalShops = shopCredits.length;
  const grandTotalAllocated = shopCredits.reduce((sum, shop) => sum + shop.total_available, 0);
  const grandTotalUsed = shopCredits.reduce((sum, shop) => sum + (shop.monthly_used + shop.purchasable_used), 0);
  const grandTotalRemaining = shopCredits.reduce((sum, shop) => sum + shop.total_remaining, 0);

  const globalUsagePercent = grandTotalAllocated > 0 
    ? Math.round((grandTotalUsed / grandTotalAllocated) * 100) 
    : 0;

  const getPlanBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'enterprise': return 'default';
      case 'premium': return 'secondary'; 
      default: return 'outline';
    }
  };

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-orange-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalShops}</div>
            <p className="text-sm text-muted-foreground">Boutiques</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{grandTotalAllocated.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">Total Alloué</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{grandTotalUsed.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">Total Utilisé</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{grandTotalRemaining.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">Total Restant</p>
            <div className="flex items-center mt-2">
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${getUsageColor(globalUsagePercent)}`}
                  style={{ width: `${Math.min(globalUsagePercent, 100)}%` }}
                />
              </div>
              <span className="ml-2 text-xs">{globalUsagePercent}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Détail par boutique */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {shopCredits.map((shop) => (
          <Card key={shop.shop_id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{shop.shop_name}</CardTitle>
                <Badge variant={getPlanBadgeVariant(shop.subscription_tier)}>
                  {shop.subscription_tier.toUpperCase()}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {shop.total_remaining} / {shop.total_available} crédits restants
                <span className="ml-2">({shop.overall_usage_percent}% utilisé)</span>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Barre de progression globale */}
              <div className="space-y-2">
                <Progress value={shop.overall_usage_percent} className="h-2" />
              </div>

              {/* Détail des 3 sources */}
              <div className="space-y-3">
                {/* Source 1: Plan mensuel */}
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Plan Mensuel</span>
                    </div>
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      {shop.monthly_usage_percent}%
                    </Badge>
                  </div>
                  <div className="text-sm text-green-700">
                    {shop.monthly_remaining} / {shop.monthly_allocated} restants
                  </div>
                  <Progress 
                    value={shop.monthly_usage_percent} 
                    className="h-1 mt-1"
                  />
                </div>

                {/* Source 2: SMS achetés */}
                {shop.purchased_total > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
                      <ShoppingCart className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">SMS Achetés</span>
                    </div>
                    <div className="text-sm text-blue-700">
                      {shop.purchased_total} crédits via packages
                    </div>
                  </div>
                )}

                {/* Source 3: SMS ajoutés par admin */}
                {shop.admin_added > 0 && (
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Settings className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">Ajoutés par Admin</span>
                    </div>
                    <div className="text-sm text-purple-700">
                      {shop.admin_added} crédits manuels
                    </div>
                  </div>
                )}

                {/* Crédits épuisables combinés */}
                {(shop.purchased_total + shop.admin_added) > 0 && (
                  <div className="p-2 bg-muted/50 rounded">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Crédits épuisables:</span>
                      <span className="font-medium">
                        {shop.purchasable_remaining} / {shop.purchased_total + shop.admin_added}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {shopCredits.length === 0 && (
        <div className="text-center py-8">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aucune donnée de crédit SMS disponible</p>
        </div>
      )}
    </div>
  );
}