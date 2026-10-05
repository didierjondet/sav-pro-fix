import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Destinataire fixé côté serveur : le formulaire ne peut écrire qu'à Fixway.
const CONTACT_TO = 'dpmockup@gmail.com';

const Body = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  company: z.string().trim().max(150).optional().default(''),
  subject: z.string().trim().min(1).max(150),
  message: z.string().trim().min(5).max(3000),
  consent: z.literal(true),
  website: z.string().max(0).optional().default(''), // piège anti-robot
});

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ error: 'Requête invalide' }, 400); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json({ error: 'Champs invalides', details: parsed.error.flatten().fieldErrors }, 400);
  const d = parsed.data;

  const html = `
    <h2>Nouveau message depuis fixway.fr</h2>
    <p><strong>Nom :</strong> ${esc(d.name)}</p>
    <p><strong>E-mail :</strong> <a href="mailto:${esc(d.email)}">${esc(d.email)}</a></p>
    ${d.company ? `<p><strong>Société :</strong> ${esc(d.company)}</p>` : ''}
    <p><strong>Sujet :</strong> ${esc(d.subject)}</p>
    <p><strong>Message :</strong></p>
    <p style="white-space:pre-wrap">${esc(d.message)}</p>
    <hr><p style="color:#888;font-size:12px">Le visiteur a accepté l'utilisation de ses données pour le traitement de sa demande.</p>`;

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await supabase.functions.invoke('send-app-email', {
    body: { to: CONTACT_TO, subject: `[Contact Fixway] ${d.subject}`.slice(0, 180), html, context: 'contact_form' },
  });
  if (error || data?.success === false) {
    console.error('contact-form send failed', error, data);
    return json({ error: "L'envoi a échoué" }, 502);
  }
  return json({ success: true });
});
