import { useState, useCallback } from 'react';
import { useSubscription } from './useSubscription';

interface LimitDialogState {
  open: boolean;
  action: 'upgrade_plan' | 'buy_sms_package' | 'contact_support';
  reason: string;
  limitType: 'sav' | 'sms';
}

export function useLimitDialog() {
  const { checkLimits } = useSubscription();
  const [dialogState, setDialogState] = useState<LimitDialogState>({
    open: false,
    action: 'upgrade_plan',
    reason: '',
    limitType: 'sav'
  });

  const checkAndShowLimitDialog = useCallback((type: 'sav' | 'sms' = 'sav') => {
    const limits = checkLimits(type);
    
    if (!limits.allowed && limits.action) {
      setDialogState({
        open: true,
        action: limits.action as 'upgrade_plan' | 'buy_sms_package' | 'contact_support',
        reason: limits.reason,
        limitType: type
      });
      return false; // Limite atteinte
    }
    
    return true; // OK, pas de limite atteinte
  }, [checkLimits]);

  const closeDialog = useCallback(() => {
    setDialogState(prev => ({ ...prev, open: false }));
  }, []);

  return {
    dialogState,
    checkAndShowLimitDialog,
    closeDialog
  };
}