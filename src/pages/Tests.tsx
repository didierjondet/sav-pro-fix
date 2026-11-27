import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Gamepad2, Printer, FileText, Trash2, Smartphone, ExternalLink } from 'lucide-react';
import { ControllerTestDialog, type ControllerTestResult } from '@/components/sav/controller/ControllerTestDialog';
import { DiagnosticsList } from '@/components/diagnostics/DiagnosticsList';
import { DiagStationDownloads } from '@/components/diagnostics/DiagStationDownloads';
import { printControllerSheet } from '@/lib/controllerPrint';
import { buildControllerSummary, summaryToText, type ControllerReport } from '@/lib/controllerTest';

interface Row { id: string; brand: string | null; model: string | null; serial: string | null; report: ControllerReport; sav_case_id: string | null; created_at: string; sav_cases?: { case_number: string } | null }

export default function Tests() {
  const { shop } = useShop();
  const { toast } = useToast();
  const navigate = useNavigate();
  const db = supabase as any;
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [testOpen, setTestOpen] = useState(false);
  const [pending, setPending] = useState<ControllerTestResult | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!shop?.id) return;
    const { data } = await db.from('controller_tests').select('id, brand, model, serial, report, sav_case_id, created_at, sav_cases(case_number)')
      .eq('shop_id', shop.id).order('created_at', { ascending: false }).limit(200);
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [shop?.id]);

  const save = async (r: ControllerTestResult): Promise<Row | null> => {
    if (!shop?.id) return null;
    const { data, error } = await db.from('controller_tests').insert({
      shop_id: shop.id, brand: r.brand || null, model: r.model || null, serial: r.serial || r.report.serial || null, report: r.report,
    }).select('id, brand, model, serial, report, sav_case_id, created_at').single();
    if (error) { toast({ title: 'Erreur', description: error.message, variant: 'destructive' }); return null; }
    return data;
  };

  const toSAV = (row: Row) => navigate('/sav/new', { state: { mode: 'computer', controllerTest: {
    id: row.id, report: row.report, brand: row.brand, model: row.model, serial: row.serial, problemDescription: summaryToText(row.report),
  } } });

  const finish = async (mode: 'print' | 'sav') => {
    if (!pending) return;
    setSaving(true);
    const row = await save(pending);
    setSaving(false);
    if (!row) return;
    setPending(null);
    if (mode === 'print') { printControllerSheet(row.report, { imei: row.serial }); toast({ title: 'Test sauvegardé' }); load(); }
    else toSAV(row);
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer ce test ?')) return;
    await db.from('controller_tests').delete().eq('id', id); load();
  };

  const s = q.trim().toLowerCase();
  const shown = s ? rows.filter((r) => [r.serial, r.model, r.brand].some((v) => v?.toLowerCase().includes(s))) : rows;

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Tests</h1>
        <Tabs defaultValue="controllers">
          <TabsList>
            <TabsTrigger value="controllers"><Gamepad2 className="h-4 w-4 mr-1" />Manettes</TabsTrigger>
            <TabsTrigger value="diags"><Smartphone className="h-4 w-4 mr-1" />Diags</TabsTrigger>
          </TabsList>
          <TabsContent value="controllers" className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setTestOpen(true)}><Gamepad2 className="h-4 w-4 mr-1" />Nouveau test manette</Button>
              <Input className="max-w-xs" placeholder="Rechercher n° de série ou modèle" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {shown.length === 0 && <p className="text-sm text-muted-foreground">Aucun test sauvegardé.</p>}
            {shown.map((r) => {
              const defects = buildControllerSummary(r.report);
              return (
                <Card key={r.id}>
                  <CardContent className="p-3 flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <div className="font-medium">{[r.brand, r.model].filter(Boolean).join(' ') || 'Manette'}</div>
                      <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString('fr-FR')}{r.serial ? ` · N° ${r.serial}` : ''}</div>
                      <div className="text-xs mt-1">{defects.length ? defects.slice(0, 3).join(' · ') : 'Aucun défaut'}</div>
                    </div>
                    {r.sav_cases?.case_number && <Badge variant="secondary">SAV {r.sav_cases.case_number}</Badge>}
                    <Button size="sm" variant="outline" onClick={() => printControllerSheet(r.report, { imei: r.serial, caseNumber: r.sav_cases?.case_number })}><Printer className="h-4 w-4 mr-1" />Imprimer</Button>
                    {r.sav_case_id
                      ? <Button size="sm" variant="outline" onClick={() => navigate(`/sav/${r.sav_case_id}`)}><ExternalLink className="h-4 w-4 mr-1" />Ouvrir le SAV</Button>
                      : <Button size="sm" onClick={() => toSAV(r)}><FileText className="h-4 w-4 mr-1" />Transformer en SAV</Button>}
                    <Button size="icon" variant="ghost" aria-label="Supprimer" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
          <TabsContent value="diags" className="space-y-4">
            <DiagStationDownloads />
            <DiagnosticsList />
          </TabsContent>
        </Tabs>
      </div>
      <ControllerTestDialog open={testOpen} onOpenChange={setTestOpen} onComplete={(r) => setPending(r)} />
      <Dialog open={!!pending} onOpenChange={(o) => { if (!o) setPending(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test terminé</DialogTitle>
            <DialogDescription>Que voulez-vous faire de ce test ?</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button disabled={saving} variant="outline" onClick={() => finish('print')}><Printer className="h-4 w-4 mr-1" />Imprimer et sauvegarder</Button>
            <Button disabled={saving} onClick={() => finish('sav')}><FileText className="h-4 w-4 mr-1" />Transformer en SAV</Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
