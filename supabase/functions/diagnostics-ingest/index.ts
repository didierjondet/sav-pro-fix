import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function sha256(s: string) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function token(len = 32) {
  const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const r = crypto.getRandomValues(new Uint8Array(len));
  return [...r].map((x) => a[x % 64]).join('');
}
const str = (v: unknown, max = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const int = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  const key = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!key) return json({ error: 'Missing API key' }, 401);

  const raw = await req.text();
  if (raw.length > 2 * 1024 * 1024) return json({ error: 'Payload too large (max 2 MB)' }, 413);
  let body: any;
  try { body = JSON.parse(raw); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: k } = await db.from('diagnostic_api_keys').select('id, shop_id')
    .eq('key_hash', await sha256(key)).is('revoked_at', null).maybeSingle();
  if (!k) return json({ error: 'Invalid or revoked API key' }, 401);
  await db.from('diagnostic_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', k.id);
  const { data: shop } = await db.from('shops').select('name').eq('id', k.shop_id).maybeSingle();

  if (body?.event === 'ping') return json({ ok: true, shop: shop?.name ?? '' });
  if (body?.event !== 'diagnostic.completed') return json({ error: 'Unknown event' }, 400);

  const report = body.report ?? {}, device = body.device ?? {}, customer = body.customer ?? {}, summary = body.summary ?? {};
  const id = typeof report.id === 'string' ? report.id : '';
  if (!/^[A-Za-z0-9-]{4,40}$/.test(id)) return json({ error: 'Invalid report.id' }, 400);
  if (report.pdf_base64) delete report.pdf_base64;

  const { data: existing } = await db.from('device_diagnostics')
    .select('shop_id, public_token, sav_case_id').eq('id', id).maybeSingle();
  if (existing && existing.shop_id !== k.shop_id) return json({ error: 'Report id belongs to another shop' }, 403);

  const imei = str(device.imei, 40), serial = str(device.serial, 80), ticket = str(customer.ticket, 80);
  let savId: string | null = existing?.sav_case_id ?? null;
  if (!savId && ticket) {
    const { data } = await db.from('sav_cases').select('id').eq('shop_id', k.shop_id)
      .or(`case_number.eq.${ticket.replace(/[,()]/g, '')},tracking_slug.eq.${ticket.replace(/[,()]/g, '')}`)
      .limit(1).maybeSingle();
    savId = data?.id ?? null;
  }
  if (!savId) {
    const ids = [imei, serial].filter(Boolean) as string[];
    if (ids.length) {
      const { data: cands } = await db.from('sav_cases').select('id, status')
        .eq('shop_id', k.shop_id).in('device_imei', ids).order('created_at', { ascending: false }).limit(10);
      for (const c of cands ?? []) {
        const { data: fin } = await db.rpc('is_final_sav_status', { p_shop_id: k.shop_id, p_status: c.status });
        if (!fin) { savId = c.id; break; }
      }
    }
  }

  const failed = Array.isArray(summary.failed) ? summary.failed.filter((x: unknown) => typeof x === 'string').slice(0, 200) : [];
  const publicToken = existing?.public_token ?? token(32);
  const row = {
    id, shop_id: k.shop_id, sav_case_id: savId, public_token: publicToken,
    platform: str(device.platform, 40), brand: str(device.brand, 80), model: str(device.model, 120),
    serial, imei, os: str(device.os, 80), grade: str(report.grade, 2)?.toUpperCase() ?? null,
    score: int(report.score), pass_count: int(summary.pass), fail_count: int(summary.fail),
    failed_tests: failed, customer_name: str(customer.name, 120), customer_ticket: ticket,
    technician: str(report.technician, 120), payload: { ...body, report },
    created_at: str(report.created_at, 40) ?? new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  const { error } = await db.from('device_diagnostics').upsert(row, { onConflict: 'id' });
  if (error) { console.error('diagnostics-ingest upsert failed', error.message); return json({ error: 'Storage failed' }, 500); }

  return json({ id, url: `https://fixway.fr/diag/${publicToken}`, sav_id: savId });
});
