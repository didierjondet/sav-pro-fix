import { describe, expect, test } from 'bun:test';
import { buildControllerSummary, computeDrift, detectModel, evaluateStick, type ControllerReport } from '../src/lib/controllerTest';

const base = (): ControllerReport => ({
  model: 'xbox', gamepadId: 'Xbox (045e)', tested_at: '',
  buttons: { south: 'ok', west: 'defect' },
  triggers: { l2: { max: 1, status: 'ok' }, r2: { max: 1, status: 'ok' } },
  sticks: { left: { driftX: 0, driftY: -0.12, maxRadius: 1, status: 'defect' }, right: { driftX: 0, driftY: 0, maxRadius: 1, status: 'ok' } },
  vibration: 'ok', manual: {},
});

describe('test manette', () => {
  test('dérive de 8 % = défaut, 7 % = ok', () => {
    expect(evaluateStick({ driftX: 0.08, driftY: 0 }, 1)).toBe('defect');
    expect(evaluateStick({ driftX: 0.07, driftY: 0 }, 1)).toBe('ok');
  });
  test('moyenne de dérive', () => {
    expect(computeDrift([{ x: 0.1, y: 0 }, { x: 0.3, y: 0 }]).driftX).toBeCloseTo(0.2);
  });
  test('résumé lisible', () => {
    const s = buildControllerSummary(base());
    expect(s).toContain('Bouton X ne répond pas');
    expect(s).toContain('Joystick gauche : dérive de 12 % vers le haut');
  });
  test('détection modèle', () => {
    expect(detectModel('DualSense Wireless Controller (Vendor: 054c Product: 0ce6)')).toBe('ps5');
    expect(detectModel('Xbox 360 Controller (XInput STANDARD GAMEPAD)')).toBe('xbox');
  });
});
