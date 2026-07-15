import { useEffect, useMemo, useRef, useState } from 'react';
import bwipjs from 'bwip-js/browser';
import { Button } from '@/components/ui/button';
import { Download, Printer, Barcode as BarcodeIcon, Settings2 } from 'lucide-react';
import { SAVCase } from '@/hooks/useSAVCases';
import {
  SAVBarcodePrinterSettings,
  loadLabelPrinterSettings,
  type LabelPrinterSettings,
} from './SAVBarcodePrinterSettings';

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

  const handlePrint = () => {
    if (!dataUrl || !code) return;
    const s = printerSettings;
    const rot = s.rotateContent ?? 0;
    const isSide = rot === 90 || rot === 270;
    // Physical page = real label size. Content box: if rotated 90/270 we swap
    // width/height so the rotated content still fills the label, then translate
    // it back to occupy the page.
    const pageW = s.widthMm;
    const pageH = s.heightMm;
    const margin = s.marginMm;
    const boxW = (isSide ? pageH : pageW) - margin * 2;
    const boxH = (isSide ? pageW : pageH) - margin * 2;
    const win = window.open('', '_blank', `width=${Math.max(320, pageW * 10)},height=${Math.max(260, pageH * 10)}`);
    if (!win) return;
    const printerHint = s.printerName
      ? `<div class="hint">Imprimante recommandée : <strong>${esc(s.printerName)}</strong> — sélectionnez-la dans la boîte d'impression (marges : Aucune, échelle : 100%).</div>`
      : '';
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
          display: flex; flex-direction: column;
          padding: 1mm; box-sizing: border-box;
        }
        .type { font-size: 7pt; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.3px; text-align: center; line-height: 1.1; margin-bottom: 0.5mm; }
        .customer { font-size: 8pt; font-weight: 600; text-align: center;
          line-height: 1.1; margin-bottom: 0.5mm;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .device { font-size: 8pt; font-weight: 700; text-align: center;
          line-height: 1.1; margin-bottom: 0.5mm;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .problem { font-size: 6.5pt; text-align: center; line-height: 1.15;
          margin-bottom: 0.8mm; max-height: 5mm; overflow: hidden; }
        .bc { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 0; }
        .bc img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .hint { font-size: 11px; color: #555; text-align: center; padding: 8px; }
        @media print { .hint { display: none; } .page { box-shadow: none; } }
        @media screen { body { background:#f1f1f1; padding:16px; }
          .page { background:#fff; box-shadow:0 1px 6px rgba(0,0,0,.18); margin:auto; } }
      </style></head><body>
      ${printerHint}
      <div class="page">
        <div class="label">
          ${typeLabel ? `<div class="type">${esc(typeLabel)}</div>` : ''}
          ${customerName ? `<div class="customer">${esc(customerName)}</div>` : ''}
          ${deviceLine ? `<div class="device">${esc(deviceLine)}</div>` : ''}
          ${problemSummary ? `<div class="problem">${esc(problemSummary)}</div>` : ''}
          <div class="bc"><img src="${dataUrl}" alt="${esc(code)}" /></div>
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

  return (
    <div className="rounded-md border bg-card p-3 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-shrink-0 bg-white rounded p-2 border self-center">
          {error ? (
            <div className="text-xs text-destructive w-[180px] text-center">{error}</div>
          ) : (
            <canvas ref={canvasRef} className="block max-w-[220px] h-auto" />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="text-xs text-muted-foreground">
            Étiquette {printerSettings.widthMm}×{printerSettings.heightMm} mm — Code 128 basé sur le numéro de dossier.
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
    </div>
  );
}

