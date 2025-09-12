import { useMemo } from 'react';
import { SAVCase } from './useSAVCases';
import { Shop } from './useShop';
import { useShopSAVStatuses } from './useShopSAVStatuses';
import { useShopSAVTypes } from './useShopSAVTypes';

export interface DelayInfo {
  isOverdue: boolean;
  remainingDays: number;
  remainingHours: number;
  totalRemainingHours: number;
  progress: number; // Pourcentage du temps écoulé
  isPaused: boolean; // Si le statut actuel met le timer en pause
}

export function useSAVDelay(savCase: SAVCase, shop: Shop | null): DelayInfo {
  const { getStatusInfo } = useShopSAVStatuses();
  const { getTypeInfo } = useShopSAVTypes();
  
  return useMemo(() => {
    if (!shop) {
      return {
        isOverdue: false,
        remainingDays: 0,
        remainingHours: 0,
        totalRemainingHours: 0,
        progress: 0,
        isPaused: false
      };
    }

    // Vérifier si le statut actuel met le timer en pause
    const currentStatusInfo = getStatusInfo(savCase.status);
    const currentStatusData = currentStatusInfo as any;
    const isCurrentStatusPaused = currentStatusData?.pause_timer || false;

    // Utiliser les types dynamiques pour déterminer les jours de traitement
    const typeInfo = getTypeInfo(savCase.sav_type);
    let maxDays = 7; // Valeur par défaut
    
    // Mapping des types vers les propriétés du shop
    if (savCase.sav_type === 'client') {
      maxDays = shop.max_sav_processing_days_client ?? 7;
    } else if (savCase.sav_type === 'external') {
      maxDays = shop.max_sav_processing_days_external ?? 9;
    } else if (savCase.sav_type === 'internal') {
      maxDays = shop.max_sav_processing_days_internal ?? 5;
    } else {
      // Pour les types personnalisés, utiliser la valeur par défaut client
      maxDays = shop.max_sav_processing_days_client ?? 7;
    }

    const createdAt = new Date(savCase.created_at);
    const now = new Date();
    const maxDate = new Date(createdAt.getTime() + maxDays * 24 * 60 * 60 * 1000);
    
    const remainingMs = maxDate.getTime() - now.getTime();
    const totalRemainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    
    // Si le statut actuel met le timer en pause, considérer comme non en retard
    const isOverdue = !isCurrentStatusPaused && remainingMs <= 0;
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
      progress: isCurrentStatusPaused ? progress : progress, // On garde le même pour l'instant
      isPaused: isCurrentStatusPaused
    };
  }, [savCase.created_at, savCase.sav_type, savCase.status, shop?.max_sav_processing_days_client, shop?.max_sav_processing_days_internal, shop?.max_sav_processing_days_external, getStatusInfo]);
}

export function calculateSAVDelay(savCase: SAVCase, shop: Shop | null): DelayInfo {
  if (!shop) {
    return {
      isOverdue: false,
      remainingDays: 0,
      remainingHours: 0,
      totalRemainingHours: 0,
      progress: 0,
      isPaused: false
    };
  }

  // Utiliser les types dynamiques pour déterminer les jours de traitement
  let maxDays = 7; // Valeur par défaut
  
  // Mapping des types vers les propriétés du shop
  if (savCase.sav_type === 'client') {
    maxDays = shop.max_sav_processing_days_client ?? 7;
  } else if (savCase.sav_type === 'external') {
    maxDays = shop.max_sav_processing_days_external ?? 9;
  } else if (savCase.sav_type === 'internal') {
    maxDays = shop.max_sav_processing_days_internal ?? 5;
  } else {
    // Pour les types personnalisés, utiliser la valeur par défaut client
    maxDays = shop.max_sav_processing_days_client ?? 7;
  }

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
    progress,
    isPaused: false
  };
}

export function formatDelayText(delayInfo: DelayInfo): string {
  if (delayInfo.isPaused) {
    return 'Timer en pause';
  }
  
  if (delayInfo.isOverdue) {
    return 'En retard';
  }
  
  if (delayInfo.remainingDays > 0) {
    return `${delayInfo.remainingDays}j ${delayInfo.remainingHours}h restantes`;
  }
  
  return `${delayInfo.remainingHours}h restantes`;
}