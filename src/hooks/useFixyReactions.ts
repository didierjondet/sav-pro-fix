import { useEffect, useRef, useState } from 'react';
import { useSAVCases } from '@/hooks/useSAVCases';
import { useSAVUnreadMessages } from '@/hooks/useSAVUnreadMessages';
import { usePendingAppointments } from '@/hooks/usePendingAppointments';
import type { FixyReaction } from '@/components/help/FixyMascot';

export interface FixyEvent {
  reaction: Exclude<FixyReaction, null>;
  bubble: string;
  /** unique id, change every emission so consumers can re-trigger */
  id: number;
  /** optional internal link triggered when the user clicks the bubble */
  href?: string;
}


/**
 * Surveille l'activité du site et déclenche des réactions transitoires sur Fixy
 * lorsqu'un nouvel évènement métier survient (nouveau SAV, nouveau message, nouveau RDV).
 *
 * Évite d'émettre lors du premier chargement (les baselines sont posées une seule fois)
 * afin que Fixy ne réagisse qu'aux variations *nouvelles*.
 */
export function useFixyReactions(): FixyEvent | null {
  const { cases: savCases } = useSAVCases();
  const { savWithUnreadMessages } = useSAVUnreadMessages();
  const { pendingAppointments } = usePendingAppointments();

  const initialized = useRef(false);
  const prevSavCount = useRef(0);
  const prevUnread = useRef(0);
  const prevPendingAppts = useRef(0);

  const [event, setEvent] = useState<FixyEvent | null>(null);
  const counterRef = useRef(0);

  const emit = (reaction: FixyEvent['reaction'], bubble: string) => {
    counterRef.current += 1;
    setEvent({ reaction, bubble, id: counterRef.current });
  };

  // Auto-clear after ~3s pour libérer la mascotte
  useEffect(() => {
    if (!event) return;
    const t = setTimeout(() => setEvent(null), 3200);
    return () => clearTimeout(t);
  }, [event]);

  useEffect(() => {
    const savCount = savCases?.length ?? 0;
    const unreadTotal = (savWithUnreadMessages || []).reduce(
      (s: number, x: any) => s + (Number(x.unread_count) || 0),
      0,
    );
    const pendingCount = pendingAppointments?.length ?? 0;

    // Première passe : pose les baselines sans émettre
    if (!initialized.current) {
      prevSavCount.current = savCount;
      prevUnread.current = unreadTotal;
      prevPendingAppts.current = pendingCount;
      initialized.current = true;
      return;
    }

    // Nouveau message > nouveau RDV (priorité d'affichage)
    // Note : on n'émet plus de cheer "X nouveaux SAV" — l'accueil de session (useFixyWelcome)
    // s'en charge de manière plus chaleureuse.
    if (unreadTotal > prevUnread.current) {
      const diff = unreadTotal - prevUnread.current;
      emit('alert', diff > 1 ? `${diff} nouveaux messages !` : 'Nouveau message !');
    } else if (pendingCount > prevPendingAppts.current) {
      emit('nod', 'Nouvelle demande de RDV');
    }


    prevSavCount.current = savCount;
    prevUnread.current = unreadTotal;
    prevPendingAppts.current = pendingCount;
  }, [savCases, savWithUnreadMessages, pendingAppointments]);

  return event;
}
