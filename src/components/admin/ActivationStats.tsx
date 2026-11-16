import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download } from 'lucide-react';
import { ANSWER_LABELS, SIGNUP_QUESTIONS, BLOCKER_REASONS } from '@/lib/activationFeedback';
import { buildFunnel, FunnelShop } from '@/lib/activationFunnel';

interface Feedback { id: string; shop_id: string | null; kind: string; answers: Record<string, string>; comment: string | null; created_at: string }

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)} %` : '—');
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

function csv(rows: (string | number)[][]) {
  const blob = new Blob(['\ufeff' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'inscriptions-fixway.csv'; a.click();
}

export function ActivationStats() {
  const [days, setDays] = useState('180');
  const [search, setSearch] = useState('');

  const { data: shops = [] } = useQuery({
    queryKey: ['activation-funnel'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_activation_funnel' as any);
      if (error) throw error;
      return (data ?? []) as FunnelShop[];
    },
  });
  const { data: feedback = [] } = useQuery({
    queryKey: ['activation-feedback-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('onboarding_feedback' as any).select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Feedback[];
    },
  });

  const since = Date.now() - Number(days) * 86400000;
  const scoped = shops.filter((s) => new Date(s.created_at).getTime() >= since);
  const funnel = buildFunnel(scoped);
  const scopedIds = new Set(scoped.map((s) => s.shop_id));
  const fb = feedback.filter((f) => f.shop_id && scopedIds.has(f.shop_id));
  const byShop = useMemo(() => {
    const m = new Map<string, Feedback[]>();
    feedback.forEach((f) => { if (f.shop_id) m.set(f.shop_id, [...(m.get(f.shop_id) ?? []), f]); });
    return m;
  }, [feedback]);

  const distrib = (kind: string, key: string, options: readonly { value: string; label: string }[]) => {
    const rows = fb.filter((f) => f.kind === kind);
    return options.map((o) => ({ label: o.label, n: rows.filter((r) => r.answers?.[key] === o.value).length, total: rows.length }));
  };

  const months = useMemo(() => {
    const m = new Map<string, FunnelShop[]>();
    scoped.forEach((s) => { const k = s.created_at.slice(0, 7); m.set(k, [...(m.get(k) ?? []), s]); });
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [scoped]);

  const list = scoped.filter((s) => !search || `${s.shop_name} ${s.owner_email}`.toLowerCase().includes(search.toLowerCase()));
  const summary = (s: FunnelShop) => (byShop.get(s.shop_id) ?? []).map((f) =>
    Object.values(f.answers ?? {}).map((v) => ANSWER_LABELS[v] ?? v).join(', ') + (f.comment ? ` — « ${f.comment} »` : '')).join(' | ');

  const exportCsv = () => csv([
    ['Magasin', 'E-mail', 'Inscription', 'Clients', 'SAV', 'Devis', 'SMS', 'Revenu J+1', 'Revenu J+7', 'Abonné', 'Réponses'],
    ...list.map((s) => [s.shop_name, s.owner_email, fmt(s.created_at), s.customers, s.savs, s.quotes, s.sms, s.returned_d1 ? 'oui' : 'non', s.returned_d7 ? 'oui' : 'non', s.subscribed ? 'oui' : 'non', summary(s)]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Inscriptions & conversion</h2>
          <p className="text-sm text-muted-foreground">Où les nouveaux magasins s'arrêtent, et ce qu'ils répondent au questionnaire.</p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 derniers jours</SelectItem>
            <SelectItem value="90">90 derniers jours</SelectItem>
            <SelectItem value="180">6 derniers mois</SelectItem>
            <SelectItem value="3650">Depuis le début</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle>Entonnoir d'activation</CardTitle><CardDescription>{funnel[0].n} magasins inscrits sur la période</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {funnel.map((st) => (
            <div key={st.key} className="flex items-center gap-3 text-sm">
              <div className="w-48 shrink-0">{st.label}</div>
              <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${funnel[0].n ? (st.n / funnel[0].n) * 100 : 0}%` }} />
              </div>
              <div className="w-28 text-right tabular-nums">{st.n} · {pct(st.n, funnel[0].n)}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { title: 'Pourquoi ils ne démarrent pas', rows: distrib('blocker', 'reason', BLOCKER_REASONS) },
          ...SIGNUP_QUESTIONS.map((q) => ({ title: q.label, rows: distrib('signup', q.key, q.options) })),
        ].map((b) => (
          <Card key={b.title}>
            <CardHeader className="pb-2"><CardTitle className="text-base">{b.title}</CardTitle><CardDescription>{b.rows[0]?.total ?? 0} réponses</CardDescription></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {b.rows.map((r) => (
                <div key={r.label} className="flex justify-between"><span>{r.label}</span><span className="tabular-nums">{r.n} · {pct(r.n, r.total)}</span></div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Par mois d'inscription</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Mois</TableHead><TableHead>Inscrits</TableHead><TableHead>1er SAV</TableHead><TableHead>Revenus J+7</TableHead><TableHead>Abonnés</TableHead></TableRow></TableHeader>
            <TableBody>
              {months.map(([m, rows]) => (
                <TableRow key={m}>
                  <TableCell>{m}</TableCell><TableCell>{rows.length}</TableCell>
                  <TableCell>{pct(rows.filter((r) => r.savs > 0).length, rows.length)}</TableCell>
                  <TableCell>{pct(rows.filter((r) => r.returned_d7).length, rows.length)}</TableCell>
                  <TableCell>{pct(rows.filter((r) => r.subscribed).length, rows.length)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Magasins et réponses</CardTitle>
          <div className="flex gap-2">
            <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export</Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Magasin</TableHead><TableHead>Inscrit le</TableHead><TableHead>Clients</TableHead><TableHead>SAV</TableHead><TableHead>Devis</TableHead><TableHead>Dernière connexion</TableHead><TableHead>Abonné</TableHead><TableHead>Réponses au questionnaire</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {list.map((s) => (
                <TableRow key={s.shop_id}>
                  <TableCell><div className="font-medium">{s.shop_name}</div><div className="text-xs text-muted-foreground">{s.owner_email}</div></TableCell>
                  <TableCell>{fmt(s.created_at)}</TableCell><TableCell>{s.customers}</TableCell><TableCell>{s.savs}</TableCell><TableCell>{s.quotes}</TableCell>
                  <TableCell>{fmt(s.last_sign_in_at)}</TableCell><TableCell>{s.subscribed ? 'Oui' : 'Non'}</TableCell>
                  <TableCell className="text-xs max-w-md">{summary(s) || <span className="text-muted-foreground">Aucune réponse</span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
