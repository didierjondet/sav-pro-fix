// Palette des couleurs d'appareils (identique à SAVForm / SAVWizardDialog)
export const DEVICE_COLORS: Record<string, { label: string; hsl: string; border?: boolean }> = {
  black: { label: 'Noir', hsl: 'hsl(0 0% 0%)' },
  white: { label: 'Blanc', hsl: 'hsl(0 0% 100%)', border: true },
  grey: { label: 'Gris', hsl: 'hsl(0 0% 50%)' },
  blue: { label: 'Bleu', hsl: 'hsl(217 91% 60%)' },
  red: { label: 'Rouge', hsl: 'hsl(0 84% 60%)' },
  gold: { label: 'Or', hsl: 'hsl(45 100% 51%)' },
  silver: { label: 'Argent', hsl: 'hsl(0 0% 75%)' },
  green: { label: 'Vert', hsl: 'hsl(142 71% 45%)' },
  pink: { label: 'Rose', hsl: 'hsl(330 81% 60%)' },
  purple: { label: 'Violet', hsl: 'hsl(271 91% 65%)' },
  other: { label: 'Autre', hsl: 'hsl(0 0% 42%)' },
};

export function getDeviceColorInfo(value?: string | null) {
  if (!value) return null;
  return DEVICE_COLORS[value] || { label: value, hsl: 'hsl(0 0% 42%)' };
}
