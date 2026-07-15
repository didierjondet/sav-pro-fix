import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Usb, CheckCircle2, XCircle, RotateCw, Info, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export type PrinterModelKey =
  | 'epson-tm-l90-55x40'
  | 'epson-tm-l90-58x40'
  | 'brother-ql-62x29'
  | 'zebra-zd-57x32'
  | 'dymo-lw-54x25'
  | 'generic-60x40'
  | 'custom';

export interface PrinterPreset {
  key: PrinterModelKey;
  label: string;
  printerName: string;
  widthMm: number;
  heightMm: number;
  marginMm: number;
  contentOrientation: 'landscape' | 'portrait';
  rotateContent: 0 | 90 | 180 | 270;
}

export const PRINTER_PRESETS: PrinterPreset[] = [
  {
    key: 'epson-tm-l90-55x40',
    label: 'Epson TM-L90 — étiquette 55×40 mm (recommandé)',
    printerName: 'EPSON TM-L90 Label',
    widthMm: 55,
    heightMm: 40,
    marginMm: 1,
    contentOrientation: 'landscape',
    rotateContent: 90,
  },
  {
    key: 'epson-tm-l90-58x40',
    label: 'Epson TM-L90 — étiquette 58×40 mm',
    printerName: 'EPSON TM-L90 Label',
    widthMm: 58,
    heightMm: 40,
    marginMm: 1,
    contentOrientation: 'landscape',
    rotateContent: 90,
  },
  {
    key: 'brother-ql-62x29',
    label: 'Brother QL — 62×29 mm',
    printerName: 'Brother QL',
    widthMm: 62,
    heightMm: 29,
    marginMm: 1,
    contentOrientation: 'landscape',
    rotateContent: 0,
  },
  {
    key: 'zebra-zd-57x32',
    label: 'Zebra ZD — 57×32 mm',
    printerName: 'Zebra ZD',
    widthMm: 57,
    heightMm: 32,
    marginMm: 1,
    contentOrientation: 'landscape',
    rotateContent: 0,
  },
  {
    key: 'dymo-lw-54x25',
    label: 'DYMO LabelWriter — 54×25 mm',
    printerName: 'DYMO LabelWriter',
    widthMm: 54,
    heightMm: 25,
    marginMm: 1,
    contentOrientation: 'landscape',
    rotateContent: 0,
  },
  {
    key: 'generic-60x40',
    label: 'Générique 60×40 mm',
    printerName: '',
    widthMm: 60,
    heightMm: 40,
    marginMm: 2,
    contentOrientation: 'landscape',
    rotateContent: 0,
  },
  {
    key: 'custom',
    label: 'Personnalisé',
    printerName: '',
    widthMm: 60,
    heightMm: 40,
    marginMm: 2,
    contentOrientation: 'landscape',
    rotateContent: 0,
  },
];

export interface LabelPrinterSettings {
  printerModel: PrinterModelKey;
  printerName: string;
  widthMm: number;
  heightMm: number;
  marginMm: number;
  contentOrientation: 'landscape' | 'portrait';
  rotateContent: 0 | 90 | 180 | 270;
  autoPrint: boolean;
  usbVendorId?: number | null;
  usbProductId?: number | null;
  usbDeviceName?: string | null;
}

const STORAGE_KEY = 'fixway_label_printer_settings';

export const DEFAULT_LABEL_SETTINGS: LabelPrinterSettings = {
  printerModel: 'epson-tm-l90-55x40',
  printerName: 'EPSON TM-L90 Label',
  widthMm: 55,
  heightMm: 40,
  marginMm: 1,
  contentOrientation: 'landscape',
  rotateContent: 90,
  autoPrint: true,
  usbVendorId: null,
  usbProductId: null,
  usbDeviceName: null,
};

export function loadLabelPrinterSettings(): LabelPrinterSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LABEL_SETTINGS;
    return { ...DEFAULT_LABEL_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_LABEL_SETTINGS;
  }
}

