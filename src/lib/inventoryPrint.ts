import type { InventoryAuditLog, InventorySession, InventorySessionItem } from '@/components/settings/inventory/types';

const ACTION_LABELS: Record<string, string> = {
  session_paused: 'Pause',
  session_resumed: 'Reprise',
  session_stopped: 'Arrêt',
  session_completed: 'Clôture',
  session_cancelled: 'Annulation',
  session_applied: 'Application stock',
  item_updated: 'Modification ligne',
  bulk_scan: 'Lot de scan',
};

export function printInventoryAuditLog({
  session,
  logs,
}: {
  session: InventorySession;
  logs: InventoryAuditLog[];
}) {
  const popup = window.open('', '_blank', 'width=1100,height=800');
  if (!popup) return;
  const sorted = [...logs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  popup.document.write(`
    <!doctype html>
    <html lang="fr"><head><meta charset="utf-8" />
      <title>Journal — ${escapeHtml(session.name)}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 18px; color:#111827; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        h2 { font-size: 12px; margin: 0 0 14px; color:#4b5563; font-weight:normal; }
        .summary { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:14px; }
        .box { border:1px solid #d1d5db; padding:8px 10px; border-radius:6px; }
        .label { font-size:10px; text-transform:uppercase; color:#6b7280; }
        .value { font-size:14px; font-weight:700; }
        table { width:100%; border-collapse:collapse; }
        th, td { border:1px solid #d1d5db; padding:5px 6px; font-size:11px; vertical-align:top; text-align:left; }
        th { background:#f3f4f6; }
        .arrow { color:#6b7280; }
        .old { color:#dc2626; text-decoration: line-through; }
        .new { color:#16a34a; font-weight:600; }
        @media print { body { margin:8px; } }
      </style></head><body>
      <h1>Journal d'inventaire — ${escapeHtml(session.name)}</h1>
      <h2>Statut: ${escapeHtml(session.status)} · Créé le ${escapeHtml(new Date(session.created_at).toLocaleString('fr-FR'))}${session.applied_at ? ` · Appliqué le ${escapeHtml(new Date(session.applied_at).toLocaleString('fr-FR'))}` : ''} · ${sorted.length} mouvement(s)</h2>
      <div class="summary">
        <div class="box"><div class="label">Lignes comptées</div><div class="value">${session.counted_items}/${session.total_items}</div></div>
        <div class="box"><div class="label">Manquants</div><div class="value">${session.missing_items}</div></div>
        <div class="box"><div class="label">Valeur écart</div><div class="value">${escapeHtml(currency(session.variance_total_cost))}</div></div>
        <div class="box"><div class="label">Valeur manquants</div><div class="value">${escapeHtml(currency(session.missing_total_cost))}</div></div>
      </div>
      <table>
        <thead><tr>
          <th>Date / Heure</th><th>Auteur</th><th>Action</th><th>Pièce</th>
          <th>Champ</th><th>Avant</th><th>Après</th><th>Détails</th>
        </tr></thead>
        <tbody>
          ${sorted.map((log) => {
            const meta = log.metadata || {};
            const itemName = (typeof meta.item_name === 'string' && meta.item_name)
              || (typeof meta.part_name === 'string' && meta.part_name) || '';
            const extras = Object.entries(meta)
              .filter(([k]) => !['item_name', 'part_name'].includes(k))
              .map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(typeof v === 'object' ? JSON.stringify(v) : String(v))}`)
              .join('<br/>');
            return `<tr>
              <td>${escapeHtml(new Date(log.created_at).toLocaleString('fr-FR'))}</td>
              <td>${escapeHtml(log.changed_by_name)}</td>
              <td>${escapeHtml(ACTION_LABELS[log.action] || log.action)}</td>
              <td>${escapeHtml(itemName || '—')}</td>
              <td>${escapeHtml(log.field_name || '—')}</td>
              <td><span class="old">${escapeHtml(log.old_value ?? '')}</span></td>
              <td><span class="new">${escapeHtml(log.new_value ?? '')}</span></td>
              <td>${extras || '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </body></html>`);
  popup.document.close();
  popup.focus();
  popup.print();
}

