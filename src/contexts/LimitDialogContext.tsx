import React, { createContext, useContext, useCallback } from 'react';
import { useSubscription } from '@/hooks/useSubscription';

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

  const checkAndShowLimitDialog = useCallback((type: 'sav' | 'sms' = 'sav') => {
    const limits = checkLimits(type);
    
    if (!limits.allowed && limits.action) {
      // Rediriger vers la page d'abonnement via window.location
      // pour éviter le problème de useNavigate hors du Router
      window.location.href = '/subscription';
      return false; // Limite atteinte
    }
    
    return true; // OK, pas de limite atteinte
  }, [checkLimits]);

  return (
    <LimitDialogContext.Provider value={{ checkAndShowLimitDialog }}>
      {children}
    </LimitDialogContext.Provider>
  );
}