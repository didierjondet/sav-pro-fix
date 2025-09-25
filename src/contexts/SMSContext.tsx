import React, { createContext, useContext, useCallback } from 'react';
import { useSMS } from '@/hooks/useSMS';
import { useUnifiedSMSCredits } from '@/hooks/useUnifiedSMSCredits';

interface SMSContextType {
  sendSMS: (request: {
    toNumber: string;
    message: string;
    type: 'sav_notification' | 'quote_notification' | 'manual';
    recordId?: string;
  }) => Promise<boolean>;
  sendSAVNotification: (
    customerPhone: string,
    customerName: string,
    caseNumber: string,
    status: string,
    savCaseId: string
  ) => Promise<boolean>;
  sendQuoteNotification: (
    customerPhone: string,
    customerName: string,
    quoteNumber: string,
    quoteId: string
  ) => Promise<boolean>;
  loading: boolean;
  refreshCredits: () => void;
}

const SMSContext = createContext<SMSContextType | undefined>(undefined);

export function SMSProvider({ children }: { children: React.ReactNode }) {
  const { refreshCredits } = useUnifiedSMSCredits();
  
  const { sendSMS, sendSAVNotification, sendQuoteNotification, loading } = useSMS(
    useCallback(() => {
      // Refresh credits after any SMS is sent
      refreshCredits();
    }, [refreshCredits])
  );

  const value: SMSContextType = {
    sendSMS,
    sendSAVNotification,
    sendQuoteNotification,
    loading,
    refreshCredits,
  };

  return <SMSContext.Provider value={value}>{children}</SMSContext.Provider>;
}

export function useSMSContext() {
  const context = useContext(SMSContext);
  if (context === undefined) {
    throw new Error('useSMSContext must be used within a SMSProvider');
  }
  return context;
}