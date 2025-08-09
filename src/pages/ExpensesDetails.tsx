import { useMemo, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/hooks/useShop';
import { format, subDays, subMonths, startOfDay, endOfDay } from 'date-fns';

type Period = '7d' | '30d' | '3m' | '6m' | '1y';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function ExpensesDetails() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const query = useQuery();
  const initialPeriod = (query.get('period') as Period) || '30d';
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const { shop } = useShop();

  const getDateRange = () => {
    const end = new Date();
    let start: Date;
    switch (period) {
      case '7d': start = subDays(end, 7); break;
      case '30d': start = subDays(end, 30); break;
      case '3m': start = subMonths(end, 3); break;
      case '6m': start = subMonths(end, 6); break;
      case '1y': start = subMonths(end, 12); break;
      default: start = subDays(end, 30);
    }
    return { start: startOfDay(start), end: endOfDay(end) };
  };

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shop?.id) return;
    const fetchData = async () => {
      setLoading(true);
      const { start, end } = getDateRange();
      const { data, error } = await supabase
        .from('sav_cases')
        .select('id, case_number, created_at, sav_parts(*, part:parts(*))')
        .eq('shop_id', shop.id)
        .eq('status', 'ready')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });
      if (error) { console.error(error); setLoading(false); return; }
      const list: any[] = [];
      (data || []).forEach((c: any) => {
        (c.sav_parts || []).forEach((sp: any) => {
          const unit = Number(sp.part?.purchase_price) || 0;
          const qty = sp.quantity || 0;
          list.push({
            sav_id: c.id,
            date: format(new Date(c.created_at), 'dd/MM/yyyy'),
            case_number: c.case_number,
            part_name: sp.part?.name || 'Pièce',
            part_reference: sp.part?.reference || '',
            quantity: qty,
            unit_purchase_price: unit,
            total_cost: unit * qty,
          });
        });
      });
      setRows(list);
      setLoading(false);
    };
    fetchData();
  }, [shop?.id, period]);

  // SEO basics
  if (typeof document !== 'undefined') {
    document.title = 'Détails des dépenses (pièces) | Statistiques';
    const metaDesc = document.querySelector("meta[name='description']") || document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    metaDesc.setAttribute('content', 'Liste des pièces utilisées (SAV prêts) sur la période.');
    document.head.appendChild(metaDesc);
    const canonical = document.querySelector("link[rel='canonical']") || document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', `${window.location.origin}/stats/expenses`);
    document.head.appendChild(canonical);
  }

  const totals = rows.reduce((acc, r) => ({
    qty: acc.qty + (r.quantity || 0),
    cost: acc.cost + (r.total_cost || 0),
  }), { qty: 0, cost: 0 });

  const fmt = (v:number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v||0);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Dépenses: pièces utilisées</h1>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Période: {period}</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div>Chargement…</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th className="py-2">Date</th>
                            <th className="py-2">Dossier</th>
                            <th className="py-2">Pièce</th>
                            <th className="py-2">Référence</th>
                            <th className="py-2">Qté</th>
                            <th className="py-2">Prix achat</th>
                            <th className="py-2">Coût total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="py-2">{r.date}</td>
                              <td className="py-2">{r.case_number}</td>
                              <td className="py-2">{r.part_name}</td>
                              <td className="py-2">{r.part_reference}</td>
                              <td className="py-2">{r.quantity}</td>
                              <td className="py-2">{fmt(r.unit_purchase_price)}</td>
                              <td className="py-2">{fmt(r.total_cost)}</td>
                            </tr>
                          ))}
                          <tr className="border-t font-medium">
                            <td className="py-2" colSpan={4}>Total</td>
                            <td className="py-2">{totals.qty}</td>
                            <td className="py-2"></td>
                            <td className="py-2">{fmt(totals.cost)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
