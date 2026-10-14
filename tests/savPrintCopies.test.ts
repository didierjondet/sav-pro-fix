import { describe, expect, test } from 'bun:test';
import { getSAVPrintCopies } from '../src/lib/savPrintCopies';

describe('exemplaires de prise en charge SAV', () => {
  test('sans client rattaché, seul le magasin reçoit un exemplaire', () => {
    expect(getSAVPrintCopies(null)).toEqual(['shop']);
    expect(getSAVPrintCopies()).toEqual(['shop']);
    expect(getSAVPrintCopies('')).toEqual(['shop']);
  });
  test('avec client rattaché, imprimer les deux exemplaires', () => {
    expect(getSAVPrintCopies('client-123')).toEqual(['client', 'shop']);
  });
  test('un client sans coordonnées reste un client rattaché', () => {
    const sav = { customer_id: 'client-456', customer: { first_name: 'Luc', last_name: 'Martin' } };
    expect(getSAVPrintCopies(sav.customer_id)).toEqual(['client', 'shop']);
  });
});