// Logique pure du test de manette (sans dépendance navigateur) — testable.

export type ControllerModel = 'ps4' | 'ps5' | 'xbox' | 'switch_pro' | 'generic';
export type ItemStatus = 'untested' | 'ok' | 'defect' | 'intermittent';

export const MODEL_LABELS: Record<ControllerModel, { brand: string; model: string }> = {
  ps4: { brand: 'SONY', model: 'MANETTE PS4 DUALSHOCK 4' },
  ps5: { brand: 'SONY', model: 'MANETTE PS5 DUALSENSE' },
  xbox: { brand: 'MICROSOFT', model: 'MANETTE XBOX' },
  switch_pro: { brand: 'NINTENDO', model: 'MANETTE SWITCH PRO' },
  generic: { brand: '', model: 'MANETTE' },
};

export function detectModel(id: string): ControllerModel {
  const s = id.toLowerCase();
  if (s.includes('054c') || s.includes('sony') || s.includes('dualsense') || s.includes('wireless controller')) {
    if (s.includes('0ce6') || s.includes('0df2') || s.includes('dualsense')) return 'ps5';
    return 'ps4';
  }
  if (s.includes('045e') || s.includes('xbox') || s.includes('xinput')) return 'xbox';
  if (s.includes('057e') || s.includes('pro controller')) return 'switch_pro';
  return 'generic';
}

// Index du mapping "standard" de l'API Gamepad
export const BUTTONS: { index: number; key: string; labels: Record<'ps' | 'xbox' | 'nintendo', string> }[] = [
  { index: 0, key: 'south', labels: { ps: 'Croix ×', xbox: 'A', nintendo: 'B' } },
  { index: 1, key: 'east', labels: { ps: 'Rond ○', xbox: 'B', nintendo: 'A' } },
  { index: 2, key: 'west', labels: { ps: 'Carré □', xbox: 'X', nintendo: 'Y' } },
  { index: 3, key: 'north', labels: { ps: 'Triangle △', xbox: 'Y', nintendo: 'X' } },
  { index: 4, key: 'l1', labels: { ps: 'L1', xbox: 'LB', nintendo: 'L' } },
  { index: 5, key: 'r1', labels: { ps: 'R1', xbox: 'RB', nintendo: 'R' } },
  { index: 6, key: 'l2', labels: { ps: 'L2', xbox: 'LT', nintendo: 'ZL' } },
  { index: 7, key: 'r2', labels: { ps: 'R2', xbox: 'RT', nintendo: 'ZR' } },
  { index: 8, key: 'select', labels: { ps: 'Share / Create', xbox: 'View', nintendo: '−' } },
  { index: 9, key: 'start', labels: { ps: 'Options', xbox: 'Menu', nintendo: '+' } },
  { index: 10, key: 'l3', labels: { ps: 'L3 (clic stick gauche)', xbox: 'Clic stick gauche', nintendo: 'Clic stick gauche' } },
  { index: 11, key: 'r3', labels: { ps: 'R3 (clic stick droit)', xbox: 'Clic stick droit', nintendo: 'Clic stick droit' } },
  { index: 12, key: 'up', labels: { ps: 'Croix ↑', xbox: 'Croix ↑', nintendo: 'Croix ↑' } },
  { index: 13, key: 'down', labels: { ps: 'Croix ↓', xbox: 'Croix ↓', nintendo: 'Croix ↓' } },
  { index: 14, key: 'left', labels: { ps: 'Croix ←', xbox: 'Croix ←', nintendo: 'Croix ←' } },
  { index: 15, key: 'right', labels: { ps: 'Croix →', xbox: 'Croix →', nintendo: 'Croix →' } },
  { index: 16, key: 'home', labels: { ps: 'Bouton PS', xbox: 'Bouton Xbox', nintendo: 'Home' } },
  { index: 17, key: 'touchpad', labels: { ps: 'Clic pavé tactile', xbox: '', nintendo: 'Capture' } },
];

export function family(m: ControllerModel): 'ps' | 'xbox' | 'nintendo' {
  return m === 'ps4' || m === 'ps5' ? 'ps' : m === 'switch_pro' ? 'nintendo' : 'xbox';
}

export function buttonsForModel(m: ControllerModel) {
  const f = family(m);
  return BUTTONS.filter((b) => b.labels[f] !== '' && (b.index < 17 || m !== 'generic'));
}

export function buttonLabel(m: ControllerModel, key: string) {
  const b = BUTTONS.find((x) => x.key === key);
  return b ? b.labels[family(m)] : key;
}

