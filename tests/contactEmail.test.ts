import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { LEGAL } from '../src/lib/legalInfo';

test('official contact and server-side form recipients use fixwaypro@gmail.com', () => {
  expect(LEGAL.email).toBe('fixwaypro@gmail.com');
  const form = readFileSync(new URL('../supabase/functions/contact-form/index.ts', import.meta.url), 'utf8');
  const planContact = readFileSync(new URL('../supabase/functions/send-contact-email/index.ts', import.meta.url), 'utf8');
  expect(form.match(/const CONTACT_TO = '([^']+)'/)?.[1]).toBe('fixwaypro@gmail.com');
  expect(planContact.match(/to: '([^']+)'/)?.[1]).toBe('fixwaypro@gmail.com');
});