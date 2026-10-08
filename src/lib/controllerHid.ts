// Lecture de l'identifiant d'une manette via WebHID (Chrome/Edge ordinateur).

export interface HidIdentity { serial: string; firmware?: string; kind: 'mac' | 'serial' }

const hex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();

/** MAC stockée octets inversés (little-endian) à partir de `offset`. */
export function decodeReversedMac(bytes: Uint8Array, offset: number): string | null {
  if (bytes.length < offset + 6) return null;
  const mac = Array.from(bytes.slice(offset, offset + 6)).reverse();
  if (mac.every((b) => b === 0) || mac.every((b) => b === 0xff)) return null;
  return mac.map(hex).join(':');
}

/** Série ASCII Switch (16 octets, 0x00/0xFF de remplissage ignorés). */
export function decodeSwitchSerial(bytes: Uint8Array): string | null {
  const s = Array.from(bytes).filter((b) => b >= 0x20 && b < 0x7f).map((b) => String.fromCharCode(b)).join('').trim();
  return s.length >= 4 ? s : null;
}

export const hidSupported = () => typeof navigator !== 'undefined' && 'hid' in navigator;

const view = (d: DataView) => new Uint8Array(d.buffer, d.byteOffset, d.byteLength);

async function readSony(dev: any): Promise<HidIdentity | null> {
  const pid = dev.productId;
  const isDualSense = pid === 0x0ce6 || pid === 0x0df2;
  let serial: string | null = null;
  let firmware: string | undefined;
  if (isDualSense) {
    try { serial = decodeReversedMac(view(await dev.receiveFeatureReport(0x09)), 1); } catch { /* */ }
    try {
      const f = view(await dev.receiveFeatureReport(0x20));
      if (f.length >= 32) firmware = `${hex(f[29])}${hex(f[28])}`;
    } catch { /* */ }
  } else {
    for (const id of [0x12, 0x09]) {
      if (serial) break;
      try { serial = decodeReversedMac(view(await dev.receiveFeatureReport(id)), 1); } catch { /* */ }
    }
    try {
      const f = view(await dev.receiveFeatureReport(0xa3));
      if (f.length >= 49) firmware = `${hex(f[48])}${hex(f[47])}`;
    } catch { /* */ }
  }
  return serial ? { serial, firmware, kind: 'mac' } : null;
}

async function readSwitch(dev: any): Promise<HidIdentity | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { dev.removeEventListener('inputreport', on); resolve(null); }, 1500);
    function on(e: any) {
      if (e.reportId !== 0x21) return;
      const d = view(e.data);
      // d[13] = id sous-commande (0x10), données SPI à partir de d[19]
      if (d[13] !== 0x10) return;
      clearTimeout(timer); dev.removeEventListener('inputreport', on);
      const s = decodeSwitchSerial(d.slice(19, 35));
      resolve(s ? { serial: s, kind: 'serial' } : null);
    }
    dev.addEventListener('inputreport', on);
    const pkt = new Uint8Array(48);
    pkt[0] = 0x01; // compteur
    pkt.set([0x00, 0x01, 0x40, 0x40, 0x00, 0x01, 0x40, 0x40], 1);
    pkt[9] = 0x10; // lecture SPI
    pkt.set([0x00, 0x60, 0x00, 0x00, 0x10], 10); // adresse 0x6000, 16 octets
    dev.sendReport(0x01, pkt).catch(() => { clearTimeout(timer); resolve(null); });
  });
}

/** Demande la manette à l'utilisateur et lit son identifiant. null si indisponible. */
export async function readControllerIdentity(): Promise<HidIdentity | null> {
  if (!hidSupported()) return null;
  try {
    const devices = await (navigator as any).hid.requestDevice({ filters: [{ vendorId: 0x054c }, { vendorId: 0x057e }] });
    const dev = devices?.[0];
    if (!dev) return null;
    if (!dev.opened) await dev.open();
    try {
      return dev.vendorId === 0x054c ? await readSony(dev) : await readSwitch(dev);
    } finally {
      try { await dev.close(); } catch { /* */ }
    }
  } catch {
    return null;
  }
}
