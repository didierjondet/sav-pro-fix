import React, { createContext, useContext, useState, useCallback } from 'react';
import { LimitDialog } from '@/components/subscription/LimitDialog';
import { useSubscription } from '@/hooks/useSubscription';

interface LimitDialogState {
  open: boolean;
  action: 'upgrade_plan' | 'buy_sms_package' | 'contact_support';
  reason: string;
  limitType: 'sav' | 'sms';
}

interface LimitDialogContextType {
  checkAndShowLimitDialog: (type?: 'sav' | 'sms') => boolean;
}

const LimitDialogContext = createContext<LimitDialogContextType | undefined>(undefined);

export function useLimitDialogContext() {
  const context = useContext(LimitDialogContext);
  if (!context) {
    // Return a default implementation to prevent crashes
    return {
      checkAndShowLimitDialog: () => true
    };
  }
  return context;
}

interface LimitDialogProviderProps {
  children: React.ReactNode;
}

export function LimitDialogProvider({ children }: LimitDialogProviderProps) {
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

  return (
    <LimitDialogContext.Provider value={{ checkAndShowLimitDialog }}>
      {children}
      <LimitDialog
        open={dialogState.open}
        onOpenChange={closeDialog}
        action={dialogState.action}
        reason={dialogState.reason}
        limitType={dialogState.limitType}
      />
    </LimitDialogContext.Provider>
  );
}