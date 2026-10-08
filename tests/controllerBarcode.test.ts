import { describe, expect, spyOn, test } from 'bun:test';
import bwipjs from 'bwip-js/browser';
import { controllerBarcodeSvg } from '../src/lib/controllerPrint';

describe('identification de la feuille manette', () => {
  test('encode le numéro SAV en Code 128, comme les impressions SAV', () => {
    const generate = spyOn(bwipjs, 'toSVG');
    try {
      controllerBarcodeSvg('2026-10-08-001');
      expect(generate).toHaveBeenCalledWith(expect.objectContaining({
        bcid: 'code128', text: '2026-10-08-001', scale: 2, height: 12,
        includetext: false, backgroundcolor: 'FFFFFF', paddingwidth: 2, paddingheight: 2,
      }));
    } finally {
      generate.mockRestore();
    }
  });
  test('ne génère aucun identifiant avant attribution du numéro SAV', () => {
    expect(controllerBarcodeSvg()).toBe('');
    expect(controllerBarcodeSvg(null)).toBe('');
  });
});