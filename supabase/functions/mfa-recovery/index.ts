import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function sha256(value: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const backupCode = typeof body?.backupCode === 'string' ? body.backupCode.trim().toUpperCase() : '';

    if (!email || !password || backupCode.length < 6) {
      return json({ error: 'Email, mot de passe et code de secours requis' }, 400);
    }

    // 1. Vérifier les identifiants (donne une session AAL1 même avec MFA actif)
    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({ email, password });
    if (signInError || !signIn?.user) {
      return json({ error: 'Identifiants invalides' }, 401);
    }
    const userId = signIn.user.id;

    // 2. Vérifier le code de secours
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const hash = await sha256(backupCode);
    const { data: codeRow } = await admin
      .from('user_mfa_backup_codes')
      .select('id')
      .eq('user_id', userId)
      .eq('code_hash', hash)
      .is('used_at', null)
      .maybeSingle();

    if (!codeRow) {
      return json({ error: 'Code de secours invalide ou déjà utilisé' }, 401);
    }

    await admin.from('user_mfa_backup_codes').update({ used_at: new Date().toISOString() }).eq('id', codeRow.id);

    // 3. Supprimer les facteurs TOTP pour permettre un nouvel enrôlement
    const { data: factors } = await (admin.auth.admin as any).mfa.listFactors({ userId });
    const list = factors?.factors ?? [];
    for (const f of list) {
      await (admin.auth.admin as any).mfa.deleteFactor({ userId, id: f.id });
    }

    return json({ success: true, removed: list.length });
  } catch (e) {
    console.error('mfa-recovery error', e);
    return json({ error: 'Erreur interne' }, 500);
  }
});
