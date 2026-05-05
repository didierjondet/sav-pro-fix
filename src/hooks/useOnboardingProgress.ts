import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import { useProfile } from '@/hooks/useProfile';

export interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  status: 'done' | 'pending';
  actionRoute: string;
  helpQuestion: string;
  category: 'profile' | 'shop' | 'sav' | 'inventory' | 'agenda' | 'team' | 'tutorial';
  manual?: boolean; // step is marked as seen manually (not auto-detected)
}

interface ProgressRow {
  shop_id: string;
  steps_seen: string[];
  dismissed_until: string | null;
  completed_at: string | null;
}

const PEDAGOGICAL_STEPS = ['messaging_tutorial', 'sms_personalization'];

export function useOnboardingProgress() {
  const { shop } = useShop();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const shopId = shop?.id;

  // Counts for auto-detected steps
  const { data: counts } = useQuery({
    queryKey: ['onboarding-counts', shopId],
    enabled: !!shopId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!shopId) return null;
      const [savTypes, customStatuses, parts, savCases, workingHours, members] = await Promise.all([
        supabase.from('shop_sav_types').select('id', { count: 'exact', head: true }).eq('shop_id', shopId).eq('is_default', false),
        supabase.from('shop_sav_statuses').select('id', { count: 'exact', head: true }).eq('shop_id', shopId).eq('is_default', false),
        supabase.from('parts').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
        supabase.from('sav_cases').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
        supabase.from('shop_working_hours').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
      ]);
      return {
        customSavTypes: savTypes.count ?? 0,
        customStatuses: customStatuses.count ?? 0,
        parts: parts.count ?? 0,
        savCases: savCases.count ?? 0,
        workingHours: workingHours.count ?? 0,
        members: members.count ?? 0,
      };
    },
  });

  // Persisted progress row
  const { data: progress } = useQuery({
    queryKey: ['onboarding-progress', shopId],
    enabled: !!shopId,
    staleTime: 30_000,
    queryFn: async (): Promise<ProgressRow | null> => {
      if (!shopId) return null;
      const { data } = await supabase
        .from('shop_onboarding_progress' as any)
        .select('*')
        .eq('shop_id', shopId)
        .maybeSingle();
      return (data as any) || { shop_id: shopId, steps_seen: [], dismissed_until: null, completed_at: null };
    },
  });

  const stepsSeen: string[] = (progress?.steps_seen as any) || [];

  const steps: OnboardingStep[] = useMemo(() => {
    const profileComplete = !!(profile?.first_name && profile?.last_name && profile?.phone);
    const shopComplete = !!(shop?.name && shop.name !== 'Mon Magasin' && shop?.email);
    const shopExtended = !!(shop?.phone && shop?.address);

    return [
      {
        id: 'profile',
        label: 'Compléter votre profil',
        description: 'Renseignez votre nom, prénom et téléphone pour personnaliser votre espace.',
        status: profileComplete ? 'done' : 'pending',
        actionRoute: '/settings?tab=profile',
        helpQuestion: 'Comment compléter mon profil utilisateur ?',
        category: 'profile',
      },
      {
        id: 'shop',
        label: 'Configurer votre magasin',
        description: 'Nom, email, logo… les informations qui apparaîtront sur les fiches client.',
        status: shopComplete ? 'done' : 'pending',
        actionRoute: '/settings?tab=shop',
        helpQuestion: 'Comment configurer les informations de mon magasin ?',
        category: 'shop',
      },
      {
        id: 'shop_contact',
        label: 'Ajouter téléphone & adresse magasin',
        description: 'Indispensable pour les SMS, devis et factures envoyés aux clients.',
        status: shopExtended ? 'done' : 'pending',
        actionRoute: '/settings?tab=shop',
        helpQuestion: 'Pourquoi dois-je renseigner le téléphone et l\'adresse de mon magasin ?',
        category: 'shop',
      },
      {
        id: 'sav_types',
        label: 'Personnaliser vos types de SAV',
        description: 'Créez vos propres catégories (Téléphone, Tablette, Console…).',
        status: (counts?.customSavTypes ?? 0) > 0 ? 'done' : 'pending',
        actionRoute: '/settings?tab=sav-types',
        helpQuestion: 'Comment créer mes propres types de SAV ?',
        category: 'sav',
      },
      {
        id: 'sav_statuses',
        label: 'Personnaliser vos statuts SAV',
        description: 'Adaptez les étapes de traitement à votre flux de travail.',
        status: (counts?.customStatuses ?? 0) > 0 ? 'done' : 'pending',
        actionRoute: '/settings?tab=sav-statuses',
        helpQuestion: 'Comment ajouter ou modifier mes statuts SAV ?',
        category: 'sav',
      },
      {
        id: 'first_part',
        label: 'Ajouter une première pièce détachée',
        description: 'Construisez votre catalogue pour gérer le stock et chiffrer vos SAV.',
        status: (counts?.parts ?? 0) > 0 ? 'done' : 'pending',
        actionRoute: '/parts',
        helpQuestion: 'Comment ajouter une pièce détachée à mon stock ?',
        category: 'inventory',
      },
      {
        id: 'working_hours',
        label: 'Définir vos horaires d\'ouverture',
        description: 'Permet aux clients de prendre rendez-vous via votre agenda public.',
        status: (counts?.workingHours ?? 0) > 0 ? 'done' : 'pending',
        actionRoute: '/agenda',
        helpQuestion: 'Comment configurer mes horaires d\'ouverture ?',
        category: 'agenda',
      },
      {
        id: 'first_sav',
        label: 'Créer un premier SAV',
        description: 'Lancez-vous : créez un dossier de test pour découvrir le flux complet.',
        status: (counts?.savCases ?? 0) > 0 ? 'done' : 'pending',
        actionRoute: '/sav/new',
        helpQuestion: 'Comment créer mon premier dossier SAV étape par étape ?',
        category: 'sav',
      },
      {
        id: 'team',
        label: 'Inviter votre équipe',
        description: 'Ajoutez vos techniciens pour collaborer sur les dossiers.',
        status: (counts?.members ?? 0) > 1 || stepsSeen.includes('team') ? 'done' : 'pending',
        actionRoute: '/settings?tab=users',
        helpQuestion: 'Comment inviter un technicien dans mon équipe ?',
        category: 'team',
        manual: true,
      },
      {
        id: 'messaging_tutorial',
        label: 'Découvrir la messagerie client',
        description: 'Comprenez comment échanger avec vos clients (chat & SMS).',
        status: stepsSeen.includes('messaging_tutorial') ? 'done' : 'pending',
        actionRoute: '/client-chats',
        helpQuestion: 'Comment fonctionne la messagerie avec mes clients ?',
        category: 'tutorial',
        manual: true,
      },
      {
        id: 'sms_personalization',
        label: 'Personnaliser vos messages SMS',
        description: 'Adaptez les modèles de SMS envoyés automatiquement à vos clients.',
        status: stepsSeen.includes('sms_personalization') ? 'done' : 'pending',
        actionRoute: '/settings?tab=sms',
        helpQuestion: 'Comment personnaliser les SMS automatiques envoyés aux clients ?',
        category: 'tutorial',
        manual: true,
      },
    ];
  }, [profile, shop, counts, stepsSeen]);

  const totalSteps = steps.length;
  const doneCount = steps.filter(s => s.status === 'done').length;
  const pendingCount = totalSteps - doneCount;
  const progressPercent = totalSteps > 0 ? Math.round((doneCount / totalSteps) * 100) : 0;
  const isFullyConfigured = pendingCount === 0;

  const dismissedUntil = progress?.dismissed_until ? new Date(progress.dismissed_until) : null;
  const isDismissed = !!(dismissedUntil && dismissedUntil.getTime() > Date.now());

  const markStepSeen = useMutation({
    mutationFn: async (stepId: string) => {
      if (!shopId) return;
      const newSteps = Array.from(new Set([...stepsSeen, stepId]));
      await supabase
        .from('shop_onboarding_progress' as any)
        .upsert({ shop_id: shopId, steps_seen: newSteps as any }, { onConflict: 'shop_id' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onboarding-progress', shopId] }),
  });

  const dismissTemporarily = useMutation({
    mutationFn: async (hours: number = 24) => {
      if (!shopId) return;
      const until = new Date(Date.now() + hours * 3600 * 1000).toISOString();
      await supabase
        .from('shop_onboarding_progress' as any)
        .upsert({ shop_id: shopId, dismissed_until: until }, { onConflict: 'shop_id' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onboarding-progress', shopId] }),
  });

  const restartOnboarding = useMutation({
    mutationFn: async () => {
      if (!shopId) return;
      await supabase
        .from('shop_onboarding_progress' as any)
        .upsert({ shop_id: shopId, dismissed_until: null, steps_seen: [] as any, completed_at: null }, { onConflict: 'shop_id' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onboarding-progress', shopId] }),
  });

  return {
    steps,
    doneCount,
    pendingCount,
    totalSteps,
    progressPercent,
    isFullyConfigured,
    isDismissed,
    markStepSeen: markStepSeen.mutate,
    dismissTemporarily: dismissTemporarily.mutate,
    restartOnboarding: restartOnboarding.mutate,
  };
}
