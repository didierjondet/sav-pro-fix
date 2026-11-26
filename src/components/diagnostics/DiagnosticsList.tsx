import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/contexts/ShopContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { diagPublicUrl, gradeInfo } from '@/lib/diagnostics';

/** All diagnostics of the shop, searchable by IMEI/serial, with manual link to a SAV case number. */
export function DiagnosticsList() {
  const { shop } = useShop();
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [links, setLinks] = useState<Record<string, string>>({});
  const db = supabase as any;

  const load = async () => {
    if (!shop?.id) return;
    let query = db.from('device_diagnostics').select('id, public_token, brand, model, imei, serial, grade, fail_count, created_at, sav_case_id, sav_cases(case_number)')
      .eq('shop_id', shop.id).order('created_at', { ascending: false }).limit(50);
    const s = q.trim().replace(/[,()%]/g, '');
    if (s) query = query.or(`imei.ilike.%${s}%,serial.ilike.%${s}%`);
    const { data } = await query;
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [shop?.id]);

  const link = async (id: string) => {
    const num = (links[id] ?? '').trim();
    if (!num || !shop?.id) return;
    const { data: sav } = await supabase.from('sav_cases').select('id').eq('shop_id', shop.id).eq('case_number', num).maybeSingle();
    if (!sav) return toast({ title: 'SAV introuvable', description: num, variant: 'destructive' });
    const { error } = await db.from('device_diagnostics').update({ sav_case_id: sav.id }).eq('id', id);
    if (error) return toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    toast({ title: 'Diagnostic rattaché' }); load();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Diagnostics reçus</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2"><Input placeholder="Rechercher par IMEI ou n° de série" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} /><Button variant="outline" onClick={load}>Rechercher</Button></div>
        <div className="divide-y rounded-md border">
          {rows.length === 0 && <p className="p-3 text-sm text-muted-foreground">Aucun diagnostic.</p>}
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <span className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: gradeInfo(r.grade).gradient }}>{r.grade ?? '–'}</span>
              <div className="flex-1 min-w-[160px]">
                <p className="font-medium">{[r.brand, r.model].filter(Boolean).join(' ') || r.id}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString('fr-FR')} · {r.fail_count ?? 0} défaut(s) · {r.imei || r.serial || ''}</p>
              </div>
              {r.sav_cases?.case_number ? <span className="text-xs">SAV {r.sav_cases.case_number}</span> : (
                <div className="flex gap-1"><Input className="h-8 w-36 text-xs" placeholder="N° de SAV" value={links[r.id] ?? ''} onChange={(e) => setLinks({ ...links, [r.id]: e.target.value })} /><Button size="sm" variant="outline" onClick={() => link(r.id)}>Rattacher</Button></div>
              )}
              <a className="text-xs text-primary underline" href={diagPublicUrl(r.public_token)} target="_blank" rel="noreferrer">Voir le rapport</a>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
