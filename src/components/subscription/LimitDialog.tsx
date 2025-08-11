import React from 'react';
import { AlertTriangle, CreditCard, ArrowUp, X } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { useSMSPackages } from '@/hooks/useSMSPackages';

interface LimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'upgrade_plan' | 'buy_sms_package' | 'contact_support';
  reason: string;
  limitType: 'sav' | 'sms';
}

export function LimitDialog({ 
  open, 
  onOpenChange, 
  action, 
  reason, 
  limitType 
}: LimitDialogProps) {
  const { subscription, createCheckout, openCustomerPortal } = useSubscription();
  const { packages, purchasePackage } = useSMSPackages();

  const handleUpgradePlan = async () => {
    if (subscription?.subscription_tier === 'free') {
      // Upgrade vers Premium
      await createCheckout('premium');
    } else if (subscription?.subscription_tier === 'premium') {
      // Upgrade vers Enterprise
      await createCheckout('enterprise');
    } else {
      // Ouvrir le portail client pour gérer l'abonnement
      await openCustomerPortal();
    }
    onOpenChange(false);
  };

  const handleBuySMSPackage = async () => {
    if (packages.length > 0) {
      await purchasePackage(packages[0].id);
    } else {
      // Rediriger vers les paramètres avec l'onglet SMS
      window.location.href = '/settings?tab=sms';
    }
    onOpenChange(false);
  };

  const handleContactSupport = () => {
    // Rediriger vers le support
    window.location.href = '/support';
    onOpenChange(false);
  };

  const getIcon = () => {
    switch (limitType) {
      case 'sav':
        return <AlertTriangle className="h-12 w-12 text-orange-500" />;
      case 'sms':
        return <CreditCard className="h-12 w-12 text-blue-500" />;
      default:
        return <AlertTriangle className="h-12 w-12 text-red-500" />;
    }
  };

  const getTitle = () => {
    switch (limitType) {
      case 'sav':
        return 'Limite SAV atteinte';
      case 'sms':
        return 'Crédits SMS épuisés';
      default:
        return 'Limite atteinte';
    }
  };

  const getUpgradeButtonText = () => {
    if (subscription?.subscription_tier === 'free') {
      return 'Passer au plan Premium';
    } else if (subscription?.subscription_tier === 'premium') {
      return 'Passer au plan Enterprise';
    }
    return 'Gérer mon abonnement';
  };

  const getUpgradeDescription = () => {
    if (subscription?.subscription_tier === 'free') {
      return 'Le plan Premium vous offre 50 SAV simultanés et 100 SMS par mois';
    } else if (subscription?.subscription_tier === 'premium') {
      return 'Le plan Enterprise vous offre 100 SAV simultanés et 400 SMS par mois';
    }
    return 'Gérez votre abonnement pour augmenter vos limites';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getIcon()}
              <div>
                <DialogTitle className="text-xl font-semibold text-slate-900">
                  {getTitle()}
                </DialogTitle>
                <Badge 
                  variant="outline" 
                  className="mt-1 border-orange-300 text-orange-700"
                >
                  Plan {subscription?.subscription_tier || 'gratuit'}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <DialogDescription className="text-base text-slate-600">
            {reason}
          </DialogDescription>

          {limitType === 'sav' && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUp className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">Solution recommandée</span>
              </div>
              <p className="text-sm text-blue-700 mb-3">
                {getUpgradeDescription()}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {action === 'upgrade_plan' && (
              <Button
                onClick={handleUpgradePlan}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                size="lg"
              >
                <ArrowUp className="h-4 w-4 mr-2" />
                {getUpgradeButtonText()}
              </Button>
            )}

            {action === 'buy_sms_package' && (
              <Button
                onClick={handleBuySMSPackage}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
                size="lg"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Acheter des crédits SMS
              </Button>
            )}

            {action === 'contact_support' && (
              <Button
                onClick={handleContactSupport}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                size="lg"
              >
                Contacter le support
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Plus tard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}