import { useState, useEffect, useCallback } from 'react';
import { useSubscription } from './useSubscription';
import { useToast } from './use-toast';

export function useProactiveLimits() {
  const { subscription } = useSubscription();
  const { toast } = useToast();
  const [hasShownWarning, setHasShownWarning] = useState<{
    sav: boolean;
    sms: boolean;
  }>({ sav: false, sms: false });

  const getSAVLimits = useCallback(() => {
    if (!subscription) return { remaining: 0, total: 0, usagePercent: 0 };
    
    let savLimit = subscription.custom_sav_limit;
    if (!savLimit) {
      if (subscription.subscription_tier === 'free') savLimit = 5;
      else if (subscription.subscription_tier === 'premium') savLimit = 50;
      else if (subscription.subscription_tier === 'enterprise') savLimit = 100;
      else savLimit = 5;
    }
    
    const remaining = Math.max(0, savLimit - subscription.monthly_sav_count);
    const usagePercent = (subscription.monthly_sav_count / savLimit) * 100;
    
    return { remaining, total: savLimit, usagePercent };
  }, [subscription]);

  const getSMSLimits = useCallback(() => {
    if (!subscription) return { remaining: 0, total: 0, usagePercent: 0 };
    
    const smsTotal = subscription.custom_sms_limit || subscription.sms_credits_allocated || 0;
    const purchasedSmsAvailable = Math.max(0, (subscription.purchased_sms_credits || 0));
    
    // Calculer les SMS restants du plan mensuel + SMS achetés
    const monthlyRemaining = Math.max(0, smsTotal - subscription.monthly_sms_used);
    const totalRemaining = monthlyRemaining + purchasedSmsAvailable;
    
    const usagePercent = subscription.monthly_sms_used >= smsTotal && purchasedSmsAvailable <= 0 ? 100 :
                         (subscription.monthly_sms_used / smsTotal) * 100;
    
    return { remaining: totalRemaining, total: smsTotal, usagePercent };
  }, [subscription]);

  const checkProactiveLimits = useCallback(() => {
    if (!subscription || subscription.forced) return;

    const savLimits = getSAVLimits();
    const smsLimits = getSMSLimits();

    // Vérification SAV - Avertissement à 90%
    if (savLimits.usagePercent >= 90 && savLimits.remaining > 0 && !hasShownWarning.sav) {
      toast({
        title: "⚠️ Limite SAV bientôt atteinte",
        description: `Attention : ${savLimits.remaining} SAV restant(s) sur ${savLimits.total}. Pensez à mettre à niveau votre plan.`,
        variant: "destructive",
        duration: 8000,
      });
      setHasShownWarning(prev => ({ ...prev, sav: true }));
    }

    // Vérification SMS - Avertissement à 90%
    if (smsLimits.usagePercent >= 90 && smsLimits.remaining > 0 && !hasShownWarning.sms) {
      toast({
        title: "⚠️ Crédits SMS bientôt épuisés",
        description: `Attention : ${smsLimits.remaining} SMS restant(s) sur ${smsLimits.total}. Pensez à acheter des crédits supplémentaires.`,
        variant: "destructive",
        duration: 8000,
      });
      setHasShownWarning(prev => ({ ...prev, sms: true }));
    }

    // Reset des warnings si on descend en dessous de 80%
    if (savLimits.usagePercent < 80 && hasShownWarning.sav) {
      setHasShownWarning(prev => ({ ...prev, sav: false }));
    }
    if (smsLimits.usagePercent < 80 && hasShownWarning.sms) {
      setHasShownWarning(prev => ({ ...prev, sms: false }));
    }
  }, [subscription, getSAVLimits, getSMSLimits, hasShownWarning, toast]);

  // Vérifier les limites à chaque changement de subscription
  useEffect(() => {
    checkProactiveLimits();
  }, [checkProactiveLimits]);

  return {
    checkProactiveLimits,
    getSAVLimits,
    getSMSLimits,
  };
}