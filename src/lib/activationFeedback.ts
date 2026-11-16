export const SIGNUP_QUESTIONS = [
  { key: 'volume', label: 'Combien de SAV traitez-vous par mois ?', options: [
    { value: 'lt10', label: 'Moins de 10' }, { value: '10_50', label: '10 à 50' }, { value: '50_200', label: '50 à 200' }, { value: 'gt200', label: 'Plus de 200' } ] },
  { key: 'current_tool', label: 'Avec quoi gérez-vous vos SAV aujourd’hui ?', options: [
    { value: 'paper', label: 'Papier / cahier' }, { value: 'excel', label: 'Excel' }, { value: 'other_software', label: 'Autre logiciel' }, { value: 'nothing', label: 'Rien' } ] },
  { key: 'goal', label: 'Qu’attendez-vous surtout de Fixway ?', options: [
    { value: 'tracking', label: 'Suivre mes réparations' }, { value: 'customer_comms', label: 'Informer mes clients' }, { value: 'stock', label: 'Gérer mon stock' }, { value: 'discovering', label: 'Je découvre' } ] },
] as const;

export const BLOCKER_REASONS = [
  { value: 'too_complex', label: 'Trop complexe' },
  { value: 'no_time', label: 'Pas eu le temps' },
  { value: 'missing_feature', label: 'Il manque une fonction' },
  { value: 'not_for_me', label: 'Pas adapté à mon activité' },
  { value: 'just_looking', label: 'Je regardais juste' },
  { value: 'other', label: 'Autre' },
];

export const ANSWER_LABELS: Record<string, string> = Object.fromEntries([
  ...SIGNUP_QUESTIONS.flatMap((q) => q.options.map((o) => [o.value, o.label])),
  ...BLOCKER_REASONS.map((o) => [o.value, o.label]),
]);

export const BLOCKER_AFTER_DAYS = 2;
export const PROMPT_WINDOW_DAYS = 60;

/** Which question to show: signup first, then "what blocks you" after 2 days without any SAV. */
export function pickActivationPrompt(p: { shopCreatedAt: string; savCount: number; answeredKinds: string[]; now?: Date }): 'signup' | 'blocker' | null {
  const ageDays = ((p.now ?? new Date()).getTime() - new Date(p.shopCreatedAt).getTime()) / 86400000;
  if (ageDays > PROMPT_WINDOW_DAYS) return null;
  if (!p.answeredKinds.includes('signup')) return 'signup';
  if (ageDays >= BLOCKER_AFTER_DAYS && p.savCount === 0 && !p.answeredKinds.includes('blocker')) return 'blocker';
  return null;
}
