import { describe, expect, test } from 'bun:test';
import { decodeReversedMac, decodeSwitchSerial } from '../src/lib/controllerHid';

describe('lecture identifiant manette', () => {
  test('MAC Sony inversée', () => {
    expect(decodeReversedMac(new Uint8Array([0x09, 0x66, 0x55, 0x44, 0x33, 0x22, 0x11]), 1)).toBe('11:22:33:44:55:66');
  });
  test('MAC vide = null', () => {
    expect(decodeReversedMac(new Uint8Array(7), 1)).toBeNull();
  });
  test('série Switch ASCII', () => {
    const b = new Uint8Array(16); 'XCW12345678'.split('').forEach((c, i) => (b[i] = c.charCodeAt(0)));
    expect(decodeSwitchSerial(b)).toBe('XCW12345678');
  });
});
