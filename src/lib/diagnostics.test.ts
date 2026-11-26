// @ts-ignore
import { expect, test } from 'bun:test';
import { maskImei, generateApiKey } from './diagnostics';
test('IMEI masqué sauf 4 derniers chiffres', () => { expect(maskImei('356789012345678')).toBe('•••••••••••5678'); });
test('clé API = dsk_ + 40 caractères', () => { expect(generateApiKey()).toMatch(/^dsk_[A-Za-z0-9]{40}$/); });
