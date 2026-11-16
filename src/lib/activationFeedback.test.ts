// @ts-ignore bun test runner types are not installed
import { describe, it, expect } from 'bun:test';
import { pickActivationPrompt } from './activationFeedback';
const now = new Date('2026-11-16T10:00:00Z');
const days = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
describe('pickActivationPrompt', () => {
  it('asks the signup questionnaire first', () => expect(pickActivationPrompt({ shopCreatedAt: days(0), savCount: 0, answeredKinds: [], now })).toBe('signup'));
  it('asks blocker after 2 days with no SAV', () => expect(pickActivationPrompt({ shopCreatedAt: days(3), savCount: 0, answeredKinds: ['signup'], now })).toBe('blocker'));
  it('no blocker before 2 days', () => expect(pickActivationPrompt({ shopCreatedAt: days(1), savCount: 0, answeredKinds: ['signup'], now })).toBeNull());
  it('no blocker once a SAV exists', () => expect(pickActivationPrompt({ shopCreatedAt: days(5), savCount: 1, answeredKinds: ['signup'], now })).toBeNull());
  it('nothing after 60 days', () => expect(pickActivationPrompt({ shopCreatedAt: days(61), savCount: 0, answeredKinds: [], now })).toBeNull());
});
