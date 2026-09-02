import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MFAFactor {
  id: string;
  friendly_name?: string;
  status: string;
  created_at: string;
}

async function sha256(value: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateBackupCodes(count = 8) {
  const codes: string[] = [];
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < count; i++) {
    const bytes = crypto.getRandomValues(new Uint8Array(10));
    const raw = Array.from(bytes)
      .map((b) => alphabet[b % alphabet.length])
      .join('');
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5, 10)}`);
  }
  return codes;
}

export function useMFA() {
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [aal, setAal] = useState<{ currentLevel: string | null; nextLevel: string | null }>({
    currentLevel: null,
    nextLevel: null,
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      setFactors(((data?.totp ?? []) as any[]).map((f) => ({
        id: f.id,
        friendly_name: f.friendly_name,
        status: f.status,
        created_at: f.created_at,
      })));
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      setAal({
        currentLevel: aalData?.currentLevel ?? null,
        nextLevel: aalData?.nextLevel ?? null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const verifiedFactors = factors.filter((f) => f.status === 'verified');
  const isEnabled = verifiedFactors.length > 0;
  const needsChallenge = aal.currentLevel === 'aal1' && aal.nextLevel === 'aal2';

  const enroll = useCallback(async (friendlyName: string) => {
    // Nettoyer un éventuel enrôlement inachevé portant le même nom
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const f of (existing?.totp ?? []) as any[]) {
      if (f.status === 'unverified') {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName,
    });
    if (error) throw error;
    return {
      factorId: data.id,
      qrCode: (data as any).totp?.qr_code as string,
      secret: (data as any).totp?.secret as string,
      uri: (data as any).totp?.uri as string,
    };
  }, []);

  const verifyEnrollment = useCallback(async (factorId: string, code: string) => {
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
    if (cErr) throw cErr;
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.replace(/\s/g, ''),
    });
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const challengeAndVerify = useCallback(async (code: string) => {
    const { data } = await supabase.auth.mfa.listFactors();
    const factor = ((data?.totp ?? []) as any[]).find((f) => f.status === 'verified');
    if (!factor) throw new Error("Aucun appareil d'authentification enregistré");
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: factor.id });
    if (cErr) throw cErr;
    const { error } = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code: code.replace(/\s/g, ''),
    });
    if (error) throw error;
    await refresh();
  }, [refresh]);

  const unenroll = useCallback(async (factorId: string) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) throw error;
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      await supabase.from('user_mfa_backup_codes' as any).delete().eq('user_id', userData.user.id);
    }
    await refresh();
  }, [refresh]);

  const saveBackupCodes = useCallback(async (codes: string[]) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;
    await supabase.from('user_mfa_backup_codes' as any).delete().eq('user_id', userId);
    const rows = await Promise.all(
      codes.map(async (c) => ({ user_id: userId, code_hash: await sha256(c) }))
    );
    await supabase.from('user_mfa_backup_codes' as any).insert(rows as any);
  }, []);

  return {
    factors: verifiedFactors,
    allFactors: factors,
    loading,
    isEnabled,
    needsChallenge,
    aal,
    refresh,
    enroll,
    verifyEnrollment,
    challengeAndVerify,
    unenroll,
    saveBackupCodes,
  };
}
