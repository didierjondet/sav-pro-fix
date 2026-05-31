import { useEffect, useRef, useState } from 'react';
import { useSAVCases } from '@/hooks/useSAVCases';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';
import { useProfile } from '@/hooks/useProfile';
import type { FixyEvent } from '@/hooks/useFixyReactions';

const SESSION_KEY = 'fixway_fixy_welcome_session';

function greetingByHour(firstName?: string | null) {
  const h = new Date().getHours();
  const name = firstName ? ` ${firstName}` : '';
  if (h < 12) return `Bonjour${name} ☀️`;
  if (h < 18) return `Bon après-midi${name} 👋`;
  return `Bonsoir${name} 🌙`;
}

/**
 * Accueil chaleureux à la première connexion d'une session navigateur :
 *  1) Bulle de salutation contextuelle (matin / après-midi / soir).
 *  2) Bulle résumant les SAV en attente + 3 urgences (triées par dépassement / proximité du délai max).
 *
 * Se déclenche une seule fois par session (sessionStorage), uniquement quand les SAV
 * et le profil sont chargés. Aucune émission si aucun SAV en cours.
 */
export function useFixyWelcome(): FixyEvent | null {
  const { cases } = useSAVCases();
  const { profile } = useProfile();
  const { isReadyStatus, isCancelledStatus } = useShopSAVStatuses();
  const { getTypeInfo } = useShopSAVTypes();

  const [event, setEvent] = useState<FixyEvent | null>(null);
  const counterRef = useRef(1000);
  const phaseRef = useRef<'idle' | 'greeted' | 'done'>('idle');

  // Auto-clear chaque bulle après ~5s
  useEffect(() => {
    if (!event) return;
    const t = setTimeout(() => setEvent(null), 5000);
    return () => clearTimeout(t);
  }, [event]);

  useEffect(() => {
    if (phaseRef.current === 'done') return;
    if (!cases || !profile) return;
    if (typeof window === 'undefined') return;

    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') {
        phaseRef.current = 'done';
        return;
      }
    } catch {
      // sessionStorage indisponible : on n'insiste pas
      phaseRef.current = 'done';
      return;
    }

    if (phaseRef.current === 'idle') {
      // Bulle 1 : salutation
      counterRef.current += 1;
      setEvent({
        reaction: 'greet',
        bubble: greetingByHour(profile.first_name),
        id: counterRef.current,
      });
      phaseRef.current = 'greeted';

      // Bulle 2 chaînée après 3,5 s
      const t = setTimeout(() => {
        const openCases = cases.filter(
          c => !isReadyStatus(c.status) && !isCancelledStatus(c.status)
        );
        const pendingCount = openCases.length;

        // Calcul d'un score d'urgence (jours restants avant délai max)
        const scored = openCases.map(c => {
          const maxDays = getTypeInfo(c.sav_type)?.max_processing_days ?? 7;
          const created = new Date(c.created_at).getTime();
          const elapsedDays = (Date.now() - created) / (1000 * 60 * 60 * 24);
          const remaining = maxDays - elapsedDays;
          return { c, remaining };
        });
        scored.sort((a, b) => a.remaining - b.remaining);
        const top = scored.slice(0, 3).map(s => s.c.case_number);

        counterRef.current += 1;
        let bubble: string;
        if (pendingCount === 0) {
          bubble = `Aucun SAV en cours, profite du calme 🌿`;
        } else if (top.length === 0) {
          bubble = `${pendingCount} SAV en attente.`;
        } else {
          bubble = `${pendingCount} SAV en attente. Urgences : ${top.join(', ')}`;
        }
        setEvent({
          reaction: 'nod',
          bubble,
          id: counterRef.current,
        });

        try {
          sessionStorage.setItem(SESSION_KEY, '1');
        } catch {}
        phaseRef.current = 'done';
      }, 3500);

      return () => clearTimeout(t);
    }
  }, [cases, profile, isReadyStatus, isCancelledStatus, getTypeInfo]);

  return event;
}
