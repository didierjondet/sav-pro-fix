export const DIAG_INGEST_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/diagnostics-ingest`;
export const diagPublicUrl = (token: string) => `https://fixway.fr/diag/${token}`;

export const GRADE_INFO: Record<string, { label: string; gradient: string }> = {
  A: { label: 'Excellent état', gradient: 'linear-gradient(135deg,#10b981,#06b6d4)' },
  B: { label: 'Très bon état', gradient: 'linear-gradient(135deg,#22c55e,#16a34a)' },
  C: { label: 'État correct', gradient: 'linear-gradient(135deg,#f59e0b,#ea580c)' },
  D: { label: 'Défauts importants', gradient: 'linear-gradient(135deg,#ef4444,#b91c1c)' },
};
export const gradeInfo = (g?: string | null) => GRADE_INFO[(g ?? '').toUpperCase()] ?? { label: 'Non noté', gradient: 'linear-gradient(135deg,#64748b,#475569)' };

/** Masks an IMEI, keeping only the last 4 digits. */
export function maskImei(imei?: string | null) {
  if (!imei) return '';
  const s = String(imei);
  return s.length <= 4 ? s : '•'.repeat(s.length - 4) + s.slice(-4);
}

/** Generates a DiagStation API key: "dsk_" + 40 url-safe random chars. */
export function generateApiKey() {
  const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const r = crypto.getRandomValues(new Uint8Array(40));
  return 'dsk_' + [...r].map((x) => a[x % a.length]).join('');
}
export async function sha256Hex(s: string) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
