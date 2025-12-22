import { useState, useEffect, useCallback } from 'react';
import { useSubscription } from './useSubscription';
import { useUnifiedSMSCredits } from './useUnifiedSMSCredits';
import { useToast } from './use-toast';

export function useProactiveLimits() {
  const { subscription } = useSubscription();
  const { credits: unifiedSmsCredits } = useUnifiedSMSCredits();
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

  // Utiliser useUnifiedSMSCredits pour des calculs corrects
  const getSMSLimits = useCallback(() => {
    if (!unifiedSmsCredits) return { remaining: 0, total: 0, usagePercent: 0 };
    
    return {
      remaining: unifiedSmsCredits.total_remaining,
      total: unifiedSmsCredits.total_available,
      usagePercent: unifiedSmsCredits.overall_usage_percent
    };
  }, [unifiedSmsCredits]);

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

    // Vérification SMS - Fenêtre rouge UNIQUEMENT si ≤ 3 SMS restants
    if (smsLimits.remaining <= 3 && smsLimits.remaining > 0 && !hasShownWarning.sms) {
      toast({
        title: "⚠️ Crédits SMS critiques",
        description: `Attention : seulement ${smsLimits.remaining} SMS restant(s). Achetez des crédits supplémentaires.`,
        variant: "destructive",
        duration: 10000,
      });
      setHasShownWarning(prev => ({ ...prev, sms: true }));
    }

    // Reset des warnings si on repasse au-dessus des seuils
    if (savLimits.usagePercent < 80 && hasShownWarning.sav) {
      setHasShownWarning(prev => ({ ...prev, sav: false }));
    }
    // Reset SMS warning si on repasse au-dessus de 5 SMS
    if (smsLimits.remaining > 5 && hasShownWarning.sms) {
      setHasShownWarning(prev => ({ ...prev, sms: false }));
    }
  }, [subscription, getSAVLimits, getSMSLimits, hasShownWarning, toast]);

  // Vérifier les limites à chaque changement de subscription ou SMS credits
  useEffect(() => {
    checkProactiveLimits();
  }, [checkProactiveLimits]);

  return {
    checkProactiveLimits,
    getSAVLimits,
    getSMSLimits,
  };
}