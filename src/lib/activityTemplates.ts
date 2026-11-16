export type ShopActivity = 'phone' | 'computer' | 'appliance' | 'console' | 'audio' | 'none';

export const SHOP_ACTIVITIES: { key: ShopActivity; label: string; emoji: string; example: string }[] = [
  { key: 'phone', label: 'Réparateur téléphone', emoji: '📱', example: 'Écrans, batteries, connecteurs' },
  { key: 'computer', label: 'Réparateur informatique', emoji: '💻', example: 'PC lents, SSD, claviers' },
  { key: 'appliance', label: 'Réparateur électroménager', emoji: '🧺', example: 'Lave-linge, frigo, four' },
  { key: 'console', label: 'Réparateur console', emoji: '🎮', example: 'Manettes, HDMI, surchauffe' },
  { key: 'audio', label: 'Réparateur audio', emoji: '🎧', example: 'Enceintes, casques, amplis' },
];

/** Sample customers use 0600000xxx: the SMS function never sends to them. */
export const DEMO_PHONE_PATTERN = /^\+?(33)?0?600000\d{3}$/;
export const isDemoPhone = (phone: string) => DEMO_PHONE_PATTERN.test((phone || '').replace(/[\s.\-]/g, ''));
