import { useEffect, useRef, useState } from 'react';
import { useSAVCases } from '@/hooks/useSAVCases';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';
import type { FixyEvent } from '@/hooks/useFixyReactions';

const LS_KEY = 'fixway_fixy_last_tip_ts';
const ONE_HOUR_MS = 60 * 60 * 1000;

const SOFT_TIPS: string[] = [
  '💡 Astuce : tu peux dupliquer un SAV depuis le menu ⋯ de la fiche.',
  '💡 Le QR code de suivi se génère automatiquement pour chaque SAV.',
  '💡 Tu peux filtrer la liste SAV par type, statut et urgence en un clic.',
  '💡 Le chat client reste ouvert tant que le SAV n\'est pas clôturé.',
  '💡 Les rapports PDF se génèrent automatiquement à la clôture d\'un SAV.',
  '💡 N\'oublie pas de vérifier les commandes de pièces en attente.',
  '💡 Tu peux envoyer un devis par SMS au client en un clic.',
  '💡 Les rendez-vous peuvent être proposés directement depuis la fiche SAV.',
  '💡 Configure tes statuts SAV sur mesure dans les paramètres.',
  '💡 La page de suivi public affiche aussi le matériel prêté au client.',
  '💡 Pense à enregistrer les retours satisfaction pour suivre ta qualité.',
  '💡 Les pièces faibles en stock sont signalées dans l\'inventaire.',
  '💡 Les fournisseurs ont leur propre annuaire — pratique pour les commandes.',
  '💡 Les SAV en retard apparaissent en orange dans la liste.',
  '💡 Tu peux consulter l\'historique d\'un produit via son IMEI.',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Toutes les 60 minutes (avec persistance en localStorage pour ne pas re-déclencher
 * à chaque navigation), Fixy pousse une petite bulle :
 *  - 50% du temps : une astuce sur le logiciel (pool statique)
 *  - 50% du temps si présent : un rappel sur un SAV qui traîne (le plus en retard)
 *
 * Bulle cliquable (href) quand il s'agit d'un SAV.
 */
export function useFixyHourlyTips(): FixyEvent | null {
  const { cases } = useSAVCases();
  const { isReadyStatus, isCancelledStatus } = useShopSAVStatuses();
  const { getTypeInfo } = useShopSAVTypes();

  const [event, setEvent] = useState<FixyEvent | null>(null);
  const counterRef = useRef(2000);
  const initRef = useRef(false);

  // Auto-clear après ~6s pour laisser le temps de lire/cliquer
  useEffect(() => {
    if (!event) return;
    const t = setTimeout(() => setEvent(null), 6000);
    return () => clearTimeout(t);
  }, [event]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const computeAndMaybeEmit = () => {
      if (!cases) return;

      // Sélectionne le SAV le plus en dépassement (jours restants les plus négatifs)
      let stuckLine: { case_number: string; id: string; daysLate: number } | null = null;
      const openCases = cases.filter(
        c => !isReadyStatus(c.status) && !isCancelledStatus(c.status)
      );
      for (const c of openCases) {
        const maxDays = getTypeInfo(c.sav_type)?.max_processing_days ?? 7;
        const elapsedDays = (Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24);
        const daysLate = elapsedDays - maxDays;
        if (daysLate > 0 && (!stuckLine || daysLate > stuckLine.daysLate)) {
          stuckLine = { case_number: c.case_number, id: c.id, daysLate };
        }
      }

      const useStuck = stuckLine && Math.random() < 0.5;
      counterRef.current += 1;
      if (useStuck && stuckLine) {
        const days = Math.max(1, Math.round(stuckLine.daysLate));
        setEvent({
          reaction: 'tip',
          bubble: `Le SAV ${stuckLine.case_number} traîne depuis ${days} j, on regarde ?`,
          id: counterRef.current,
          href: `/sav/${stuckLine.id}`,
        });
      } else {
        setEvent({
          reaction: 'tip',
          bubble: pickRandom(SOFT_TIPS),
          id: counterRef.current,
        });
      }

      try {
        localStorage.setItem(LS_KEY, String(Date.now()));
      } catch {}
    };

    // À l'init : calcule le délai restant avant le prochain tip
    let timeoutId: number | undefined;
    let intervalId: number | undefined;

    const scheduleNext = () => {
      let last = 0;
      try {
        last = Number(localStorage.getItem(LS_KEY) || 0);
      } catch {}
      const elapsed = Date.now() - last;
      const wait = Math.max(0, ONE_HOUR_MS - elapsed);
      // Première heure de session : on n'émet jamais immédiatement (l'accueil a la priorité)
      const initialWait = initRef.current ? wait : Math.max(wait, 15 * 60 * 1000);
      initRef.current = true;

      timeoutId = window.setTimeout(() => {
        computeAndMaybeEmit();
        intervalId = window.setInterval(computeAndMaybeEmit, ONE_HOUR_MS);
      }, initialWait);
    };

    scheduleNext();

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [cases, isReadyStatus, isCancelledStatus, getTypeInfo]);

  return event;
}
