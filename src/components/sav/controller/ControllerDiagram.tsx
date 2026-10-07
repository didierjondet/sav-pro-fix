import type { ControllerModel, ItemStatus } from '@/lib/controllerTest';
import { buttonLabel } from '@/lib/controllerTest';

interface Props {
  model: ControllerModel;
  statuses: Record<string, ItemStatus>; // clés boutons + stick_left / stick_right
  pressed?: Record<string, boolean>;
  className?: string;
}

const fill = (st: ItemStatus | undefined, pressed?: boolean) => {
  if (pressed) return 'hsl(var(--primary))';
  if (st === 'defect') return 'hsl(var(--destructive))';
  if (st === 'intermittent') return 'hsl(var(--warning, 38 92% 50%))';
  if (st === 'ok') return 'hsl(var(--primary) / 0.25)';
  return 'hsl(var(--muted))';
};

// Positions sur un schéma générique 400×260
const POS: Record<string, { x: number; y: number; r?: number; w?: number; h?: number }> = {
  l2: { x: 95, y: 18, w: 60, h: 18 }, r2: { x: 245, y: 18, w: 60, h: 18 },
  l1: { x: 95, y: 42, w: 60, h: 14 }, r1: { x: 245, y: 42, w: 60, h: 14 },
  north: { x: 300, y: 85, r: 13 }, west: { x: 274, y: 110, r: 13 }, east: { x: 326, y: 110, r: 13 }, south: { x: 300, y: 135, r: 13 },
  up: { x: 100, y: 88, w: 18, h: 20 }, down: { x: 100, y: 130, w: 18, h: 20 }, left: { x: 79, y: 109, w: 20, h: 18 }, right: { x: 121, y: 109, w: 20, h: 18 },
  select: { x: 160, y: 80, r: 8 }, start: { x: 240, y: 80, r: 8 }, home: { x: 200, y: 150, r: 10 }, touchpad: { x: 200, y: 88, w: 60, h: 34 },
  stick_left: { x: 145, y: 175, r: 24 }, stick_right: { x: 255, y: 175, r: 24 },
};

export function ControllerDiagram({ model, statuses, pressed = {}, className }: Props) {
  const showTouch = model === 'ps4' || model === 'ps5';
  return (
    <svg viewBox="0 0 400 260" className={className} role="img" aria-label="Schéma de la manette">
      <path d="M70 60 Q200 40 330 60 Q385 70 390 160 Q395 250 330 240 Q290 235 270 205 L130 205 Q110 235 70 240 Q5 250 10 160 Q15 70 70 60Z"
        fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
      {Object.entries(POS).map(([key, p]) => {
        if (key === 'touchpad' && !showTouch) return null;
        const st = key.startsWith('stick_') ? statuses[key] : statuses[key];
        const isPressed = pressed[key] || (key === 'stick_left' && pressed.l3) || (key === 'stick_right' && pressed.r3);
        const f = fill(st ?? (key === 'stick_left' ? statuses.l3 : key === 'stick_right' ? statuses.r3 : undefined), isPressed);
        const label = key.startsWith('stick_') ? (key === 'stick_left' ? 'L' : 'R') : buttonLabel(model, key).replace(/^Croix /, '').split(' ')[0];
        return (
          <g key={key}>
            {p.r ? <circle cx={p.x} cy={p.y} r={p.r} fill={f} stroke="hsl(var(--foreground) / 0.4)" />
              : <rect x={p.x - p.w! / 2} y={p.y - p.h! / 2} width={p.w} height={p.h} rx="4" fill={f} stroke="hsl(var(--foreground) / 0.4)" />}
            <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))">{key === 'touchpad' ? '' : label}</text>
          </g>
        );
      })}
    </svg>
  );
}
