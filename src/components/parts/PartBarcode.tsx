import { useEffect, useMemo, useRef, useState } from 'react';
import bwipjs from 'bwip-js/browser';
import { Button } from '@/components/ui/button';
import { Download, Printer, Barcode as BarcodeIcon } from 'lucide-react';

interface PartBarcodeProps {
  /** SKU principal (priorité). */
  sku?: string | null;
  /** Référence (fallback si SKU vide). */
  reference?: string | null;
  /** Nom produit (affiché sur l'étiquette imprimée). */
  productName?: string | null;
}

/**
 * Aperçu d'un code-barres Code 128 + impression d'une étiquette unique
 * + téléchargement PNG. Utilise le SKU (ou la référence en fallback).
 */
export function PartBarcode({ sku, reference, productName }: PartBarcodeProps) {
  const code = useMemo(() => {
    const v = (sku && sku.trim()) || (reference && reference.trim()) || '';
    return v;
  }, [sku, reference]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

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

  const handlePrint = () => {
    if (!dataUrl || !code) return;
    const win = window.open('', '_blank', 'width=420,height=320');
    if (!win) return;
    const safeName = (productName || '').replace(/</g, '&lt;');
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Étiquette ${code}</title>
      <style>
        @page { size: 60mm 40mm; margin: 2mm; }
        html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
        .label { width: 56mm; height: 36mm; display: flex; flex-direction: column;
          align-items: center; justify-content: center; padding: 2mm; box-sizing: border-box; }
        .name { font-size: 9pt; font-weight: 600; text-align: center; line-height: 1.1;
          margin-bottom: 1.5mm; max-height: 8mm; overflow: hidden; }
        img { width: 100%; max-height: 22mm; object-fit: contain; }
        @media screen { body { background:#f1f1f1; padding:16px; } .label { background:#fff; box-shadow:0 1px 4px rgba(0,0,0,.1); margin:auto; } }
      </style></head><body>
      <div class="label">
        ${safeName ? `<div class="name">${safeName}</div>` : ''}
        <img src="${dataUrl}" alt="${code}" />
      </div>
      <script>window.onload = () => { setTimeout(() => { window.print(); }, 150); };</script>
      </body></html>`);
    win.document.close();
  };

  const handleDownload = () => {
    if (!dataUrl || !code) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `barcode-${code}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!code) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
        <BarcodeIcon className="h-4 w-4" />
        Définissez un SKU (ou une référence) pour générer un code-barres.
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-shrink-0 bg-white rounded p-2 border">
          {error ? (
            <div className="text-xs text-destructive w-[180px] text-center">{error}</div>
          ) : (
            <canvas ref={canvasRef} className="block max-w-[200px] h-auto" />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="text-xs text-muted-foreground">
            Code-barres Code 128 généré à partir du{' '}
            <span className="font-medium text-foreground">
              {sku?.trim() ? 'SKU' : 'numéro de référence'}
            </span>
            .
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={handlePrint} disabled={!dataUrl}>
              <Printer className="h-4 w-4" />Imprimer l'étiquette
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleDownload} disabled={!dataUrl}>
              <Download className="h-4 w-4" />PNG
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
