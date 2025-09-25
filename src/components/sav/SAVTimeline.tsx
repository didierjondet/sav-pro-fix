import React from 'react';
import { CheckCircle, Clock, AlertCircle, Flag } from 'lucide-react';
import { calculateSAVDelay } from '@/hooks/useSAVDelay';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';

interface TimelineProps {
  savCase: {
    created_at: string;
    sav_type: string; // Utiliser string au lieu du type hardcodé
    status: string;
  };
  shop: any | null; // Simplifié car on n'utilise plus les propriétés de délai du shop
}

export function SAVTimeline({ savCase, shop }: TimelineProps) {
  console.log('🕐 SAVTimeline render:', { savCase, shop });
  
  const { isReadyStatus, isCancelledStatus, isPauseTimerStatus, getStatusInfo } = useShopSAVStatuses();
  const { getTypeInfo, types } = useShopSAVTypes();
  
  if (!shop || !savCase) {
    console.log('❌ Timeline: Missing data', { shop: !!shop, savCase: !!savCase });
    return (
      <div className="w-full py-2">
        <div className="text-center text-muted-foreground">
          <p className="text-xs">Chargement de la timeline...</p>
        </div>
      </div>
    );
  }

  console.log('✅ Timeline: Data available, rendering timeline');

  // Fonction pour obtenir le libellé personnalisé du statut
  const getStatusLabel = (status: string) => {
    const statusInfo = getStatusInfo(status);
    return statusInfo?.label || status;
  };

  // Utiliser les types SAV pour déterminer les jours de traitement
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

  const delayInfo = calculateSAVDelay(savCase as any, shop as any, types);
  const createdAt = new Date(savCase.created_at);
  const now = new Date();
  
  // Calculer le jour actuel (de 1 à maxDays)
  const elapsedDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const currentDay = Math.min(elapsedDays + 1, maxDays);

  // Générer les points de la timeline
  const timelinePoints = Array.from({ length: maxDays }, (_, index) => {
    const day = index + 1;
    const isPast = day < currentDay;
    const isCurrent = day === currentDay && !delayInfo.isOverdue;
    const isOverdue = delayInfo.isOverdue && day <= currentDay;
    const isReady = savCase.status === 'ready' || savCase.status === 'cancelled';

    return {
      day,
      isPast,
      isCurrent,
      isOverdue,
      isReady,
    };
  });

  // Ajouter un point final de jonction si le SAV est terminé
  const isClosed = isReadyStatus(savCase.status) || isCancelledStatus(savCase.status);
  const shouldShowFinalPoint = isClosed;

  return (
    <div className="w-full py-2">
      <div className="relative">
        {/* Ligne de progression fine */}
        <div className="absolute top-2.5 left-4 right-4 h-px bg-border/50">
          <div 
            className={`h-full transition-all duration-500 ${
              delayInfo.isOverdue ? 'bg-destructive' : 
              isClosed ? 'bg-success' : 'bg-primary'
            }`}
            style={{ 
              width: isClosed ? '100%' : `${Math.min((currentDay / maxDays) * 100, 100)}%` 
            }}
          />
        </div>

        {/* Points de la timeline minimalistes */}
        <div className="flex justify-between relative px-4">
          {timelinePoints.map((point) => (
            <div key={point.day} className="flex flex-col items-center">
              {/* Point réduit */}
              <div className={`
                w-5 h-5 rounded-full border flex items-center justify-center
                ${point.isReady ? 'bg-success border-success' :
                  point.isOverdue ? 'bg-destructive border-destructive' :
                  point.isPast ? 'bg-primary border-primary' :
                  point.isCurrent ? 'bg-primary/20 border-primary' :
                  'bg-muted border-border'
                }
                transition-all duration-300
              `}>
                {point.isReady ? (
                  <CheckCircle className="w-3 h-3 text-white" />
                ) : point.isOverdue ? (
                  <AlertCircle className="w-3 h-3 text-white" />
                ) : point.isCurrent ? (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                ) : point.isPast ? (
                  <div className="w-2 h-2 rounded-full bg-white" />
                ) : null}
              </div>
              
              {/* Label minimal */}
              {(point.isCurrent || point.isOverdue || maxDays <= 5) && (
                <div className={`
                  mt-1 text-xs leading-tight text-center
                  ${point.isReady ? 'text-success' :
                    point.isOverdue ? 'text-destructive' :
                    point.isCurrent ? 'text-primary' :
                    'text-muted-foreground'
                  }
                `}>
                  <div className="font-medium">J{point.day}</div>
                </div>
              )}
            </div>
          ))}
          
          {/* Point final si terminé */}
          {shouldShowFinalPoint && (
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 rounded-full border-2 border-success bg-success text-white flex items-center justify-center">
                <Flag className="w-3 h-3" />
              </div>
              <div className="mt-1 text-xs text-success font-medium">
                Terminé
              </div>
            </div>
          )}
        </div>

        {/* Légende compacte */}
        <div className="mt-2 text-center">
          <div className="text-xs text-muted-foreground">
            {isClosed ? (
              <span className="text-success font-medium">
                {getStatusLabel(savCase.status)}
              </span>
            ) : delayInfo.isOverdue ? (
              <span className="text-destructive font-medium">En retard</span>
            ) : (
              <span>
                Jour {currentDay}/{maxDays}
                {delayInfo.remainingDays > 0 && (
                  <span className="text-muted-foreground/70"> • {delayInfo.remainingDays}j restant{delayInfo.remainingDays > 1 ? 's' : ''}</span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}