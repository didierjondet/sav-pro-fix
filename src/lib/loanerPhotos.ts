import bwipjs from 'bwip-js/browser';
import { getPublicAppOrigin } from '@/utils/trackingUtils';
import { supabase } from '@/integrations/supabase/client';

/** Photos envoyées depuis le téléphone : stockées avec les documents SAV, préfixées « sav: ». */
export const PHONE_PHOTO_PREFIX = 'sav:';

export function loanerPhotoLocation(path: string): { bucket: string; path: string } {
  return path.startsWith(PHONE_PHOTO_PREFIX)
    ? { bucket: 'part-attachments', path: path.slice(PHONE_PHOTO_PREFIX.length) }
    : { bucket: 'loaner-photos', path };
}

export async function signLoanerPhoto(path: string, expires = 3600): Promise<string | null> {
  if (/^https?:\/\//.test(path)) return path;
  const loc = loanerPhotoLocation(path);
  const { data } = await supabase.storage.from(loc.bucket).createSignedUrl(loc.path, expires);
  return data?.signedUrl || null;
}

export const isImagePath = (p: string) => /\.(jpe?g|png|webp|gif|heic)$/i.test(p);

export const loanerReturnUrl = (token: string) => `${getPublicAppOrigin()}/pret/retour/${encodeURIComponent(token)}`;

/** QR (SVG, généré localement) menant à la page publique de retour du prêt. */
export function loanerReturnQrSvg(token: string): string {
  const svg = bwipjs.toSVG({ bcid: 'qrcode', text: loanerReturnUrl(token), scale: 2, padding: 0 } as any);
  return svg.replace('<svg ', '<svg style="width:80px;height:80px" ');
}
