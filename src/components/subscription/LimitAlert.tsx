import { AlertTriangle, CreditCard, ArrowUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { useSMSPackages } from '@/hooks/useSMSPackages';
import { useLimitDialogContext } from '@/contexts/LimitDialogContext';

interface LimitAlertProps {
  action: 'upgrade_plan' | 'buy_sms_package';
  reason: string;
  onAction?: () => void;
}

export function LimitAlert({ action, reason, onAction }: LimitAlertProps) {
  const { openCustomerPortal } = useSubscription();
  const { packages, purchasePackage } = useSMSPackages();
  const { checkAndShowLimitDialog } = useLimitDialogContext();

  const handleUpgradePlan = async () => {
    // Ouvrir la popup de sélection de plans
    checkAndShowLimitDialog('sav');
    onAction?.();
  };

  const handleBuySMSPackage = async () => {
    // Acheter le premier pack SMS disponible ou rediriger vers les paramètres
    if (packages.length > 0) {
      await purchasePackage(packages[0].id);
    } else {
      // Rediriger vers les paramètres avec l'onglet SMS
      window.location.href = '/settings?tab=sms';
    }
    onAction?.();
  };

  return (
    <Alert className="border-orange-200 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-orange-700">{reason}</span>
        <div className="flex gap-2 ml-4">
          {action === 'upgrade_plan' && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleUpgradePlan}
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              <ArrowUp className="h-4 w-4 mr-2" />
              Upgrade
            </Button>
          )}
          {action === 'buy_sms_package' && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleBuySMSPackage}
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Acheter SMS
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}