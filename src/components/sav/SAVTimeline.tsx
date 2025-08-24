import React from 'react';
import { CheckCircle, Clock, AlertCircle, Flag } from 'lucide-react';
import { calculateSAVDelay } from '@/hooks/useSAVDelay';

interface TimelineProps {
  savCase: {
    created_at: string;
    sav_type: 'client' | 'internal' | 'external';
    status: string;
  };
  shop: {
    max_sav_processing_days_client?: number;
    max_sav_processing_days_internal?: number;
  } | null;
}

export function SAVTimeline({ savCase, shop }: TimelineProps) {
  if (!shop || !savCase) {
    return (
      <div className="w-full bg-white rounded-lg p-4 border">
        <h3 className="text-sm font-medium text-gray-700 mb-4 text-center">
          Progression du traitement
        </h3>
        <div className="text-center text-gray-500">
          <p className="text-sm">Chargement de la timeline...</p>
        </div>
      </div>
    );
  }

  const maxDays = savCase.sav_type === 'client' 
    ? (shop.max_sav_processing_days_client || 7) 
    : (shop.max_sav_processing_days_internal || 5);

  const delayInfo = calculateSAVDelay(savCase as any, shop as any);
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
  const isClosed = savCase.status === 'ready' || savCase.status === 'cancelled';
  const shouldShowFinalPoint = isClosed;

  return (
    <div className="w-full bg-white rounded-lg p-4 border">
      <h3 className="text-sm font-medium text-gray-700 mb-4 text-center">
        Progression du traitement
      </h3>
      
      <div className="relative">
        {/* Ligne de progression */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200">
          <div 
            className={`h-full transition-all duration-500 ${
              delayInfo.isOverdue ? 'bg-red-500' : 
              isClosed ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ 
              width: isClosed ? '100%' : `${Math.min((currentDay / maxDays) * 100, 100)}%` 
            }}
          />
        </div>

        {/* Points de la timeline */}
        <div className="flex justify-between relative">
          {timelinePoints.map((point) => (
            <div key={point.day} className="flex flex-col items-center">
              {/* Point */}
              <div className={`
                w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-medium
                ${point.isReady ? 'bg-green-500 border-green-500 text-white' :
                  point.isOverdue ? 'bg-red-500 border-red-500 text-white' :
                  point.isPast ? 'bg-blue-500 border-blue-500 text-white' :
                  point.isCurrent ? 'bg-blue-100 border-blue-500 text-blue-600' :
                  'bg-gray-100 border-gray-300 text-gray-400'
                }
                transition-all duration-300
              `}>
                {point.isReady ? (
                  <CheckCircle className="w-4 h-4" />
                ) : point.isOverdue ? (
                  <AlertCircle className="w-4 h-4" />
                ) : point.isCurrent ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  point.day
                )}
              </div>
              
              {/* Label du jour */}
              <div className={`
                mt-2 text-xs text-center
                ${point.isReady ? 'text-green-600 font-medium' :
                  point.isOverdue ? 'text-red-600 font-medium' :
                  point.isCurrent ? 'text-blue-600 font-medium' :
                  point.isPast ? 'text-gray-600' : 'text-gray-400'
                }
              `}>
                <div>J{point.day}</div>
                {maxDays <= 7 && (
                  <div className="text-xs text-gray-500">
                    {new Date(createdAt.getTime() + (point.day - 1) * 24 * 60 * 60 * 1000)
                      .toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Point final de jonction si le SAV est terminé */}
          {shouldShowFinalPoint && (
            <div className="flex flex-col items-center">
              {/* Point final */}
              <div className="w-10 h-10 rounded-full border-3 border-green-500 bg-green-500 text-white flex items-center justify-center shadow-lg">
                <Flag className="w-5 h-5" />
              </div>
              
              {/* Label du point final */}
              <div className="mt-2 text-xs text-center text-green-600 font-medium">
                <div>Terminé</div>
                <div className="text-xs text-gray-500">
                  {savCase.status === 'ready' ? 'Prêt' : 'Annulé'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Légende */}
        <div className="mt-4 text-center">
          <div className="text-xs text-gray-600">
            {isClosed ? (
              <span className="text-green-600 font-medium">
                {savCase.status === 'ready' ? '✅ Dossier terminé - Prêt à récupérer' : '❌ Dossier annulé'}
              </span>
            ) : delayInfo.isOverdue ? (
              <span className="text-red-600 font-medium">⚠️ Délai dépassé</span>
            ) : (
              <>
                <span className="font-medium">Jour {currentDay}</span> sur {maxDays} jours de traitement
                {delayInfo.remainingDays > 0 && (
                  <span className="text-gray-500"> • {delayInfo.remainingDays} jour{delayInfo.remainingDays > 1 ? 's' : ''} restant{delayInfo.remainingDays > 1 ? 's' : ''}</span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}