export const MANUAL_CHECKS: Record<ControllerModel, string[]> = {
  ps4: ['Port de charge', 'Batterie / autonomie', 'Haut-parleur', 'Prise jack', 'Pavé tactile (glisser)', 'Barre LED', 'Coque / boutons physiques'],
  ps5: ['Port de charge USB-C', 'Batterie / autonomie', 'Haut-parleur', 'Prise jack', 'Micro', 'Pavé tactile (glisser)', 'Gâchettes adaptatives', 'LED', 'Coque / boutons physiques'],
  xbox: ['Port de charge', 'Compartiment / contacts piles', 'Prise jack', 'Appairage sans fil', 'Coque / boutons physiques'],
  switch_pro: ['Port de charge USB-C', 'Batterie / autonomie', 'Gyroscope', 'NFC', 'Coque / boutons physiques'],
  generic: ['Port de charge / câble', 'Batterie', 'Coque / boutons physiques'],
};

export const DRIFT_THRESHOLD = 0.08;
export const TRIGGER_MIN_TRAVEL = 0.95;

export interface StickResult {
  driftX: number; // moyenne au repos (-1..1)
  driftY: number;
  maxRadius: number; // rayon max atteint 0..1+
  status: ItemStatus;
}

export function computeDrift(samples: { x: number; y: number }[]) {
  if (samples.length === 0) return { driftX: 0, driftY: 0, magnitude: 0 };
  const driftX = samples.reduce((a, s) => a + s.x, 0) / samples.length;
  const driftY = samples.reduce((a, s) => a + s.y, 0) / samples.length;
  return { driftX, driftY, magnitude: Math.hypot(driftX, driftY) };
}

export function driftDirection(x: number, y: number) {
  const parts: string[] = [];
  if (Math.abs(y) >= DRIFT_THRESHOLD / 2) parts.push(y < 0 ? 'le haut' : 'le bas');
  if (Math.abs(x) >= DRIFT_THRESHOLD / 2) parts.push(x < 0 ? 'la gauche' : 'la droite');
  return parts.join(' et ') || 'le centre';
}

export function evaluateStick(drift: { driftX: number; driftY: number }, maxRadius: number): ItemStatus {
  const mag = Math.hypot(drift.driftX, drift.driftY);
  if (mag >= DRIFT_THRESHOLD) return 'defect';
  if (maxRadius < 0.9) return 'defect';
  return 'ok';
}

export interface ControllerReport {
  model: ControllerModel;
  gamepadId: string;
  tested_at: string;
  buttons: Record<string, ItemStatus>;
  triggers: Record<'l2' | 'r2', { max: number; status: ItemStatus }>;
  sticks: Record<'left' | 'right', StickResult>;
  vibration: ItemStatus;
  manual: Record<string, { status: ItemStatus; note?: string }>;
  notes?: string;
}

export function buildControllerSummary(r: ControllerReport): string[] {
  const out: string[] = [];
  for (const [key, st] of Object.entries(r.buttons)) {
    if (key === 'l2' || key === 'r2') continue;
    if (st === 'defect' || st === 'untested') out.push(`Bouton ${buttonLabel(r.model, key)} ne répond pas`);
    else if (st === 'intermittent') out.push(`Bouton ${buttonLabel(r.model, key)} intermittent`);
  }
  (['l2', 'r2'] as const).forEach((k) => {
    const t = r.triggers[k];
    if (t.status === 'defect') out.push(`Gâchette ${buttonLabel(r.model, k)} : course incomplète (${Math.round(t.max * 100)} %)`);
    else if (t.status === 'intermittent') out.push(`Gâchette ${buttonLabel(r.model, k)} intermittente`);
  });
  (['left', 'right'] as const).forEach((k) => {
    const s = r.sticks[k];
    const name = k === 'left' ? 'Joystick gauche' : 'Joystick droit';
    const mag = Math.hypot(s.driftX, s.driftY);
    if (mag >= DRIFT_THRESHOLD) out.push(`${name} : dérive de ${Math.round(mag * 100)} % vers ${driftDirection(s.driftX, s.driftY)}`);
    if (s.maxRadius < 0.9) out.push(`${name} : amplitude limitée (${Math.round(s.maxRadius * 100)} %)`);
    if (s.status === 'intermittent') out.push(`${name} : comportement intermittent`);
    if (s.status === 'defect' && mag < DRIFT_THRESHOLD && s.maxRadius >= 0.9) out.push(`${name} : défaut constaté`);
  });
  if (r.vibration === 'defect') out.push('Vibrations : ne fonctionnent pas');
  else if (r.vibration === 'intermittent') out.push('Vibrations : partielles');
  for (const [label, m] of Object.entries(r.manual)) {
    if (m.status === 'defect' || m.status === 'intermittent') {
      out.push(`${label} : ${m.status === 'defect' ? 'défectueux' : 'intermittent'}${m.note ? ` (${m.note})` : ''}`);
    }
  }
  return out;
}

export function summaryToText(r: ControllerReport): string {
  const lines = buildControllerSummary(r);
  const head = 'Test manette effectué :';
  const body = lines.length ? lines.map((l) => `- ${l}`).join('\n') : '- Aucun défaut détecté lors des tests';
  return `${head}\n${body}${r.notes ? `\nNote : ${r.notes}` : ''}`;
}
