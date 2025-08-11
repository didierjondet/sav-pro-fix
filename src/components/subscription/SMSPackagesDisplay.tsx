import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, CreditCard } from 'lucide-react';
import { useSMSPackages } from '@/hooks/useSMSPackages';
import { useSubscription } from '@/hooks/useSubscription';

interface SMSPackagesDisplayProps {
  onPurchaseSuccess?: () => void;
}

export function SMSPackagesDisplay({ onPurchaseSuccess }: SMSPackagesDisplayProps) {
  const { packages, loading, purchasing, purchasePackage } = useSMSPackages();
  const { subscription } = useSubscription();

  const handlePurchase = async (packageId: string) => {
    const result = await purchasePackage(packageId);
    if (result.data && onPurchaseSuccess) {
      onPurchaseSuccess();
    }
  };

  const formatPrice = (priceCents: number) => {
    return (priceCents / 100).toFixed(2);
  };

  const getPricePerSMS = (priceCents: number, smsCount: number) => {
    return ((priceCents / 100) / smsCount).toFixed(3);
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <p className="text-muted-foreground">Chargement des packs SMS...</p>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-muted-foreground">Aucun pack SMS disponible pour votre plan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Packs SMS Supplémentaires</h3>
        <Badge variant="outline" className="ml-auto">
          Plan {subscription?.subscription_tier}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map((pkg) => (
          <Card key={pkg.id} className="relative">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{pkg.name}</CardTitle>
              {pkg.description && (
                <p className="text-sm text-muted-foreground">{pkg.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {formatPrice(pkg.price_cents)}€
                </div>
                <div className="text-sm text-muted-foreground">
                  {pkg.sms_count} SMS
                </div>
                <div className="text-xs text-muted-foreground">
                  {getPricePerSMS(pkg.price_cents, pkg.sms_count)}€ par SMS
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>SMS inclus:</span>
                  <span className="font-medium">{pkg.sms_count}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Valable:</span>
                  <span className="font-medium">Immédiatement</span>
                </div>
              </div>

              <Button
                onClick={() => handlePurchase(pkg.id)}
                disabled={purchasing}
                className="w-full"
                size="sm"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {purchasing ? 'Redirection...' : 'Acheter'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-xs text-muted-foreground text-center mt-4">
        <p>Les SMS sont ajoutés instantanément à votre compte après paiement.</p>
        <p>Prix TTC - Paiement sécurisé par Stripe</p>
      </div>
    </div>
  );
}