import { useEffect } from 'react';
import { useSAVCases } from './useSAVCases';
import { useShopSettings } from './useShopSettings';
import { useNotifications } from './useNotifications';
import { calculateSAVDelay } from './useSAVDelay';

export function useSAVDelayNotifications() {
  const { cases } = useSAVCases();
  const { settings } = useShopSettings();
  const { createSAVDelayAlert } = useNotifications();

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
        const tempShop = {
          max_sav_processing_days_client: 7,
          max_sav_processing_days_external: 9,
          max_sav_processing_days_internal: 7
        };
        
        const delayInfo = calculateSAVDelay(savCase, tempShop as any);
        
        // Si le SAV est en pause, ne pas envoyer d'alerte
        if (delayInfo.isPaused) {
          continue;
        }

        // Déterminer le seuil d'alerte selon le type de SAV
        let alertDays = 2; // Par défaut
        if (savCase.sav_type === 'client') {
          alertDays = settings.sav_client_alert_days || 2;
        } else if (savCase.sav_type === 'external') {
          alertDays = settings.sav_external_alert_days || 2;
        } else if (savCase.sav_type === 'internal') {
          alertDays = settings.sav_internal_alert_days || 2;
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
  }, [cases, settings, createSAVDelayAlert]);

  return null; // Ce hook ne retourne rien, il fait juste les vérifications
}