import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Printer, Usb, CheckCircle2, XCircle, RotateCw, Info, ExternalLink, HelpCircle, RefreshCw, Wand2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  LABEL_PRINTERS,
  DEFAULT_PRINTER_ID,
  findPrinterSpec,
  findDefaultMedia,
  type LabelPrinterSpec,
  type LabelMedia,
} from '@/lib/labelPrinters';
import { PrinterSetupWizard } from './PrinterSetupWizard';
import { isPrinterSetupDone, resetPrinterSetup } from './printerSetupState';


export interface LabelPrinterSettings {
  /** Identifiant du modèle dans la base labelPrinters.ts (ou 'custom') */
  printerSpecId: string;
  /** Identifiant de l'étiquette dans le modèle (ou 'custom') */
  mediaId: string;
  /** Nom d'imprimante à sélectionner dans la boîte système */
  printerName: string;
  widthMm: number;
  heightMm: number;
  marginMm: number;
  /** Marge de sécurité interne (soustraite du @page pour éviter les sauts d'étiquette) */
  safetyMarginMm: number;
  /** Largeur imprimable maximale de la tête (mm) — plafond appliqué à widthMm */
  maxPrintWidthMm: number;
  rotateContent: 0 | 90 | 180 | 270;
  /** Disposition interne : empilé (défaut) ou code-barres pivoté à gauche du texte */
  barcodeLayout: 'stacked' | 'left-rotated';
  autoPrint: boolean;
  usbVendorId?: number | null;
  usbProductId?: number | null;
  usbDeviceName?: string | null;
}

const STORAGE_KEY = 'fixway_label_printer_settings';

function buildDefaults(): LabelPrinterSettings {
  const spec = findPrinterSpec(DEFAULT_PRINTER_ID)!;
  const media = findDefaultMedia(spec);
  return {
    printerSpecId: spec.id,
    mediaId: media.id,
    printerName: spec.suggestedWindowsName,
    widthMm: media.widthMm,
    heightMm: media.heightMm,
    marginMm: 1,
    safetyMarginMm: spec.safetyMarginMm,
    maxPrintWidthMm: spec.maxPrintWidthMm,
    rotateContent: spec.defaultRotationDeg,
    barcodeLayout: 'stacked',
    autoPrint: true,
    usbVendorId: null,
    usbProductId: null,
    usbDeviceName: null,
  };
}

export const DEFAULT_LABEL_SETTINGS: LabelPrinterSettings = buildDefaults();

