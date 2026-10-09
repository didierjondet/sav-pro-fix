import { renderToStaticMarkup } from 'react-dom/server';
import { ControllerDiagram } from '@/components/sav/controller/ControllerDiagram';
import { MODEL_LABELS, buildControllerSummary, buildUntestedList, type ControllerReport } from '@/lib/controllerTest';
import bwipjs from 'bwip-js/browser';

export interface ControllerSheetInfo {
  caseNumber?: string | null;
  trackingSlug?: string | null;
  imei?: string | null;
  sku?: string | null;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] ?? c));

/** Même Code 128 et même numéro de dossier que les impressions SAV. */
export function controllerBarcodeSvg(caseNumber?: string | null): string {
  if (!caseNumber) return '';
  return bwipjs.toSVG({
    bcid: 'code128', text: caseNumber, scale: 2, height: 12,
    includetext: false, backgroundcolor: 'FFFFFF', paddingwidth: 2, paddingheight: 2,
  });
}

/** SVG du débattement d'un joystick (cercle de référence, tracé, point de repos). */
export function stickTrailSvg(trail: [number, number][] = [], drift = { x: 0, y: 0 }, colors = { bg: '#f3f4f6', border: '#999', line: '#2563eb', dot: '#dc2626' }) {
  const pts = trail.map(([x, y]) => `${x * 100},${y * 100}`).join(' ');
  return `<svg viewBox="-110 -110 220 220" width="160" height="160" xmlns="http://www.w3.org/2000/svg">
<circle r="100" fill="${colors.bg}" stroke="${colors.border}"/>
<circle r="8" fill="none" stroke="${colors.border}" stroke-dasharray="3 3"/>
<line x1="-100" y1="0" x2="100" y2="0" stroke="${colors.border}" stroke-width="0.5"/><line x1="0" y1="-100" x2="0" y2="100" stroke="${colors.border}" stroke-width="0.5"/>
${trail.length > 1 ? `<polyline points="${pts}" fill="none" stroke="${colors.line}" stroke-width="2" stroke-linejoin="round"/>` : ''}
<circle cx="${drift.x * 100}" cy="${drift.y * 100}" r="5" fill="${colors.dot}"/>
</svg>`;
}

export function printControllerSheet(report: ControllerReport, info: ControllerSheetInfo = {}) {
  const statuses = {
    ...report.buttons, l2: report.triggers.l2.status, r2: report.triggers.r2.status,
    stick_left: report.sticks.left.status, stick_right: report.sticks.right.status,
  };
  const svg = renderToStaticMarkup(<ControllerDiagram model={report.model} statuses={statuses} />)
    .split('hsl(var(--destructive))').join('#dc2626').split('hsl(var(--primary) / 0.25)').join('#bbf7d0')
    .split('hsl(var(--warning, 38 92% 50%))').join('#f59e0b').split('hsl(var(--muted))').join('#e5e7eb')
    .split('hsl(var(--primary))').join('#2563eb')
    .split('hsl(var(--card))').join('#fff').split('hsl(var(--border))').join('#999')
    .split('hsl(var(--foreground) / 0.4)').join('#555').split('hsl(var(--foreground))').join('#111');
  const summary = buildControllerSummary(report);
  const untested = buildUntestedList(report);
  const barcode = controllerBarcodeSvg(info.caseNumber);
  const label = MODEL_LABELS[report.model];
  const stick = (k: 'left' | 'right') => {
    const s = report.sticks[k];
    return `<div class="stick">${stickTrailSvg(s.trail, { x: s.driftX, y: s.driftY })}<div>${k === 'left' ? 'Joystick gauche' : 'Joystick droit'} · amplitude ${Math.round(Math.min(1, s.maxRadius) * 100)} % · dérive ${Math.round(Math.hypot(s.driftX, s.driftY) * 100)} %${s.stability != null ? ` · stabilité ${s.stability} %` : ''}</div></div>`;
  };
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Test manette ${esc(info.caseNumber || '')}</title><style>
body{font-family:sans-serif;font-size:12px;margin:12mm}
.head{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:8px}
.num{font-size:30px;font-weight:bold}.meta{font-size:13px;margin-top:4px}
.barcode{flex:0 0 auto;margin-left:12px}.barcode svg{display:block;width:240px;max-width:65mm;height:auto}
.diag{width:100%;max-width:480px}.sticks{display:flex;gap:24px;justify-content:center}.stick{text-align:center;font-size:11px}
.cols{display:flex;gap:24px}.cols>div{flex:1}h2{font-size:14px;margin:10px 0 4px}li{margin:2px 0}
.leg span{display:inline-block;width:10px;height:10px;margin:0 4px 0 12px}
</style></head><body>
<div class="head"><div>
<div class="num">${info.caseNumber ? `SAV N° ${esc(info.caseNumber)}` : 'SAV en cours de création'}</div>
<div class="meta">${esc(`${label.brand} ${label.model}`.trim())}</div>
${(info.imei || report.serial) ? `<div class="meta"><b>N° de série / IMEI :</b> ${esc(info.imei || report.serial || '')}</div>` : ''}${report.firmware ? `<div class="meta"><b>Logiciel manette :</b> ${esc(report.firmware)}</div>` : ''}
${info.sku ? `<div class="meta"><b>SKU :</b> ${esc(info.sku)}</div>` : ''}
<div class="meta">Test du ${new Date(report.tested_at || Date.now()).toLocaleString('fr-FR')}</div>
</div>${barcode ? `<div class="barcode">${barcode}</div>` : ''}</div>
<div style="text-align:center"><div class="diag" style="margin:auto">${svg}</div></div>
<p class="leg"><span style="background:#dc2626"></span>Défaut<span style="background:#f59e0b"></span>Intermittent<span style="background:#bbf7d0"></span>OK<span style="background:#e5e7eb"></span>Non testé</p>
<h2>Débattement des joysticks</h2><div class="sticks">${stick('left')}${stick('right')}</div>
<div class="cols"><div><h2>Pannes constatées</h2><ul>${summary.length ? summary.map((s) => `<li>${esc(s)}</li>`).join('') : '<li>Aucun défaut détecté</li>'}</ul></div>
<div><h2>Fonctions non testées</h2><ul>${untested.length ? untested.map((s) => `<li>${esc(s)}</li>`).join('') : '<li>Tout a été testé</li>'}</ul></div></div>
${report.notes ? `<p><b>Note :</b> ${esc(report.notes)}</p>` : ''}
<script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`;
  const w = window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank');
  if (!w) alert('Autorisez les fenêtres pop-up pour imprimer.');
}
