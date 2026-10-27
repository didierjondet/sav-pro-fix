import { describe, it, expect } from 'vitest';
import { checkMobileUpload, mergeAttachments } from '../src/lib/mobileDocs';

const MB = 1024 * 1024;
describe('envoi de documents depuis le téléphone', () => {
  it('accepte une photo jusqu’à 5 Mo', () => {
    expect(checkMobileUpload('image/jpeg', 5 * MB).ok).toBe(true);
    expect(checkMobileUpload('image/jpeg', 5 * MB + 1).ok).toBe(false);
  });
  it('accepte un PDF jusqu’à 10 Mo', () => {
    expect(checkMobileUpload('application/pdf', 10 * MB).ok).toBe(true);
    expect(checkMobileUpload('application/pdf', 10 * MB + 1).ok).toBe(false);
  });
  it('refuse les autres formats', () => {
    expect(checkMobileUpload('application/zip', 100).ok).toBe(false);
  });
  it('ajoute les fichiers reçus sans doublon', () => {
    expect(mergeAttachments(['a'], ['a', 'b'])).toEqual(['a', 'b']);
  });
});