export function saveLabelPrinterSettings(s: LabelPrinterSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: (s: LabelPrinterSettings) => void;
}

export function SAVBarcodePrinterSettings({ open, onOpenChange, onSaved }: Props) {
  const [settings, setSettings] = useState<LabelPrinterSettings>(DEFAULT_LABEL_SETTINGS);
  const [usbSupported, setUsbSupported] = useState(false);

  useEffect(() => {
    if (open) setSettings(loadLabelPrinterSettings());
    setUsbSupported(typeof navigator !== 'undefined' && 'usb' in navigator);
  }, [open]);

  const update = <K extends keyof LabelPrinterSettings>(k: K, v: LabelPrinterSettings[K]) =>
    setSettings((prev) => ({ ...prev, [k]: v }));

  const applyPreset = (key: PrinterModelKey) => {
    const p = PRINTER_PRESETS.find((x) => x.key === key);
    if (!p) return;
    if (key === 'custom') {
      setSettings((prev) => ({ ...prev, printerModel: 'custom' }));
      return;
    }
    setSettings((prev) => ({
      ...prev,
      printerModel: p.key,
      printerName: p.printerName || prev.printerName,
      widthMm: p.widthMm,
      heightMm: p.heightMm,
      marginMm: p.marginMm,
      contentOrientation: p.contentOrientation,
      rotateContent: p.rotateContent,
    }));
  };

  const rotateNext = () => {
    const order: LabelPrinterSettings['rotateContent'][] = [0, 90, 180, 270];
    const idx = order.indexOf(settings.rotateContent);
    update('rotateContent', order[(idx + 1) % order.length]);
  };

  const handlePickUsb = async () => {
    try {
      // @ts-ignore - WebUSB
      const device = await navigator.usb.requestDevice({ filters: [] });
      update('usbVendorId', device.vendorId);
      update('usbProductId', device.productId);
      update('usbDeviceName', device.productName || device.manufacturerName || `USB ${device.vendorId}:${device.productId}`);
      toast.success('Imprimante USB associée');
    } catch (e: any) {
      if (e?.name !== 'NotFoundError') {
        toast.error("Impossible d'accéder à l'imprimante USB");
      }
    }
  };

  const clearUsb = () => {
    update('usbVendorId', null);
    update('usbProductId', null);
    update('usbDeviceName', null);
  };

  const handleSave = () => {
    saveLabelPrinterSettings(settings);
    toast.success('Configuration enregistrée');
    onSaved?.(settings);
    onOpenChange(false);
  };

  // Preview: rectangle at scale, with rotated content box inside
  const preview = useMemo(() => {
    const maxW = 200;
    const maxH = 130;
    const scale = Math.min(maxW / settings.widthMm, maxH / settings.heightMm);
    const w = settings.widthMm * scale;
    const h = settings.heightMm * scale;
    const rot = settings.rotateContent;
    const isSide = rot === 90 || rot === 270;
    const innerW = isSide ? h : w;
    const innerH = isSide ? w : h;
    return { w, h, rot, innerW, innerH };
  }, [settings.widthMm, settings.heightMm, settings.rotateContent]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Imprimante d'étiquettes
          </DialogTitle>
          <DialogDescription>
            Paramètres dédiés aux étiquettes SAV. Pré-configuré pour Epson TM-L90 (rouleau 55×40 mm).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Modèle d'imprimante / format d'étiquette</Label>
            <Select
              value={settings.printerModel}
              onValueChange={(v) => applyPreset(v as PrinterModelKey)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRINTER_PRESETS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Sélectionner un modèle préremplit taille, marges et rotation adaptée au sens de chargement du rouleau.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="printer-name">Nom de l'imprimante (mémo)</Label>
            <Input
              id="printer-name"
              placeholder="Ex: EPSON TM-L90 Label"
              value={settings.printerName}
              onChange={(e) => update('printerName', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Rappel affiché lors de l'impression. Sélectionnez cette imprimante dans la boîte système au moment d'imprimer.
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="w">Largeur (mm)</Label>
              <Input id="w" type="number" min={10} max={200} step={0.5}
                value={settings.widthMm}
                onChange={(e) => { update('widthMm', Number(e.target.value) || 55); update('printerModel', 'custom'); }} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="h">Hauteur (mm)</Label>
              <Input id="h" type="number" min={10} max={200} step={0.5}
                value={settings.heightMm}
                onChange={(e) => { update('heightMm', Number(e.target.value) || 40); update('printerModel', 'custom'); }} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m">Marge (mm)</Label>
              <Input id="m" type="number" min={0} max={20} step={0.5}
                value={settings.marginMm}
                onChange={(e) => update('marginMm', Number(e.target.value) || 0)} />
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label>Rotation du contenu</Label>
                <p className="text-xs text-muted-foreground">
                  Si l'impression sort tournée, changez ici (pas dans Windows).
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={rotateNext}>
                <RotateCw className="h-4 w-4 mr-2" />
                {settings.rotateContent}°
              </Button>
            </div>

            <div className="flex justify-center bg-muted/40 rounded p-3">
              <div
                className="relative bg-white border shadow-sm"
                style={{ width: `${preview.w}px`, height: `${preview.h}px` }}
              >
                <div
                  className="absolute top-1/2 left-1/2 flex flex-col items-center justify-center border border-dashed border-primary/60 bg-primary/5"
                  style={{
                    width: `${preview.innerW}px`,
                    height: `${preview.innerH}px`,
                    transform: `translate(-50%, -50%) rotate(${preview.rot}deg)`,
                  }}
                >
                  <div className="text-[9px] font-semibold leading-none">ÉTIQUETTE</div>
                  <div className="text-[8px] text-muted-foreground leading-tight mt-0.5">
                    {settings.widthMm}×{settings.heightMm} mm
                  </div>
                  <div className="mt-1 h-1 w-3/5 bg-black/70" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="auto">Lancer l'impression automatiquement</Label>
              <p className="text-xs text-muted-foreground">
                Ouvre directement la boîte d'impression navigateur.
              </p>
            </div>
            <Switch id="auto" checked={settings.autoPrint}
              onCheckedChange={(v) => update('autoPrint', v)} />
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-2">
            <div className="flex items-center gap-2 font-medium">
              <Info className="h-4 w-4" /> Réglages recommandés (boîte d'impression Chrome / Edge)
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
              <li>Sélectionner l'imprimante <strong>{settings.printerName || 'EPSON TM-L90 Label'}</strong></li>
              <li>Marges : <strong>Aucune</strong></li>
              <li>Mise à l'échelle : <strong>100 %</strong> (surtout pas "Ajuster à la page")</li>
              <li>En-têtes et pieds de page : <strong>décochés</strong></li>
              <li>Orientation Windows : <strong>ne pas modifier</strong> (utilisez le bouton Rotation ci-dessus)</li>
            </ul>
            <a
              href="https://www.epson.fr/fr_FR/support/sc/epson-tm-l90/s/s006"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Pilotes officiels Epson TM-L90
            </a>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Usb className="h-4 w-4" />
              Imprimante USB associée (optionnel)
            </Label>
            {settings.usbDeviceName ? (
              <div className="flex items-center justify-between rounded-md border p-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="font-medium">{settings.usbDeviceName}</span>
                  <span className="text-xs text-muted-foreground">
                    ({settings.usbVendorId?.toString(16)}:{settings.usbProductId?.toString(16)})
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={clearUsb}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Aucune imprimante USB associée.</div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePickUsb}
              disabled={!usbSupported}
            >
              <Usb className="h-4 w-4 mr-2" />
              {usbSupported ? 'Rechercher / associer une imprimante USB' : 'WebUSB non supporté par ce navigateur'}
            </Button>
            <p className="text-xs text-muted-foreground">
              L'association USB sert seulement d'aide-mémoire — l'impression réelle passe par le driver système.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
