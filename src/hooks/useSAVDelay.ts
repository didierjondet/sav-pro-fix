import { useMemo } from 'react';
import { SAVCase } from './useSAVCases';
import { Shop } from './useShop';

export interface DelayInfo {
  isOverdue: boolean;
  remainingDays: number;
  remainingHours: number;
  totalRemainingHours: number;
  progress: number; // Pourcentage du temps écoulé
}

export function useSAVDelay(savCase: SAVCase, shop: Shop | null): DelayInfo {
  return useMemo(() => {
    if (!shop) {
      return {
        isOverdue: false,
        remainingDays: 0,
        remainingHours: 0,
        totalRemainingHours: 0,
        progress: 0
      };
    }

    const maxDays = savCase.sav_type === 'client' 
      ? shop.max_sav_processing_days_client 
      : shop.max_sav_processing_days_internal;

    const createdAt = new Date(savCase.created_at);
    const now = new Date();
    const maxDate = new Date(createdAt.getTime() + maxDays * 24 * 60 * 60 * 1000);
    
    const remainingMs = maxDate.getTime() - now.getTime();
    const totalRemainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    
    const isOverdue = remainingMs <= 0;
    const remainingDays = Math.floor(totalRemainingHours / 24);
    const remainingHours = totalRemainingHours % 24;
    
    // Calculer le pourcentage de temps écoulé
    const totalMaxHours = maxDays * 24;
    const elapsedHours = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
    const progress = Math.min(100, Math.max(0, (elapsedHours / totalMaxHours) * 100));

    return {
      isOverdue,
      remainingDays: Math.max(0, remainingDays),
      remainingHours: Math.max(0, remainingHours),
      totalRemainingHours: Math.max(0, totalRemainingHours),
      progress
    };
  }, [savCase.created_at, savCase.sav_type, shop?.max_sav_processing_days_client, shop?.max_sav_processing_days_internal]);
}

export function calculateSAVDelay(savCase: SAVCase, shop: Shop | null): DelayInfo {
  if (!shop) {
    return {
      isOverdue: false,
      remainingDays: 0,
      remainingHours: 0,
      totalRemainingHours: 0,
      progress: 0
    };
  }

  const maxDays = savCase.sav_type === 'client' 
    ? shop.max_sav_processing_days_client 
    : shop.max_sav_processing_days_internal;

  const createdAt = new Date(savCase.created_at);
  const now = new Date();
  const maxDate = new Date(createdAt.getTime() + maxDays * 24 * 60 * 60 * 1000);
  
  const remainingMs = maxDate.getTime() - now.getTime();
  const totalRemainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
  
  const isOverdue = remainingMs <= 0;
  const remainingDays = Math.floor(totalRemainingHours / 24);
  const remainingHours = totalRemainingHours % 24;
  
  // Calculer le pourcentage de temps écoulé
  const totalMaxHours = maxDays * 24;
  const elapsedHours = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
  const progress = Math.min(100, Math.max(0, (elapsedHours / totalMaxHours) * 100));

  return {
    isOverdue,
    remainingDays: Math.max(0, remainingDays),
    remainingHours: Math.max(0, remainingHours),
    totalRemainingHours: Math.max(0, totalRemainingHours),
    progress
  };
}

export function formatDelayText(delayInfo: DelayInfo): string {
  if (delayInfo.isOverdue) {
    return 'En retard';
  }
  
  if (delayInfo.remainingDays > 0) {
    return `${delayInfo.remainingDays}j ${delayInfo.remainingHours}h restantes`;
  }
  
  return `${delayInfo.remainingHours}h restantes`;
}