export function loadLabelPrinterSettings(): LabelPrinterSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaults();
    const parsed = JSON.parse(raw);
    // Migration douce depuis l'ancienne shape (printerModel)
    const migrated: Partial<LabelPrinterSettings> = { ...parsed };
    if (!migrated.printerSpecId) migrated.printerSpecId = DEFAULT_PRINTER_ID;
    if (!migrated.mediaId) migrated.mediaId = 'custom';
    return { ...buildDefaults(), ...migrated } as LabelPrinterSettings;
  } catch {
    return buildDefaults();
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
  const [wizardOpen, setWizardOpen] = useState(false);
  const [setupDone, setSetupDone] = useState(false);

  useEffect(() => {
    if (open) {
      const s = loadLabelPrinterSettings();
      setSettings(s);
      setSetupDone(isPrinterSetupDone(s.printerSpecId));
    }
    setUsbSupported(typeof navigator !== 'undefined' && 'usb' in navigator);
  }, [open]);

  useEffect(() => {
    setSetupDone(isPrinterSetupDone(settings.printerSpecId));
  }, [settings.printerSpecId]);


  const update = <K extends keyof LabelPrinterSettings>(k: K, v: LabelPrinterSettings[K]) =>
    setSettings((prev) => ({ ...prev, [k]: v }));

  const currentSpec: LabelPrinterSpec | undefined = useMemo(
    () => findPrinterSpec(settings.printerSpecId),
    [settings.printerSpecId],
  );

  const applyPrinterSpec = (specId: string) => {
    const spec = findPrinterSpec(specId);
    if (!spec) return;
    const media = findDefaultMedia(spec);
    setSettings((prev) => ({
      ...prev,
      printerSpecId: spec.id,
      mediaId: media.id,
      printerName: spec.suggestedWindowsName || prev.printerName,
      widthMm: Math.min(media.widthMm, spec.maxPrintWidthMm),
      heightMm: media.heightMm,
      safetyMarginMm: spec.safetyMarginMm,
      maxPrintWidthMm: spec.maxPrintWidthMm,
      rotateContent: spec.defaultRotationDeg,
    }));
  };

  const applyMedia = (mediaId: string) => {
    if (!currentSpec) return;
    if (mediaId === 'custom') {
      update('mediaId', 'custom');
      return;
    }
    const media = currentSpec.recommendedMedia.find((m) => m.id === mediaId);
    if (!media) return;
    setSettings((prev) => ({
      ...prev,
      mediaId: media.id,
      widthMm: Math.min(media.widthMm, currentSpec.maxPrintWidthMm),
      heightMm: media.heightMm,
    }));
  };

  const restoreRecommended = () => {
    if (!currentSpec) return;
    const media = currentSpec.recommendedMedia.find((m) => m.id === settings.mediaId)
      || findDefaultMedia(currentSpec);
    setSettings((prev) => ({
      ...prev,
      mediaId: media.id,
      printerName: currentSpec.suggestedWindowsName || prev.printerName,
      widthMm: Math.min(media.widthMm, currentSpec.maxPrintWidthMm),
      heightMm: media.heightMm,
      marginMm: 1,
      safetyMarginMm: currentSpec.safetyMarginMm,
      maxPrintWidthMm: currentSpec.maxPrintWidthMm,
      rotateContent: currentSpec.defaultRotationDeg,
    }));
    toast.success('Réglages recommandés restaurés');
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
    // Sécurité : plafonner la largeur à la largeur imprimable du modèle
    const safe: LabelPrinterSettings = {
      ...settings,
      widthMm: Math.min(settings.widthMm, settings.maxPrintWidthMm || settings.widthMm),
    };
    saveLabelPrinterSettings(safe);
    toast.success('Configuration enregistrée');
    onSaved?.(safe);
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
            <div className="flex items-center justify-between gap-2">
              <Label>Modèle d'imprimante</Label>
              {currentSpec && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2">
                      <HelpCircle className="h-3.5 w-3.5 mr-1" />
                      Fiche & conseils
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 max-h-[70vh] overflow-y-auto text-xs space-y-3">
                    <div>
                      <div className="text-sm font-semibold">{currentSpec.brand} {currentSpec.model}</div>
                      <div className="text-muted-foreground">
                        {currentSpec.dpi} dpi • largeur imprimable {currentSpec.maxPrintWidthMm} mm •{' '}
                        {currentSpec.printMethod === 'thermal-direct' ? 'thermique direct' : currentSpec.printMethod}
                      </div>
                      {currentSpec.productUrl && (
                        <a
                          href={currentSpec.productUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline mt-1"
                        >
                          <ExternalLink className="h-3 w-3" /> Fiche constructeur
                        </a>
                      )}
                    </div>
                    <div>
                      <div className="font-medium mb-1">Réglages pilote</div>
                      <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                        {currentSpec.driverNotes.map((n, i) => <li key={i}>{n}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="font-medium mb-1">Réglages navigateur</div>
                      <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                        {currentSpec.browserNotes.map((n, i) => <li key={i}>{n}</li>)}
                      </ul>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <Select
              value={settings.printerSpecId}
              onValueChange={applyPrinterSpec}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LABEL_PRINTERS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.brand} — {p.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {currentSpec && (
            <div className="space-y-2">
              <Label>Format d'étiquette</Label>
              <Select value={settings.mediaId} onValueChange={applyMedia}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentSpec.recommendedMedia.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.widthMm}×{m.heightMm} mm — {m.description}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Personnalisé (ci-dessous)</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="font-normal">
                  {currentSpec.dpi} dpi
                </Badge>
                <Badge variant="secondary" className="font-normal">
                  Largeur max {currentSpec.maxPrintWidthMm} mm
                </Badge>
                <Badge variant="secondary" className="font-normal">
                  Marge sécurité {currentSpec.safetyMarginMm} mm
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 ml-auto"
                  onClick={restoreRecommended}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Restaurer les réglages recommandés
                </Button>
              </div>
            </div>
          )}

          {currentSpec && (
            <div className={`rounded-md border p-3 space-y-2 ${setupDone ? 'border-green-500/40 bg-green-50 dark:bg-green-950/20' : 'border-orange-400/50 bg-orange-50 dark:bg-orange-950/20'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  {setupDone ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                  )}
                  <div className="text-xs">
                    <div className="font-medium">
                      {setupDone
                        ? 'Configuration Windows terminée sur ce poste'
                        : 'Configuration Windows requise'}
                    </div>
                    <div className="text-muted-foreground mt-0.5">
                      {setupDone
                        ? `Format papier "Fixway ${settings.widthMm}x${settings.heightMm}" déclaré dans le pilote.`
                        : `Sans configuration du format papier dans Windows, l'imprimante peut sauter plusieurs étiquettes entre chaque impression.`}
                    </div>
                  </div>
                </div>
                {setupDone && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 shrink-0"
                    onClick={() => { resetPrinterSetup(settings.printerSpecId); setSetupDone(false); toast.success('État réinitialisé'); }}
                  >
                    Réinitialiser
                  </Button>
                )}
              </div>
              <Button
                type="button"
                variant={setupDone ? 'outline' : 'default'}
                size="sm"
                className="w-full"
                onClick={() => setWizardOpen(true)}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                {setupDone ? 'Revoir l\'assistant' : 'Ouvrir l\'assistant de configuration Windows'}
              </Button>
            </div>
          )}


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
                onChange={(e) => { update('widthMm', Number(e.target.value) || 55); update('mediaId', 'custom'); }} />
              {currentSpec && settings.widthMm > currentSpec.maxPrintWidthMm && (
                <p className="text-[10px] text-destructive">
                  Dépasse la largeur imprimable ({currentSpec.maxPrintWidthMm} mm)
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="h">Hauteur (mm)</Label>
              <Input id="h" type="number" min={10} max={200} step={0.5}
                value={settings.heightMm}
                onChange={(e) => { update('heightMm', Number(e.target.value) || 40); update('mediaId', 'custom'); }} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m">Marge (mm)</Label>
              <Input id="m" type="number" min={0} max={20} step={0.5}
                value={settings.marginMm}
                onChange={(e) => update('marginMm', Number(e.target.value) || 0)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="safety">Marge de sécurité anti-saut d'étiquette (mm)</Label>
            <Input id="safety" type="number" min={0} max={5} step={0.1}
              value={settings.safetyMarginMm}
              onChange={(e) => update('safetyMarginMm', Number(e.target.value) || 0)} />
            <p className="text-xs text-muted-foreground">
              Soustraite du format papier envoyé au pilote. Augmenter (0.5 → 1.5 mm) si l'imprimante saute une étiquette vide entre chaque impression.
            </p>
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

          <div className="space-y-2">
            <Label>Disposition du code-barres</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'stacked', label: 'Empilé', hint: 'Texte au-dessus, code-barres en bas' },
                { key: 'left-rotated', label: 'Barcode à gauche pivoté', hint: 'Code-barres vertical à gauche, texte à droite' },
              ] as const).map((opt) => {
                const active = settings.barcodeLayout === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => update('barcodeLayout', opt.key)}
                    className={`text-left rounded-md border p-2 transition ${active ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'hover:border-muted-foreground/40'}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-14 h-9 bg-white border rounded-sm flex overflow-hidden">
                        {opt.key === 'stacked' ? (
                          <div className="flex-1 flex flex-col p-0.5 gap-0.5">
                            <div className="h-0.5 bg-muted-foreground/60 rounded-sm" />
                            <div className="h-0.5 bg-muted-foreground/60 rounded-sm w-2/3" />
                            <div className="flex-1 bg-[repeating-linear-gradient(90deg,#111_0_1px,transparent_1px_2px)] rounded-sm mt-0.5" />
                          </div>
                        ) : (
                          <>
                            <div className="w-3 bg-[repeating-linear-gradient(0deg,#111_0_1px,transparent_1px_2px)]" />
                            <div className="flex-1 flex flex-col p-0.5 gap-0.5 justify-center">
                              <div className="h-0.5 bg-muted-foreground/60 rounded-sm" />
                              <div className="h-0.5 bg-muted-foreground/60 rounded-sm w-4/5" />
                              <div className="h-0.5 bg-muted-foreground/60 rounded-sm w-3/5" />
                            </div>
                          </>
                        )}
                      </div>
                      <span className="text-sm font-medium">{opt.label}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-tight">{opt.hint}</div>
                  </button>
                );
              })}
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
            {currentSpec?.productUrl && (
              <a
                href={currentSpec.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Fiche & pilotes {currentSpec.brand} {currentSpec.model}
              </a>
            )}
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
