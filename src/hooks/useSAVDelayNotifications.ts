import { useEffect } from 'react';
import { useSAVCases } from './useSAVCases';
import { useShopSettings } from './useShopSettings';
import { useNotifications } from './useNotifications';
import { calculateSAVDelay } from './useSAVDelay';
import { useShopSAVTypes } from './useShopSAVTypes';
import { useShopSAVStatuses } from './useShopSAVStatuses';

export function useSAVDelayNotifications() {
  const { cases } = useSAVCases();
  const { settings } = useShopSettings();
  const { createSAVDelayAlert } = useNotifications();
  const { types } = useShopSAVTypes();
  const { statuses, isReadyStatus, isCancelledStatus, isPauseTimerStatus, isActiveStatus } = useShopSAVStatuses();

  useEffect(() => {
    const checkSAVDelays = async () => {
      if (!settings || !settings.sav_delay_alerts_enabled || !cases.length || !statuses.length) {
        console.log('⏰ [SAV-DELAY-ALERTS] Vérification désactivée:', {
          hasSettings: !!settings,
          alertsEnabled: settings?.sav_delay_alerts_enabled,
          casesCount: cases.length,
          statusesCount: statuses.length
        });
        return;
      }

      const now = new Date();
      const currentHour = now.getHours();

      // Ne vérifier qu'entre 8h et 18h pour éviter les notifications la nuit
      if (currentHour < 8 || currentHour > 18) {
        console.log('⏰ [SAV-DELAY-ALERTS] Hors horaires de vérification:', currentHour);
        return;
      }

      console.log('⏰ [SAV-DELAY-ALERTS] Début de la vérification des retards pour', cases.length, 'SAV');

      for (const savCase of cases) {
        // Utiliser les fonctions utilitaires pour vérifier les statuts
        
        // Ignorer les SAV terminés (prêts ou annulés)
        if (isReadyStatus(savCase.status)) {
          console.log('✅ [SAV-DELAY-ALERTS] SAV', savCase.case_number, 'prêt/terminé (statut:', savCase.status, ')');
          continue;
        }
        
        if (isCancelledStatus(savCase.status)) {
          console.log('❌ [SAV-DELAY-ALERTS] SAV', savCase.case_number, 'annulé (statut:', savCase.status, ')');
          continue;
        }

        // Ignorer les SAV avec statut en pause
        if (isPauseTimerStatus(savCase.status)) {
          console.log('⏸️ [SAV-DELAY-ALERTS] SAV', savCase.case_number, 'en pause (statut:', savCase.status, ')');
          continue;
        }
        
        // Vérifier que c'est bien un SAV actif
        if (!isActiveStatus(savCase.status)) {
          console.log('⚠️ [SAV-DELAY-ALERTS] SAV', savCase.case_number, 'non actif (statut:', savCase.status, ')');
          continue;
        }

        // Calculer le délai en créant un objet shop temporaire
        const tempShop = {};
        
        const delayInfo = calculateSAVDelay(savCase, tempShop as any, types);
        
        // Si le SAV est en pause (double vérification), ne pas envoyer d'alerte
        if (delayInfo.isPaused) {
          console.log('⏸️ [SAV-DELAY-ALERTS] SAV', savCase.case_number, 'en pause selon delayInfo');
          continue;
        }

        // Déterminer le seuil d'alerte selon le type de SAV
        let alertDays = 2; // Par défaut
        const savType = types.find(type => type.type_key === savCase.sav_type);
        if (savType && savType.alert_days) {
          alertDays = savType.alert_days;
        }

        console.log('📊 [SAV-DELAY-ALERTS] SAV', savCase.case_number, '- Type:', savType?.type_label, '- Alerte:', alertDays, 'jours - Reste:', delayInfo.remainingDays, 'jours');

        // Si le SAV sera en retard dans X jours ou moins (mais pas encore en retard)
        if (!delayInfo.isOverdue && delayInfo.remainingDays <= alertDays && delayInfo.remainingDays >= 0) {
          console.log(`🔔 [SAV-DELAY-ALERTS] Envoi alerte retard pour SAV ${savCase.case_number}, reste ${delayInfo.remainingDays} jours`);
          
          await createSAVDelayAlert(
            savCase.id,
            savCase.case_number,
            delayInfo.remainingDays,
            savCase.sav_type
          );
        }

        // Si le SAV est déjà en retard
        if (delayInfo.isOverdue) {
          console.log(`🚨 [SAV-DELAY-ALERTS] Envoi alerte retard pour SAV ${savCase.case_number}, déjà en retard de ${Math.abs(delayInfo.remainingDays)} jours`);
          
          await createSAVDelayAlert(
            savCase.id,
            savCase.case_number,
            0, // 0 jours = déjà en retard
            savCase.sav_type
          );
        }
      }
      
      console.log('✅ [SAV-DELAY-ALERTS] Vérification terminée');
    };

    // Vérifier immédiatement puis toutes les heures
    console.log('🚀 [SAV-DELAY-ALERTS] Initialisation du système d\'alertes de retard');
    checkSAVDelays();
    const interval = setInterval(checkSAVDelays, 60 * 60 * 1000); // Toutes les heures

    return () => {
      console.log('🛑 [SAV-DELAY-ALERTS] Arrêt du système d\'alertes de retard');
      clearInterval(interval);
    };
  }, [cases, settings, createSAVDelayAlert, types, statuses, isReadyStatus, isCancelledStatus, isPauseTimerStatus, isActiveStatus]);

  return null; // Ce hook ne retourne rien, il fait juste les vérifications
}