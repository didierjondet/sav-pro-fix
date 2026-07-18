import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileX2, Printer, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  savCase: any;
  shop: any;
}

interface CertificateRow {
  id: string;
  content: string;
  snapshot: any;
  created_at: string;
  updated_at: string;
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

function buildSnapshot(savCase: any, shop: any) {
  const customer = savCase?.customer;
  return {
    case_number: savCase?.case_number,
    created_at: savCase?.created_at,
    device_brand: savCase?.device_brand,
    device_model: savCase?.device_model,
    device_imei: savCase?.device_imei,
    sku: savCase?.sku,
    problem_description: savCase?.problem_description,
    customer: customer ? {
      first_name: customer.first_name,
      last_name: customer.last_name,
      phone: customer.phone,
      email: customer.email,
    } : null,
    external_contact_name: savCase?.external_contact_name,
    shop: shop ? {
      name: shop.name,
      address: shop.address,
      phone: shop.phone,
      email: shop.email,
      logo_url: shop.logo_url,
      company_siret: shop.company_siret,
    } : null,
  };
}

function printCertificate(content: string, snapshot: any, toast: any) {
  const escapeHtml = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const paragraphs = content.split('\n').map(l => l.trim() === '' ? '<div style="height:8px"></div>' : `<p>${escapeHtml(l)}</p>`).join('');
  const today = format(new Date(), 'dd MMMM yyyy', { locale: fr });
  const s = snapshot?.shop || {};
  const c = snapshot?.customer;
  const customerName = c ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : (snapshot?.external_contact_name || '—');

  const shopHeader = `
    <div class="shop-header">
      ${s.logo_url ? `<img src="${s.logo_url}" alt="${escapeHtml(s.name || '')}" class="logo"/>` : ''}
      <div class="shop-info">
        <div class="shop-name">${escapeHtml(s.name || 'Magasin')}</div>
        <div class="shop-details">
          ${s.address ? escapeHtml(s.address) + '<br/>' : ''}
          ${s.phone ? 'Tél : ' + escapeHtml(s.phone) : ''}
          ${s.email ? ' • Email : ' + escapeHtml(s.email) : ''}
          ${s.company_siret ? '<br/>SIRET : ' + escapeHtml(s.company_siret) : ''}
        </div>
      </div>
    </div>`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Certificat de non-réparabilité - ${escapeHtml(snapshot?.case_number || '')}</title>
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
    <div class="subtitle">Dossier SAV n° ${escapeHtml(snapshot?.case_number || '')} — ${escapeHtml(today)}</div>

    <div class="info-grid">
      <div class="block">
        <div class="block-title">Client</div>
        <div class="row"><span class="label">Nom :</span> ${escapeHtml(customerName)}</div>
        ${c?.phone ? `<div class="row"><span class="label">Tél :</span> ${escapeHtml(c.phone)}</div>` : ''}
        ${c?.email ? `<div class="row"><span class="label">Email :</span> ${escapeHtml(c.email)}</div>` : ''}
      </div>
      <div class="block">
        <div class="block-title">Appareil</div>
        <div class="row"><span class="label">Marque / Modèle :</span> ${escapeHtml(snapshot?.device_brand || '')} ${escapeHtml(snapshot?.device_model || '')}</div>
        ${snapshot?.device_imei ? `<div class="row"><span class="label">IMEI / SN :</span> ${escapeHtml(snapshot.device_imei)}</div>` : ''}
        ${snapshot?.sku ? `<div class="row"><span class="label">SKU :</span> ${escapeHtml(snapshot.sku)}</div>` : ''}
      </div>
    </div>

    <div class="body-text">${paragraphs}</div>

    <div class="signatures">
      <div class="sig-box"><div class="sig-label">Le technicien</div>Nom & signature</div>
      <div class="sig-box"><div class="sig-label">Le client</div>Lu et approuvé, signature</div>
    </div>

    <div class="footer">${escapeHtml(s.name || '')} — Document établi le ${escapeHtml(today)}</div>
    </body></html>`;

  const win = window.open('', '_blank');
  if (!win) {
    toast({ title: 'Popup bloquée', description: 'Autorisez les popups pour imprimer.', variant: 'destructive' });
    return;
  }
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.print(); }, 400);
}

export function NonRepairabilityCertificateDialog({ savCase, shop }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const defaultText = useMemo(() => buildDefaultText(savCase), [savCase]);

  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ['sav_certificates', savCase?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sav_certificates' as any)
        .select('*')
        .eq('sav_case_id', savCase.id)
        .eq('certificate_type', 'non_repairability')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CertificateRow[];
    },
    enabled: !!savCase?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string | null; content: string }) => {
      if (id) {
        const { data, error } = await supabase
          .from('sav_certificates' as any)
          .update({ content })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data as unknown as CertificateRow;
      }
      const snapshot = buildSnapshot(savCase, shop);
      const { data, error } = await supabase
        .from('sav_certificates' as any)
        .insert({
          sav_case_id: savCase.id,
          shop_id: savCase.shop_id,
          certificate_type: 'non_repairability',
          title: `Certificat de non-réparabilité — ${savCase.case_number || ''}`,
          content,
          snapshot,
          created_by: user?.id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CertificateRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sav_certificates', savCase?.id] });
    },
    onError: (e: any) => {
      toast({ title: 'Erreur', description: e.message || 'Enregistrement impossible', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sav_certificates' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sav_certificates', savCase?.id] });
      toast({ title: 'Certificat supprimé' });
    },
    onError: (e: any) => {
      toast({ title: 'Erreur', description: e.message || 'Suppression impossible', variant: 'destructive' });
    },
  });

  const openNew = () => {
    setEditingId(null);
    setText(defaultText);
    setDialogOpen(true);
  };

  const openEdit = (cert: CertificateRow) => {
    setEditingId(cert.id);
    setText(cert.content);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const saved = await saveMutation.mutateAsync({ id: editingId, content: text });
    toast({ title: editingId ? 'Certificat mis à jour' : 'Certificat archivé' });
    setEditingId(saved.id);
    return saved;
  };

  const handleSaveAndPrint = async () => {
    const saved = await handleSave();
    printCertificate(saved.content, saved.snapshot || buildSnapshot(savCase, shop), toast);
  };

  const handlePrintExisting = (cert: CertificateRow) => {
    printCertificate(cert.content, cert.snapshot || buildSnapshot(savCase, shop), toast);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileX2 className="h-4 w-4 text-destructive" />
              Certificats de non-réparabilité
            </CardTitle>
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> Nouveau
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Chargement…
            </div>
          ) : certificates.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Aucun certificat archivé. Cliquez sur « Nouveau » pour en créer un.
            </p>
          ) : (
            <ul className="divide-y">
              {certificates.map((cert) => {
                const preview = cert.content.split('\n').find(l => l.trim()) || '';
                return (
                  <li key={cert.id} className="py-2 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(cert.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        {cert.updated_at !== cert.created_at && ' (modifié)'}
                      </div>
                      <div className="text-sm truncate">{preview}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handlePrintExisting(cert)} title="Imprimer">
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(cert)} title="Modifier">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeletingId(cert.id)} title="Supprimer">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileX2 className="h-5 w-5 text-destructive" />
              {editingId ? 'Modifier le certificat' : 'Nouveau certificat de non-réparabilité'}
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
              Le certificat est archivé automatiquement.
            </p>
          </div>
          <DialogFooter className="gap-2">
            {!editingId && (
              <Button variant="ghost" onClick={() => setText(defaultText)}>Réinitialiser</Button>
            )}
            <Button variant="outline" onClick={async () => { await handleSave(); setDialogOpen(false); }} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
            <Button onClick={async () => { await handleSaveAndPrint(); setDialogOpen(false); }} disabled={saveMutation.isPending}>
              <Printer className="h-4 w-4 mr-2" />
              Enregistrer & imprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce certificat ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le certificat archivé sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingId) deleteMutation.mutate(deletingId);
                setDeletingId(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
