import { useEffect, useMemo, useRef, useState } from 'react';
import bwipjs from 'bwip-js/browser';
import { Button } from '@/components/ui/button';
import { Download, Printer, Barcode as BarcodeIcon, Settings2, AlertTriangle, Wand2 } from 'lucide-react';
import { SAVCase } from '@/hooks/useSAVCases';
import {
  SAVBarcodePrinterSettings,
  loadLabelPrinterSettings,
  type LabelPrinterSettings,
} from './SAVBarcodePrinterSettings';
import { PrinterSetupWizard } from './PrinterSetupWizard';
import { isPrinterSetupDone, skipReminderStorageKey } from './printerSetupState';
import { findPrinterSpec } from '@/lib/labelPrinters';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';


interface SAVBarcodeProps {
  savCase: SAVCase;
  /** Libellé lisible du type de SAV (résolu depuis shop_sav_types) */
  savTypeLabel?: string;
}

/**
 * Génère un code-barres Code 128 pour un dossier SAV.
 * Le code encodé = numéro de dossier (court, scannable).
 * L'étiquette imprimée affiche : type SAV, client, marque/modèle, panne résumée.
 * Format d'impression : 60x40mm (Epson étiquettes standard).
 */
export function SAVBarcode({ savCase, savTypeLabel }: SAVBarcodeProps) {
  const code = savCase?.case_number || '';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [printerSettings, setPrinterSettings] = useState<LabelPrinterSettings>(() => loadLabelPrinterSettings());
  const [reminderOpen, setReminderOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [skipReminder, setSkipReminder] = useState(false);


  const customerName = useMemo(() => {
    if (!savCase?.customer) return '';
    return `${savCase.customer.first_name || ''} ${savCase.customer.last_name || ''}`.trim();
  }, [savCase]);

  const deviceLine = useMemo(() => {
    return [savCase?.device_brand, savCase?.device_model].filter(Boolean).join(' ');
  }, [savCase]);

  const problemSummary = useMemo(() => {
    const raw = (savCase?.problem_description || '').replace(/\s+/g, ' ').trim();
    if (raw.length <= 60) return raw;
    return raw.slice(0, 57) + '…';
  }, [savCase]);

  const typeLabel = savTypeLabel || savCase?.sav_type || '';

  useEffect(() => {
    if (!code || !canvasRef.current) {
      setDataUrl(null);
      return;
    }
    try {
      bwipjs.toCanvas(canvasRef.current, {
        bcid: 'code128',
        text: code,
        scale: 2,
        height: 14,
        includetext: true,
        textxalign: 'center',
        textsize: 9,
        backgroundcolor: 'FFFFFF',
        paddingwidth: 4,
        paddingheight: 4,
      });
      setDataUrl(canvasRef.current.toDataURL('image/png'));
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Impossible de générer le code-barres.');
      setDataUrl(null);
    }
  }, [code]);

  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] as string));

  const currentSpec = useMemo(() => findPrinterSpec(printerSettings.printerSpecId), [printerSettings.printerSpecId]);

  const handlePrint = () => {
    if (!dataUrl || !code) return;
    // Rappel de configuration Windows si non validée et non explicitement skippée
    try {
      const skipped = localStorage.getItem(skipReminderStorageKey(printerSettings.printerSpecId)) === '1';
      if (!skipped && !isPrinterSetupDone(printerSettings.printerSpecId)) {
        setReminderOpen(true);
        return;
      }
    } catch { /* noop */ }
    doPrint();
  };

  const doPrint = () => {
    if (!dataUrl || !code) return;

    const s = printerSettings;
    const rot = s.rotateContent ?? 0;
    const isSide = rot === 90 || rot === 270;
    // Plafonne la largeur à la largeur imprimable réelle de la tête (spec constructeur).
    const cappedW = s.maxPrintWidthMm ? Math.min(s.widthMm, s.maxPrintWidthMm) : s.widthMm;
    // Marge de sécurité : on rétrécit très légèrement le @page pour éviter que
    // l'imprimante ne détecte un débordement et saute une étiquette vide.
    const safety = Math.max(0, s.safetyMarginMm ?? 0);
    const pageW = Math.max(5, cappedW - safety * 2);
    const pageH = Math.max(5, s.heightMm - safety * 2);
    const margin = s.marginMm;
    const boxW = (isSide ? pageH : pageW) - margin * 2;
    const boxH = (isSide ? pageW : pageH) - margin * 2;
    const win = window.open('', '_blank', `width=${Math.max(320, pageW * 10)},height=${Math.max(260, pageH * 10)}`);
    if (!win) return;
    const printerHint = s.printerName
      ? `<div class="hint">Imprimante recommandée : <strong>${esc(s.printerName)}</strong> — sélectionnez-la dans la boîte d'impression (marges : Aucune, échelle : 100%).</div>`
      : '';
    const leftRotated = s.barcodeLayout === 'left-rotated';
    const bcColMm = leftRotated ? Math.max(8, Math.min(boxW * 0.33, boxH * 0.9)) : 0;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Étiquette SAV ${esc(code)}</title>
      <style>
        @page { size: ${pageW}mm ${pageH}mm; margin: 0; }
        html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #000; }
        .page { position: relative; width: ${pageW}mm; height: ${pageH}mm; overflow: hidden; }
        .label {
          position: absolute; top: 50%; left: 50%;
          width: ${boxW}mm; height: ${boxH}mm;
          transform: translate(-50%, -50%) rotate(${rot}deg);
          transform-origin: center center;
          ${leftRotated
            ? `display: grid; grid-template-columns: ${bcColMm}mm 1fr; gap: 1mm; align-items: stretch;`
            : `display: flex; flex-direction: column;`}
          padding: 1mm; box-sizing: border-box;
        }
        .type { font-size: 7pt; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.3px; line-height: 1.1; margin-bottom: 0.5mm;
          text-align: ${leftRotated ? 'left' : 'center'}; }
        .customer { font-size: 8pt; font-weight: 600; line-height: 1.1; margin-bottom: 0.5mm;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          text-align: ${leftRotated ? 'left' : 'center'}; }
        .device { font-size: 8pt; font-weight: 700; line-height: 1.1; margin-bottom: 0.5mm;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          text-align: ${leftRotated ? 'left' : 'center'}; }
        .problem { font-size: 6.5pt; line-height: 1.15; margin-bottom: 0.8mm;
          max-height: 5mm; overflow: hidden;
          text-align: ${leftRotated ? 'left' : 'center'}; }
        ${leftRotated
          ? `.bc { position: relative; overflow: hidden; }
             .bc img { position: absolute; top: 50%; left: 50%;
               width: ${boxH - 2}mm; height: ${bcColMm - 1}mm;
               transform: translate(-50%, -50%) rotate(-90deg);
               transform-origin: center center; object-fit: fill; }
             .text { min-width: 0; display: flex; flex-direction: column; justify-content: center; }`
          : `.bc { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 0; }
             .bc img { max-width: 100%; max-height: 100%; object-fit: contain; }`}
        .hint { font-size: 11px; color: #555; text-align: center; padding: 8px; }
        @media print { .hint { display: none; } .page { box-shadow: none; } }
        @media screen { body { background:#f1f1f1; padding:16px; }
          .page { background:#fff; box-shadow:0 1px 6px rgba(0,0,0,.18); margin:auto; } }
      </style></head><body>
      ${printerHint}
      <div class="page">
        <div class="label">
          ${leftRotated ? `<div class="bc"><img src="${dataUrl}" alt="${esc(code)}" /></div><div class="text">` : ''}
          ${typeLabel ? `<div class="type">${esc(typeLabel)}</div>` : ''}
          ${customerName ? `<div class="customer">${esc(customerName)}</div>` : ''}
          ${deviceLine ? `<div class="device">${esc(deviceLine)}</div>` : ''}
          ${problemSummary ? `<div class="problem">${esc(problemSummary)}</div>` : ''}
          ${leftRotated ? `</div>` : `<div class="bc"><img src="${dataUrl}" alt="${esc(code)}" /></div>`}
        </div>
      </div>
      ${s.autoPrint ? `<script>window.onload = () => { setTimeout(() => { window.print(); }, 200); };</script>` : ''}
      </body></html>`);
    win.document.close();
  };

  const handleDownload = () => {
    if (!dataUrl || !code) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `sav-${code}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!code) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
        <BarcodeIcon className="h-4 w-4" />
        Numéro de dossier indisponible pour générer un code-barres.
      </div>
    );
  }

  const rot = printerSettings.rotateContent ?? 0;
  const isSide = rot === 90 || rot === 270;
  // Preview box scaled to label ratio (max 220px wide)
  const previewMaxW = 220;
  const previewMaxH = 150;
  const scale = Math.min(previewMaxW / printerSettings.widthMm, previewMaxH / printerSettings.heightMm);
  const pxW = printerSettings.widthMm * scale;
  const pxH = printerSettings.heightMm * scale;
  const innerW = (isSide ? pxH : pxW);
  const innerH = (isSide ? pxW : pxH);

  return (
    <div className="rounded-md border bg-card p-3 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div
          className="flex-shrink-0 bg-white rounded border relative self-center overflow-hidden"
          style={{ width: `${pxW}px`, height: `${pxH}px` }}
        >
          {error ? (
            <div className="text-xs text-destructive w-full h-full flex items-center justify-center text-center p-1">{error}</div>
          ) : (
            <div
              className="absolute top-1/2 left-1/2 flex items-center justify-center"
              style={{
                width: `${innerW}px`,
                height: `${innerH}px`,
                transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                transformOrigin: 'center center',
              }}
            >
              {printerSettings.barcodeLayout === 'left-rotated' ? (
                <div className="w-full h-full flex items-stretch gap-[2px] p-[2px]">
                  <div className="relative overflow-hidden" style={{ width: `${innerW * 0.33}px` }}>
                    <canvas
                      ref={canvasRef}
                      className="block absolute top-1/2 left-1/2"
                      style={{
                        width: `${innerH - 4}px`,
                        height: `${innerW * 0.33 - 2}px`,
                        transform: 'translate(-50%, -50%) rotate(-90deg)',
                        transformOrigin: 'center center',
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center text-[6px] leading-tight">
                    {typeLabel && <div className="font-semibold uppercase truncate">{typeLabel}</div>}
                    {customerName && <div className="truncate">{customerName}</div>}
                    {deviceLine && <div className="font-semibold truncate">{deviceLine}</div>}
                    {problemSummary && <div className="text-muted-foreground line-clamp-2">{problemSummary}</div>}
                  </div>
                </div>
              ) : (
                <canvas ref={canvasRef} className="block max-w-full max-h-full" />
              )}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="text-xs text-muted-foreground">
            Étiquette {printerSettings.widthMm}×{printerSettings.heightMm} mm
            {rot ? ` — rotation ${rot}°` : ''}
            {printerSettings.barcodeLayout === 'left-rotated' ? ' — barcode à gauche pivoté' : ''}
            {' '}— Code 128 basé sur le numéro de dossier.
            {printerSettings.printerName && (
              <> • Imprimante : <span className="font-medium">{printerSettings.printerName}</span></>
            )}
          </div>
          <div className="text-xs space-y-0.5">
            {typeLabel && <div><span className="text-muted-foreground">Type :</span> <span className="font-medium">{typeLabel}</span></div>}
            {customerName && <div><span className="text-muted-foreground">Client :</span> <span className="font-medium">{customerName}</span></div>}
            {deviceLine && <div><span className="text-muted-foreground">Appareil :</span> <span className="font-medium">{deviceLine}</span></div>}
            {problemSummary && <div><span className="text-muted-foreground">Panne :</span> <span className="font-medium">{problemSummary}</span></div>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={handlePrint} disabled={!dataUrl}>
              <Printer className="h-4 w-4" />Imprimer l'étiquette
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleDownload} disabled={!dataUrl}>
              <Download className="h-4 w-4" />PNG
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>
              <Settings2 className="h-4 w-4" />Réglages imprimante
            </Button>
          </div>
        </div>
      </div>
      <SAVBarcodePrinterSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSaved={(s) => setPrinterSettings(s)}
      />
      {currentSpec && (
        <PrinterSetupWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          spec={currentSpec}
          widthMm={printerSettings.widthMm}
          heightMm={printerSettings.heightMm}
        />
      )}
      <AlertDialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Format papier configuré dans Windows ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Si le format papier <strong>{printerSettings.widthMm}×{printerSettings.heightMm} mm</strong> n'a pas été créé dans le pilote de l'imprimante,
              l'aperçu Chrome affichera une grande bande blanche et l'imprimante sautera plusieurs étiquettes.
              Utilisez l'assistant pour la configurer une fois pour toutes sur ce poste.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3">
            <Checkbox
              id="skip-reminder"
              checked={skipReminder}
              onCheckedChange={(v) => setSkipReminder(v === true)}
              className="mt-0.5"
            />
            <label htmlFor="skip-reminder" className="text-sm leading-snug cursor-pointer">
              Ne plus me le rappeler avant impression pour cette imprimante.
            </label>
          </div>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReminderOpen(false);
                setWizardOpen(true);
              }}
            >
              <Wand2 className="h-4 w-4 mr-2" /> Ouvrir l'assistant
            </Button>
            <AlertDialogCancel onClick={() => setReminderOpen(false)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (skipReminder) {
                  try { localStorage.setItem(skipReminderStorageKey(printerSettings.printerSpecId), '1'); } catch { /* noop */ }
                }
                setReminderOpen(false);
                setTimeout(() => doPrint(), 50);
              }}
            >
              Imprimer quand même
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


