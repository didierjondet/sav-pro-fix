import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Printer, AlertTriangle, Smartphone, BatteryMedium, ClipboardCheck } from 'lucide-react';
import { gradeInfo, maskImei } from '@/lib/diagnostics';

type Test = { id?: string; name?: string; group?: string; status?: string; value?: unknown; note?: string };

const STATUS: Record<string, { label: string; cls: string }> = {
  pass: { label: 'OK', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  fail: { label: 'Défaut', cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
};
const statusOf = (s?: string) => STATUS[s ?? ''] ?? { label: 'Non testé', cls: 'bg-muted text-muted-foreground' };

export default function PublicDiagnostic() {
  const { token } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Rapport de diagnostic';
    (supabase as any).rpc('get_public_diagnostic', { p_token: token ?? '' })
      .then(({ data }: any) => { setData(data ?? null); setLoading(false); });
  }, [token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!data) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="text-5xl font-bold text-muted-foreground">404</p>
      <p className="text-lg font-medium">Rapport introuvable</p>
      <p className="text-sm text-muted-foreground">Ce lien de diagnostic n'existe pas ou n'est plus disponible.</p>
    </div>
  );

  const p = data.payload ?? {};
  const device = p.device ?? {}, summary = p.summary ?? {}, report = p.report ?? {};
  const tests: Test[] = Array.isArray(p.tests) ? p.tests : [];
  const g = gradeInfo(data.grade);
  const failed: string[] = Array.isArray(summary.failed) && summary.failed.length
    ? summary.failed : tests.filter((t) => t.status === 'fail').map((t) => t.name ?? t.id ?? '');
  const groups = tests.reduce<Record<string, Test[]>>((acc, t) => { const k = t.group || 'Autres'; (acc[k] ||= []).push(t); return acc; }, {});
  const passCount = summary.pass ?? tests.filter((t) => t.status === 'pass').length;
  const failCount = summary.fail ?? failed.length;
  const shop = data.shop ?? {};
  const row = (label: string, v: unknown) => v || v === 0 ? (
    <div className="flex justify-between gap-4 py-1.5 border-b last:border-0 text-sm"><span className="text-muted-foreground">{label}</span><span className="font-medium text-right break-all">{String(v)}</span></div>
  ) : null;

  return (
    <div className="min-h-screen bg-muted/30 print:bg-background">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {shop.logo_url && <img src={shop.logo_url} alt={shop.name} className="h-12 w-12 object-contain rounded" />}
            <div className="min-w-0">
              <p className="font-semibold truncate">{shop.name}</p>
              <p className="text-xs text-muted-foreground truncate">{[shop.address, shop.phone].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => window.print()} className="print:hidden"><Printer className="h-4 w-4 mr-1" />Imprimer / PDF</Button>
        </header>

        <section className="rounded-xl bg-foreground text-background p-5 sm:p-6 flex flex-wrap items-center gap-5 print:border">
          <div className="h-24 w-24 rounded-2xl flex items-center justify-center text-5xl font-black text-white shrink-0" style={{ background: g.gradient }}>{data.grade ?? '–'}</div>
          <div className="flex-1 min-w-[180px]">
            <p className="text-xl font-bold">{[device.brand, device.model].filter(Boolean).join(' ') || 'Appareil'}</p>
            <p className="text-sm opacity-75">{[device.os, device.type].filter(Boolean).join(' · ')}</p>
            <p className="mt-1 font-semibold">{g.label}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center w-full sm:w-auto">
            <div><p className="text-2xl font-bold">{passCount}</p><p className="text-xs opacity-75">Tests OK</p></div>
            <div><p className="text-2xl font-bold">{failCount}</p><p className="text-xs opacity-75">Défauts</p></div>
            <div><p className="text-2xl font-bold">{data.score ?? '–'}%</p><p className="text-xs opacity-75">Score</p></div>
          </div>
        </section>

        {failed.length > 0 && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
            <p className="font-semibold text-destructive flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Défauts détectés</p>
            <ul className="mt-2 list-disc pl-5 text-sm space-y-0.5">{failed.map((f, i) => <li key={i}>{f}</li>)}</ul>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Smartphone className="h-4 w-4" />Identification</CardTitle></CardHeader>
            <CardContent>{row('Modèle', [device.brand, device.model].filter(Boolean).join(' '))}{row('Référence', device.model_code)}{row('OS', device.os)}{row('N° de série', device.serial)}{row('IMEI', maskImei(device.imei))}{row('Stockage', device.storage_gb ? `${device.storage_gb} Go` : null)}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><BatteryMedium className="h-4 w-4" />Batterie</CardTitle></CardHeader>
            <CardContent>{row('Santé', device.battery_health != null ? `${device.battery_health} %` : null)}{row('Cycles', device.battery_cycles)}</CardContent></Card>
        </div>

        {Object.keys(groups).length > 0 && (
          <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-4 w-4" />Tests réalisés</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(groups).map(([grp, list]) => (
                <div key={grp} className="break-inside-avoid">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{grp}</p>
                  {list.map((t, i) => { const s = statusOf(t.status); return (
                    <div key={i} className="flex items-center justify-between gap-3 py-1.5 border-b last:border-0 text-sm">
                      <span>{t.name ?? t.id}{t.note && <span className="text-muted-foreground"> — {t.note}</span>}</span>
                      <span className="flex items-center gap-2 shrink-0">{t.value != null && t.value !== '' && <span className="text-muted-foreground">{String(t.value)}</span>}<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span></span>
                    </div>); })}
                </div>
              ))}
            </CardContent></Card>
        )}

        {report.notes && <Card><CardHeader className="pb-2"><CardTitle className="text-base">Observations du technicien</CardTitle></CardHeader><CardContent className="text-sm whitespace-pre-wrap">{report.notes}</CardContent></Card>}

        <footer className="text-xs text-muted-foreground text-center space-y-0.5 pb-6">
          <p>Rapport n° {data.id} · {new Date(data.created_at).toLocaleString('fr-FR')}{data.technician ? ` · Technicien : ${data.technician}` : ''}</p>
          {data.ticket && <p>Dossier : {data.ticket}</p>}
        </footer>
      </div>
    </div>
  );
}
