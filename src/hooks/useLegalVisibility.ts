// Le « mode discret » a été retiré : les mentions légales et le nom SAS HAPICS
// sont toujours affichés (obligation légale). Ces exports restent pour compatibilité.
export const WHITE_LABEL_SETTING_KEY = 'white_label_hide_legal';

export function maskCompanyName(text: string | null | undefined): string {
  return text ?? '';
}

export function applyMask(text: string | null | undefined, _enabled: boolean): string | null {
  return text ?? null;
}

export function useLegalVisibility() {
  return {
    hideLegal: false,
    isLoading: false,
    mask: (text: string | null | undefined) => text ?? null,
  };
}
