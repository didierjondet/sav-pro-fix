import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, CreditCard, Package } from 'lucide-react';

const SMS_PACKAGES = {
  free: [
    { credits: 50, price: 5, label: "50 SMS" },
    { credits: 100, price: 9, label: "100 SMS" },
    { credits: 200, price: 17, label: "200 SMS" }
  ],
  premium: [
    { credits: 50, price: 4, label: "50 SMS" },
    { credits: 100, price: 7, label: "100 SMS" },
    { credits: 200, price: 13, label: "200 SMS" },
    { credits: 500, price: 30, label: "500 SMS" }
  ],
  enterprise: [
    { credits: 50, price: 3, label: "50 SMS" },
    { credits: 100, price: 5, label: "100 SMS" },
    { credits: 200, price: 9, label: "200 SMS" },
    { credits: 500, price: 20, label: "500 SMS" },
    { credits: 1000, price: 35, label: "1000 SMS" }
  ]
};

export function SMSPurchaseSection() {
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const { subscription } = useSubscription();
  const { toast } = useToast();

  const handlePurchase = async (credits: number, price: number) => {
    setPurchasing(credits);
    try {
      const { data, error } = await supabase.functions.invoke('purchase-sms', {
        body: { credits, price }
      });

      if (error) throw error;

      if (data.url) {
        window.open(data.url, '_blank');
        toast({
          title: "Redirection vers le paiement",
          description: "Vous allez être redirigé vers Stripe pour finaliser votre achat",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la session de paiement",
        variant: "destructive",
      });
    } finally {
      setPurchasing(null);
    }
  };

  const packages = SMS_PACKAGES[subscription?.subscription_tier || 'free'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Acheter des crédits SMS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground mb-4">
          Achetez des crédits SMS supplémentaires pour envoyer des notifications à vos clients.
          {subscription?.subscription_tier && subscription.subscription_tier !== 'free' && (
            <span className="block mt-1 text-primary">
              Tarif préférentiel plan {subscription.subscription_tier}
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <div key={pkg.credits} className="border rounded-lg p-4 space-y-3">
              <div className="text-center">
                <div className="text-lg font-semibold">{pkg.label}</div>
                <div className="text-2xl font-bold text-primary">{pkg.price}€</div>
                <div className="text-sm text-muted-foreground">
                  {(pkg.price / pkg.credits * 100).toFixed(1)}¢ par SMS
                </div>
              </div>
              
              {pkg.credits === 200 && (
                <Badge variant="secondary" className="w-full justify-center">
                  Populaire
                </Badge>
              )}
              
              <Button 
                className="w-full" 
                onClick={() => handlePurchase(pkg.credits, pkg.price)}
                disabled={purchasing === pkg.credits}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {purchasing === pkg.credits ? 'Achat...' : 'Acheter'}
              </Button>
            </div>
          ))}
        </div>
        
        <div className="text-xs text-muted-foreground">
          * Les crédits SMS n'expirent pas et sont ajoutés à votre solde actuel
        </div>
      </CardContent>
    </Card>
  );
}