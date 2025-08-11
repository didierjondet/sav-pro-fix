import React, { createContext, useContext, useCallback } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

  const checkAndShowLimitDialog = useCallback((type: 'sav' | 'sms' = 'sav') => {
    const limits = checkLimits(type);
    
    if (!limits.allowed && limits.action) {
      // Naviguer vers la page d'abonnement au lieu d'ouvrir une popup
      navigate('/subscription');
      return false; // Limite atteinte
    }
    
    return true; // OK, pas de limite atteinte
  }, [checkLimits, navigate]);

  return (
    <LimitDialogContext.Provider value={{ checkAndShowLimitDialog }}>
      {children}
    </LimitDialogContext.Provider>
  );
}