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
  const { getStatusInfo, isFinalStatus } = useShopSAVStatuses();
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

    // Vérifier si le statut est final (SAV clôturé)
    const isFinal = isFinalStatus(savCase.status);
    
    // Vérifier si le statut actuel met le timer en pause
    const currentStatusInfo = getStatusInfo(savCase.status);
    const currentStatusData = currentStatusInfo as any;
    const isCurrentStatusPaused = currentStatusData?.pause_timer || isFinal;

    // Utiliser les types dynamiques pour déterminer les jours de traitement
    const typeInfo = getTypeInfo(savCase.sav_type);
    let maxDays = 7; // Valeur par défaut
    
    // Utiliser la valeur max_processing_days du type SAV
    if (typeInfo && typeof typeInfo === 'object' && 'max_processing_days' in typeInfo) {
      maxDays = typeInfo.max_processing_days || 7;
    } else {
      // Valeurs par défaut selon le type si pas de configuration spécifique
      if (savCase.sav_type === 'external') {
        maxDays = 9;
      } else if (savCase.sav_type === 'internal') {
        maxDays = 5;
      } else {
        maxDays = 7; // client ou autres types
      }
    }

    const createdAt = new Date(savCase.created_at);
    const now = new Date();
    const maxDate = new Date(createdAt.getTime() + maxDays * 24 * 60 * 60 * 1000);
    
    const remainingMs = maxDate.getTime() - now.getTime();
    const totalRemainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    
    // Si le statut est final ou en pause, considérer comme non en retard
    const isOverdue = !isCurrentStatusPaused && !isFinal && remainingMs <= 0;
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
      isPaused: isCurrentStatusPaused || isFinal
    };
  }, [savCase.created_at, savCase.sav_type, savCase.status, getStatusInfo, getTypeInfo, isFinalStatus]);
}

export function calculateSAVDelay(savCase: SAVCase, shop: Shop | null, savTypes?: any[]): DelayInfo {
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

  // Utiliser les types SAV pour déterminer les jours de traitement
  let maxDays = 7; // Valeur par défaut
  
  // Si les types SAV sont fournis, les utiliser
  if (savTypes && savTypes.length > 0) {
    const typeInfo = savTypes.find(type => type.type_key === savCase.sav_type);
    if (typeInfo && typeInfo.max_processing_days) {
      maxDays = typeInfo.max_processing_days;
    } else {
      // Valeurs par défaut selon le type si pas de configuration spécifique
      if (savCase.sav_type === 'external') {
        maxDays = 9;
      } else if (savCase.sav_type === 'internal') {
        maxDays = 5;
      } else {
        maxDays = 7; // client ou autres types
      }
    }
  } else {
    // Fallback aux valeurs par défaut selon le type
    if (savCase.sav_type === 'external') {
      maxDays = 9;
    } else if (savCase.sav_type === 'internal') {
      maxDays = 5;
    } else {
      maxDays = 7; // client ou autres types
    }
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