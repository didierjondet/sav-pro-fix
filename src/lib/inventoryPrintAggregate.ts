import { supabase } from '@/integrations/supabase/client';
import type { InventorySession, InventorySessionItem } from '@/components/settings/inventory/types';
import { printInventoryDocument } from '@/lib/inventoryPrint';

function currency(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(value || 0);
}
function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export async function fetchSessionItems(sessionId: string): Promise<InventorySessionItem[]> {
  const { data, error } = await supabase
    .from('inventory_session_items')
    .select('*')
    .eq('inventory_session_id', sessionId)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as InventorySessionItem[];
}

const isMissing = (item: InventorySessionItem) =>
  item.is_missing === true ||
  item.line_status === 'missing' ||
  ((item.counted_quantity ?? 0) === 0 && item.expected_quantity > 0 && item.variance_quantity < 0);

export interface AggregateOptions {
  title?: string;
  periodLabel?: string;
}

/** Génère un PDF de synthèse globale agrégeant plusieurs sessions. */
export async function printAggregateSummary(
  sessions: InventorySession[],
  options: AggregateOptions = {},
) {
  const rows = await Promise.all(
    sessions.map(async (s) => {
      const items = await fetchSessionItems(s.id);
      const ecart = items.reduce((sum, it) => sum + (it.variance_value || 0), 0);
      const missingValue = items.filter(isMissing).reduce((sum, it) => sum + it.unit_cost * it.expected_quantity, 0);
      const missingCount = items.filter(isMissing).length;
      return { session: s, items, ecart, missingValue, missingCount };
    }),
  );

  const totalEcart = rows.reduce((s, r) => s + r.ecart, 0);
  const totalMissingValue = rows.reduce((s, r) => s + r.missingValue, 0);
  const totalMissingCount = rows.reduce((s, r) => s + r.missingCount, 0);
  const totalRefs = rows.reduce((s, r) => s + r.items.length, 0);

  const popup = window.open('', '_blank', 'width=1100,height=800');
  if (!popup) return;

  const title = options.title ?? 'Synthèse globale des inventaires';

  popup.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"/>
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; color:#111827; }
      h1 { font-size: 22px; margin: 0 0 4px; }
      h2 { font-size: 13px; margin: 0 0 14px; color:#4b5563; font-weight:normal; }
      .meta { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin: 16px 0; }
      .box { border:1px solid #d1d5db; padding:10px 12px; border-radius:6px; }
      .label { font-size:10px; text-transform:uppercase; color:#6b7280; }
      .value { font-size:18px; font-weight:700; margin-top:4px; }
      table { width:100%; border-collapse:collapse; margin-top:10px; }
      th, td { border:1px solid #d1d5db; padding:6px 8px; font-size:11px; text-align:left; vertical-align:top; }
      th { background:#f3f4f6; }
      .right { text-align:right; }
      .red { color:#dc2626; }
      .green { color:#16a34a; }
      @media print { body { margin:10px; } }
    </style></head><body>
    <h1>${escapeHtml(title)}</h1>
    <h2>${escapeHtml(options.periodLabel ?? '')} · ${rows.length} inventaire(s) · Édité le ${escapeHtml(new Date().toLocaleString('fr-FR'))}</h2>

    <div class="meta">
      <div class="box"><div class="label">Inventaires</div><div class="value">${rows.length}</div></div>
      <div class="box"><div class="label">Références totales</div><div class="value">${totalRefs}</div></div>
      <div class="box"><div class="label">Écart global cumulé</div><div class="value ${totalEcart >= 0 ? 'green' : 'red'}">${totalEcart >= 0 ? '+ ' : ''}${escapeHtml(currency(totalEcart))}</div></div>
      <div class="box"><div class="label">Manquants (valeur)</div><div class="value red">${escapeHtml(currency(totalMissingValue))}</div></div>
    </div>

    <table>
      <thead><tr>
        <th>Inventaire</th><th>Mode</th><th>Statut</th><th>Date</th>
        <th class="right">Réfs</th><th class="right">Comptés/Total</th>
        <th class="right">Manquants</th><th class="right">Val. manquants</th><th class="right">Écart</th>
      </tr></thead>
      <tbody>
        ${rows.map((r) => {
          const s = r.session;
          const dateRef = s.applied_at || s.completed_at || s.created_at;
          return `<tr>
            <td>${escapeHtml(s.name)}</td>
            <td>${escapeHtml(s.mode)}</td>
            <td>${escapeHtml(s.status)}</td>
            <td>${escapeHtml(new Date(dateRef).toLocaleDateString('fr-FR'))}</td>
            <td class="right">${r.items.length}</td>
            <td class="right">${s.counted_items}/${s.total_items}</td>
            <td class="right">${r.missingCount}</td>
            <td class="right red">${escapeHtml(currency(r.missingValue))}</td>
            <td class="right ${r.ecart >= 0 ? 'green' : 'red'}">${r.ecart >= 0 ? '+ ' : ''}${escapeHtml(currency(r.ecart))}</td>
          </tr>`;
        }).join('')}
        <tr style="font-weight:700;background:#f9fafb">
          <td colspan="4">TOTAL</td>
          <td class="right">${totalRefs}</td>
          <td class="right">—</td>
          <td class="right">${totalMissingCount}</td>
          <td class="right red">${escapeHtml(currency(totalMissingValue))}</td>
          <td class="right ${totalEcart >= 0 ? 'green' : 'red'}">${totalEcart >= 0 ? '+ ' : ''}${escapeHtml(currency(totalEcart))}</td>
        </tr>
      </tbody>
    </table>
  </body></html>`);
  popup.document.close();
  popup.focus();
  popup.print();
}

/** Imprime un document détaillé (synthèse ou manquants) pour chaque session, en série. */
export async function printPerSession(
  sessions: InventorySession[],
  variant: 'summary' | 'missing',
) {
  for (const s of sessions) {
    const items = await fetchSessionItems(s.id);
    printInventoryDocument({ session: s, items, variant });
    // léger délai pour permettre l'ouverture des popups successifs
    await new Promise((r) => setTimeout(r, 350));
  }
}
