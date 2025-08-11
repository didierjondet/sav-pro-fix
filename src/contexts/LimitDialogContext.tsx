import React, { createContext, useContext, useCallback, useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { LimitReachedDialog } from '@/components/dialogs/LimitReachedDialog';

interface LimitDialogContextType {
  checkAndShowLimitDialog: (type?: 'sav' | 'sms') => boolean;
  recheckLimitsAndHideDialog: () => void;
}

const LimitDialogContext = createContext<LimitDialogContextType | undefined>(undefined);

export function useLimitDialogContext() {
  const context = useContext(LimitDialogContext);
  if (!context) {
    // Return a default implementation to prevent crashes
    return {
      checkAndShowLimitDialog: () => true,
      recheckLimitsAndHideDialog: () => {}
    };
  }
  return context;
}

interface LimitDialogProviderProps {
  children: React.ReactNode;
}

export function LimitDialogProvider({ children }: LimitDialogProviderProps) {
  const { checkLimits, refetch } = useSubscription();
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

  const recheckLimitsAndHideDialog = useCallback(async () => {
    // Rafraîchir les données de souscription
    await refetch();
    
    // Re-vérifier les limites avec les données à jour
    const limits = checkLimits('sav');
    
    // Si les limites ne sont plus atteintes, fermer la popup
    if (limits.allowed && dialogState.isOpen) {
      setDialogState(prev => ({ ...prev, isOpen: false }));
    }
  }, [refetch, checkLimits, dialogState.isOpen]);

  return (
    <LimitDialogContext.Provider value={{ checkAndShowLimitDialog, recheckLimitsAndHideDialog }}>
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