import type { InventorySession, InventorySessionItem } from '@/components/settings/inventory/types';

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
      ? items.filter((item) => item.line_status === 'missing' || (item.counted_quantity ?? 0) === 0)
      : items;

  const totalCounted = filteredItems.reduce((sum, item) => sum + (item.counted_quantity ?? 0), 0);
  const totalExpected = filteredItems.reduce((sum, item) => sum + item.expected_quantity, 0);
  const totalMissingValue = filteredItems.reduce(
    (sum, item) => sum + ((item.line_status === 'missing' || (item.counted_quantity ?? 0) === 0) ? item.unit_cost * item.expected_quantity : 0),
    0,
  );

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
          <div class="box"><div class="label">Valeur non retrouvée</div><div class="value">${escapeHtml(currency(totalMissingValue))}</div></div>
        </div>
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
