/** Clé localStorage indiquant que la configuration Windows a été effectuée pour ce modèle. */
export function setupDoneStorageKey(printerSpecId: string): string {
  return `fixway_printer_setup_done_${printerSpecId}`;
}

export function isPrinterSetupDone(printerSpecId: string): boolean {
  try {
    return localStorage.getItem(setupDoneStorageKey(printerSpecId)) === '1';
  } catch {
    return false;
  }
}

export function resetPrinterSetup(printerSpecId: string): void {
  try {
    localStorage.removeItem(setupDoneStorageKey(printerSpecId));
  } catch {
    /* noop */
  }
}

/** Clé pour "ne plus me rappeler avant impression" (indépendant de la config faite). */
export function skipReminderStorageKey(printerSpecId: string): string {
  return `fixway_printer_skip_reminder_${printerSpecId}`;
}
