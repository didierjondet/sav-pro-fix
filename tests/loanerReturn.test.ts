import { describe, it, expect } from 'vitest';
import { loanerPhotoLocation, loanerReturnUrl } from '../src/lib/loanerPhotos';

describe('retour de prêt', () => {
  it('les photos téléphone sont lues dans le stockage des documents SAV', () => {
    expect(loanerPhotoLocation('sav:shop1/loaner-return_1.jpg')).toEqual({ bucket: 'part-attachments', path: 'shop1/loaner-return_1.jpg' });
  });
  it("les photos ordinateur restent dans le stockage des prêts", () => {
    expect(loanerPhotoLocation('shop1/a.jpg')).toEqual({ bucket: 'loaner-photos', path: 'shop1/a.jpg' });
  });
  it('le QR pointe vers la page publique de retour Fixway', () => {
    expect(loanerReturnUrl('abc')).toBe('https://fixway.fr/pret/retour/abc');
  });
});
