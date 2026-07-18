import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileX2, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Props {
  savCase: any;
  shop: any;
}

function buildDefaultText(savCase: any) {
  const brand = savCase?.device_brand || 'appareil';
  const model = savCase?.device_model || '';
  const imei = savCase?.device_imei || savCase?.sku || 'non renseigné';
  const caseNumber = savCase?.case_number || '';
  const createdAt = savCase?.created_at ? format(new Date(savCase.created_at), 'dd/MM/yyyy', { locale: fr }) : '';
  const problem = savCase?.problem_description || 'panne signalée par le client';

  return `Après examen approfondi de l'appareil ${brand} ${model} (IMEI/SN : ${imei}) confié dans le cadre du dossier SAV ${caseNumber} en date du ${createdAt}, nos techniciens qualifiés ont procédé à un diagnostic complet.

Panne constatée : ${problem}

À l'issue de nos investigations, nous sommes au regret de vous informer que la réparation de cet appareil n'est pas réalisable dans nos ateliers, pour les raisons techniques suivantes :

• Dommages internes irréversibles affectant la carte-mère (composants BGA hors-service, pistes coupées non reconstructibles).
• Pièces détachées d'origine constructeur indisponibles sur le marché ou en fin de vie (EOL).
• Coût estimatif de la réparation supérieur à la valeur résiduelle de l'appareil.
• Absence de garantie de fonctionnement post-intervention (risque élevé de récidive).

Nous restons à votre disposition pour vous conseiller sur les alternatives possibles (reprise, recyclage, remplacement).

Le présent certificat est établi pour servir et valoir ce que de droit.`;
}

export function NonRepairabilityCertificateDialog({ savCase, shop }: Props) {
  const [open, setOpen] = useState(false);
  const defaultText = useMemo(() => buildDefaultText(savCase), [savCase]);
  const [text, setText] = useState(defaultText);
  const { toast } = useToast();

  const handlePrint = () => {
    const escapeHtml = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const paragraphs = text.split('\n').map(l => l.trim() === '' ? '<div style="height:8px"></div>' : `<p>${escapeHtml(l)}</p>`).join('');
    const today = format(new Date(), 'dd MMMM yyyy', { locale: fr });
    const customer = savCase?.customer;
    const customerName = customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : (savCase?.external_contact_name || '—');

    const shopHeader = `
      <div class="shop-header">
        ${shop?.logo_url ? `<img src="${shop.logo_url}" alt="${escapeHtml(shop.name || '')}" class="logo"/>` : ''}
        <div class="shop-info">
          <div class="shop-name">${escapeHtml(shop?.name || 'Magasin')}</div>
          <div class="shop-details">
            ${shop?.address ? escapeHtml(shop.address) + '<br/>' : ''}
            ${shop?.phone ? 'Tél : ' + escapeHtml(shop.phone) : ''}
            ${shop?.email ? ' • Email : ' + escapeHtml(shop.email) : ''}
            ${shop?.company_siret ? '<br/>SIRET : ' + escapeHtml(shop.company_siret) : ''}
          </div>
        </div>
      </div>`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Certificat de non-réparabilité - ${escapeHtml(savCase?.case_number || '')}</title>
      <style>
        @page { size: A4 portrait; margin: 1.5cm; }
        body { font-family: Arial, sans-serif; color: #111; font-size: 12px; margin: 0; }
        .shop-header { display: flex; gap: 14px; align-items: center; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 20px; }
        .logo { max-height: 60px; max-width: 90px; }
        .shop-name { font-size: 16px; font-weight: 700; }
        .shop-details { font-size: 11px; color: #333; margin-top: 4px; }
        h1 { text-align: center; font-size: 20px; letter-spacing: 1px; margin: 20px 0 6px; text-transform: uppercase; }
        .subtitle { text-align: center; font-size: 11px; color: #666; margin-bottom: 22px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
        .block { border: 1px solid #ccc; border-radius: 4px; padding: 10px 12px; }
        .block-title { font-weight: 700; font-size: 11px; text-transform: uppercase; color: #555; margin-bottom: 6px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
        .row { margin: 3px 0; }
        .label { color: #666; font-size: 10px; }
        .body-text { line-height: 1.55; text-align: justify; margin: 10px 0 24px; }
        .body-text p { margin: 0 0 6px; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; }
        .sig-box { border-top: 1px solid #333; padding-top: 6px; font-size: 11px; min-height: 70px; }
        .sig-label { font-weight: 700; margin-bottom: 4px; }
        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: 8px; }
        @media print { body { -webkit-print-color-adjust: exact; } }
      </style></head><body>
      ${shopHeader}
      <h1>Certificat de non-réparabilité</h1>
      <div class="subtitle">Dossier SAV n° ${escapeHtml(savCase?.case_number || '')} — ${escapeHtml(today)}</div>

      <div class="info-grid">
        <div class="block">
          <div class="block-title">Client</div>
          <div class="row"><span class="label">Nom :</span> ${escapeHtml(customerName)}</div>
          ${customer?.phone ? `<div class="row"><span class="label">Tél :</span> ${escapeHtml(customer.phone)}</div>` : ''}
          ${customer?.email ? `<div class="row"><span class="label">Email :</span> ${escapeHtml(customer.email)}</div>` : ''}
        </div>
        <div class="block">
          <div class="block-title">Appareil</div>
          <div class="row"><span class="label">Marque / Modèle :</span> ${escapeHtml(savCase?.device_brand || '')} ${escapeHtml(savCase?.device_model || '')}</div>
          ${savCase?.device_imei ? `<div class="row"><span class="label">IMEI / SN :</span> ${escapeHtml(savCase.device_imei)}</div>` : ''}
          ${savCase?.sku ? `<div class="row"><span class="label">SKU :</span> ${escapeHtml(savCase.sku)}</div>` : ''}
        </div>
      </div>

      <div class="body-text">${paragraphs}</div>

      <div class="signatures">
        <div class="sig-box"><div class="sig-label">Le technicien</div>Nom & signature</div>
        <div class="sig-box"><div class="sig-label">Le client</div>Lu et approuvé, signature</div>
      </div>

      <div class="footer">${escapeHtml(shop?.name || '')} — Document établi le ${escapeHtml(today)}</div>
      </body></html>`;

    const win = window.open('', '_blank');
    if (!win) {
      toast({ title: 'Popup bloquée', description: 'Autorisez les popups pour imprimer.', variant: 'destructive' });
      return;
    }
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <FileX2 className="h-4 w-4 mr-2 text-destructive" />
          Générer un certificat de non-réparabilité
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileX2 className="h-5 w-5 text-destructive" />
            Certificat de non-réparabilité
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Texte du certificat (modifiable avant impression)</Label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[340px] text-sm leading-relaxed font-mono"
          />
          <p className="text-xs text-muted-foreground">
            L'en-tête magasin, les coordonnées client, l'appareil et les zones de signature seront ajoutés automatiquement à l'impression.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setText(defaultText)}>Réinitialiser</Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimer / PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
