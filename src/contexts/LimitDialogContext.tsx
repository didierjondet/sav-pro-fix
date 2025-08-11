import React, { createContext, useContext, useCallback, useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { LimitReachedDialog } from '@/components/dialogs/LimitReachedDialog';

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
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    action: 'upgrade_plan' | 'buy_sms_package';
    reason: string;
  }>({
    isOpen: false,
    action: 'upgrade_plan',
    reason: ''
  });

  const checkAndShowLimitDialog = useCallback((type: 'sav' | 'sms' = 'sav') => {
    const limits = checkLimits(type);
    
    if (!limits.allowed && limits.action) {
      setDialogState({
        isOpen: true,
        action: limits.action as 'upgrade_plan' | 'buy_sms_package',
        reason: limits.reason || 'Limite atteinte'
      });
      return false; // Limite atteinte
    }
    
    return true; // OK, pas de limite atteinte
  }, [checkLimits]);

  const handleConfirm = () => {
    setDialogState(prev => ({ ...prev, isOpen: false }));
    // Rediriger vers la page d'abonnement
    window.location.href = '/subscription';
  };

  const handleClose = () => {
    setDialogState(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <LimitDialogContext.Provider value={{ checkAndShowLimitDialog }}>
      {children}
      <LimitReachedDialog
        isOpen={dialogState.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        action={dialogState.action}
        reason={dialogState.reason}
      />
    </LimitDialogContext.Provider>
  );
}