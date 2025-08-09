import { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/hooks/useShop';
import { format, subDays, subMonths, startOfDay, endOfDay } from 'date-fns';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

type Period = '7d' | '30d' | '3m' | '6m' | '1y';

export default function RevenueDetails() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
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
        .select('*, customer:customers(*), sav_parts(*, part:parts(*))')
        .eq('shop_id', shop.id)
        .eq('status', 'ready')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });
      if (error) { console.error(error); setLoading(false); return; }
      const list = (data || []).map((c: any) => {
        // coûts & revenus calculés comme dans useStatistics
        let cost = 0; let revenue = 0;
        (c.sav_parts || []).forEach((sp: any) => {
          const partCost = (Number(sp.part?.purchase_price) || 0) * (sp.quantity || 0);
          const partRevenue = (Number(sp.unit_price ?? sp.part?.selling_price) || 0) * (sp.quantity || 0);
          cost += partCost; revenue += partRevenue;
        });
        if (c.partial_takeover && c.takeover_amount) {
          const rawRatio = Number(c.takeover_amount) / (Number(c.total_cost) || 1);
          const ratio = Math.min(1, Math.max(0, rawRatio));
          revenue = cost + (revenue - cost) * (1 - ratio);
        } else if (c.taken_over) {
          revenue = cost;
        }
        return {
          id: c.id,
          date: format(new Date(c.created_at), 'dd/MM/yyyy'),
          case_number: c.case_number,
          customer: c.customer ? `${c.customer.first_name} ${c.customer.last_name}` : 'Client',
          cost,
          revenue,
          profit: revenue - cost,
        };
      });
      setRows(list);
      setLoading(false);
    };
    fetchData();
  }, [shop?.id, period]);

  // SEO basics
  if (typeof document !== 'undefined') {
    document.title = 'Détails du chiffre d\'affaires | Statistiques';
    const metaDesc = document.querySelector("meta[name='description']") || document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    metaDesc.setAttribute('content', 'Dossiers SAV (prêt) contribuant au chiffre d\'affaires.');
    document.head.appendChild(metaDesc);
    const canonical = document.querySelector("link[rel='canonical']") || document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', `${window.location.origin}/statistics/revenue`);
    document.head.appendChild(canonical);
  }

  const total = rows.reduce((acc, r) => ({
    cost: acc.cost + r.cost,
    revenue: acc.revenue + r.revenue,
    profit: acc.profit + r.profit,
  }), { cost: 0, revenue: 0, profit: 0 });

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
                <h1 className="text-2xl font-bold">Dossiers contribuant au chiffre d'affaires</h1>
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
                            <th className="py-2">Client</th>
                            <th className="py-2">Coût</th>
                            <th className="py-2">CA</th>
                            <th className="py-2">Profit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map(r => (
                            <tr key={r.id} className="border-t">
                              <td className="py-2">{r.date}</td>
                              <td className="py-2">{r.case_number}</td>
                              <td className="py-2">{r.customer}</td>
                              <td className="py-2">{fmt(r.cost)}</td>
                              <td className="py-2">{fmt(r.revenue)}</td>
                              <td className="py-2">{fmt(r.profit)}</td>
                            </tr>
                          ))}
                          <tr className="border-t font-medium">
                            <td className="py-2" colSpan={3}>Total</td>
                            <td className="py-2">{fmt(total.cost)}</td>
                            <td className="py-2">{fmt(total.revenue)}</td>
                            <td className="py-2">{fmt(total.profit)}</td>
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