function currency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function printInventoryDocument({
  session,
  items,
  variant,
}: {
  session: InventorySession;
  items: InventorySessionItem[];
  variant: 'summary' | 'count-sheet' | 'missing';
}) {
  const titleMap = {
    summary: `Synthèse d'inventaire - ${session.name}`,
    'count-sheet': `Feuille de comptage - ${session.name}`,
    missing: `Produits non retrouvés - ${session.name}`,
  } as const;

  const filteredItems =
    variant === 'missing'
      ? items.filter((item) => item.line_status === 'missing')
      : items;

  const totalCounted = filteredItems.reduce((sum, item) => sum + (item.counted_quantity ?? 0), 0);
  const totalExpected = filteredItems.reduce((sum, item) => sum + item.expected_quantity, 0);

  // Bilan financier basé sur la totalité des items (pour la synthèse)
  const totalMissingValue = items
    .filter((item) => item.line_status === 'missing')
    .reduce((sum, item) => sum + item.unit_cost * item.expected_quantity, 0);

  const totalAdjustedPositiveValue = items
    .filter((item) => item.line_status === 'adjusted' && item.variance_quantity > 0)
    .reduce((sum, item) => sum + item.unit_cost * item.variance_quantity, 0);

  const bilanNet = totalAdjustedPositiveValue - totalMissingValue;
  const bilanColor = bilanNet >= 0 ? '#16a34a' : '#dc2626';

  // Pour le variant 'missing', recalcule la valeur des manquants sur la liste filtrée
  const displayMissingValue = variant === 'missing' ? totalMissingValue : totalMissingValue;

  const popup = window.open('', '_blank', 'width=1100,height=800');
  if (!popup) return;

  popup.document.write(`
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(titleMap[variant])}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
          h1 { font-size: 24px; margin-bottom: 8px; }
          h2 { font-size: 15px; margin: 0 0 12px; color: #4b5563; }
          .meta { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 20px 0; }
          .box { border: 1px solid #d1d5db; padding: 12px; border-radius: 6px; }
          .label { font-size: 12px; text-transform: uppercase; color: #6b7280; margin-bottom: 6px; }
          .value { font-size: 18px; font-weight: 700; }
          .note { margin-top: 18px; padding: 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px; color: #4b5563; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; vertical-align: top; }
          th { background: #f3f4f6; }
          .right { text-align: right; }
          @media print { body { margin: 12px; } }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(titleMap[variant])}</h1>
        <h2>Mode: ${escapeHtml(session.mode)} · Statut: ${escapeHtml(session.status)} · Créé le ${escapeHtml(new Date(session.created_at).toLocaleString('fr-FR'))}</h2>
        <div class="meta">
          <div class="box"><div class="label">Références</div><div class="value">${filteredItems.length}</div></div>
          <div class="box"><div class="label">Qté théorique</div><div class="value">${totalExpected}</div></div>
          <div class="box"><div class="label">Qté inventoriée</div><div class="value">${totalCounted}</div></div>
          <div class="box"><div class="label">Valeur non retrouvée</div><div class="value" style="color:#dc2626">${escapeHtml(currency(displayMissingValue))}</div></div>
        </div>
        ${variant === 'summary' ? `
          <div class="meta" style="grid-template-columns: repeat(3, minmax(0, 1fr));">
            <div class="box"><div class="label">Valeur produits non retrouvés</div><div class="value" style="color:#dc2626">- ${escapeHtml(currency(totalMissingValue))}</div></div>
            <div class="box"><div class="label">Valeur ajustée (positif)</div><div class="value" style="color:#16a34a">+ ${escapeHtml(currency(totalAdjustedPositiveValue))}</div></div>
            <div class="box"><div class="label">Bilan net</div><div class="value" style="color:${bilanColor}">${bilanNet >= 0 ? '+ ' : ''}${escapeHtml(currency(bilanNet))}</div></div>
          </div>
        ` : ''}
        ${session.notes ? `<div class="note">${escapeHtml(session.notes)}</div>` : ''}
        <table>
          <thead>
            <tr>
              <th>Pièce</th>
              <th>Référence</th>
              <th>SKU</th>
              <th class="right">Qté théorique</th>
              <th class="right">Qté comptée</th>
              <th class="right">Écart</th>
              <th class="right">Coût unitaire</th>
              <th class="right">Valeur écart</th>
              <th>Statut</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            ${filteredItems.map((item) => `
              <tr>
                <td>${escapeHtml(item.part_name)}</td>
                <td>${escapeHtml(item.part_reference || '-')}</td>
                <td>${escapeHtml(item.part_sku || '-')}</td>
                <td class="right">${escapeHtml(item.expected_quantity)}</td>
                <td class="right">${escapeHtml(item.counted_quantity ?? '')}</td>
                <td class="right">${escapeHtml(item.variance_quantity)}</td>
                <td class="right">${escapeHtml(currency(item.unit_cost))}</td>
                <td class="right">${escapeHtml(currency(item.variance_value))}</td>
                <td>${escapeHtml(item.line_status)}</td>
                <td>${escapeHtml(item.notes || '')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
}
