import { useEffect } from 'react';
import { useSAVCases } from './useSAVCases';
import { useShopSettings } from './useShopSettings';
import { useNotifications } from './useNotifications';
import { calculateSAVDelay } from './useSAVDelay';
import { useShopSAVTypes } from './useShopSAVTypes';

export function useSAVDelayNotifications() {
  const { cases } = useSAVCases();
  const { settings } = useShopSettings();
  const { createSAVDelayAlert } = useNotifications();
  const { types } = useShopSAVTypes();

  useEffect(() => {
    const checkSAVDelays = async () => {
      if (!settings || !settings.sav_delay_alerts_enabled || !cases.length) {
        return;
      }

      const now = new Date();
      const currentHour = now.getHours();

      // Ne vérifier qu'une fois par jour à 9h du matin (test simplifié)
      if (currentHour < 8 || currentHour > 18) {
        return;
      }

      for (const savCase of cases) {
        // Ne vérifier que les SAV actifs (pas terminés)
        if (savCase.status === 'ready' || savCase.status === 'cancelled') {
          continue;
        }

        // Calculer le délai en créant un objet shop temporaire
        const tempShop = {};
        
        const delayInfo = calculateSAVDelay(savCase, tempShop as any, types);
        
        // Si le SAV est en pause, ne pas envoyer d'alerte
        if (delayInfo.isPaused) {
          continue;
        }

        // Déterminer le seuil d'alerte selon le type de SAV
        let alertDays = 2; // Par défaut
        const savType = types.find(type => type.type_key === savCase.sav_type);
        if (savType && savType.alert_days) {
          alertDays = savType.alert_days;
        }

        // Si le SAV sera en retard dans X jours ou moins (mais pas encore en retard)
        if (!delayInfo.isOverdue && delayInfo.remainingDays <= alertDays && delayInfo.remainingDays >= 0) {
          console.log(`Envoi alerte retard pour SAV ${savCase.case_number}, reste ${delayInfo.remainingDays} jours`);
          
          await createSAVDelayAlert(
            savCase.id,
            savCase.case_number,
            delayInfo.remainingDays,
            savCase.sav_type
          );
        }

        // Si le SAV est déjà en retard
        if (delayInfo.isOverdue) {
          console.log(`Envoi alerte retard pour SAV ${savCase.case_number}, déjà en retard`);
          
          await createSAVDelayAlert(
            savCase.id,
            savCase.case_number,
            0, // 0 jours = déjà en retard
            savCase.sav_type
          );
        }
      }
    };

    // Vérifier immédiatement puis toutes les heures
    checkSAVDelays();
    const interval = setInterval(checkSAVDelays, 60 * 60 * 1000); // Toutes les heures

    return () => clearInterval(interval);
  }, [cases, settings, createSAVDelayAlert, types]);

  return null; // Ce hook ne retourne rien, il fait juste les vérifications
}