import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Printer, Usb, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export interface LabelPrinterSettings {
  printerName: string;
  widthMm: number;
  heightMm: number;
  marginMm: number;
  autoPrint: boolean;
  usbVendorId?: number | null;
  usbProductId?: number | null;
  usbDeviceName?: string | null;
}

const STORAGE_KEY = 'fixway_label_printer_settings';

export const DEFAULT_LABEL_SETTINGS: LabelPrinterSettings = {
  printerName: '',
  widthMm: 60,
  heightMm: 40,
  marginMm: 2,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Imprimante d'étiquettes
          </DialogTitle>
          <DialogDescription>
            Paramètres dédiés à l'impression des étiquettes SAV (Epson ou équivalent),
            distincts de l'imprimante A4 classique.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="printer-name">Nom de l'imprimante (mémo)</Label>
            <Input
              id="printer-name"
              placeholder="Ex: EPSON TM-L90 Etiquettes"
              value={settings.printerName}
              onChange={(e) => update('printerName', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Rappel affiché lors de l'impression. Sélectionnez cette imprimante dans
              la boîte de dialogue système au moment de l'impression.
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="w">Largeur (mm)</Label>
              <Input id="w" type="number" min={10} max={200}
                value={settings.widthMm}
                onChange={(e) => update('widthMm', Number(e.target.value) || 60)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="h">Hauteur (mm)</Label>
              <Input id="h" type="number" min={10} max={200}
                value={settings.heightMm}
                onChange={(e) => update('heightMm', Number(e.target.value) || 40)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m">Marge (mm)</Label>
              <Input id="m" type="number" min={0} max={20} step={0.5}
                value={settings.marginMm}
                onChange={(e) => update('marginMm', Number(e.target.value) || 0)} />
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
              Pour la détection réseau, ajoutez l'imprimante à votre système
              d'exploitation puis sélectionnez-la lors de l'impression.
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
