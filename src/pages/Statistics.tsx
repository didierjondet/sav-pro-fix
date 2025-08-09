import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStatistics } from '@/hooks/useStatistics';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, Legend } from 'recharts';
import { Medal, Trophy, Award } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
export default function Statistics() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [period, setPeriod] = useState<'7d' | '30d' | '3m' | '6m' | '1y'>('30d');
  const navigate = useNavigate();
  const {
    revenue,
    expenses,
    profit,
    savStats,
    partsStats,
    takeoverStats,
    revenueChart,
    savCountChart,
    completedSavChart,
    lateRateChart,
    profitabilityChart,
    topParts,
    topDevices,
    savStatusDistribution,
    loading
  } = useStatistics(period);

  // SEO basics
  if (typeof document !== 'undefined') {
    document.title = 'Statistiques SAV | Tableau de bord';
    const metaDesc = document.querySelector("meta[name='description']") || document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    metaDesc.setAttribute('content', 'Statistiques SAV: chiffre d\'affaires, dépenses, profit, volume et état des dossiers.');
    document.head.appendChild(metaDesc);
    const canonical = document.querySelector("link[rel='canonical']") || document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', `${window.location.origin}/statistics`);
    document.head.appendChild(canonical);
  }

  const formatCurrency = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v || 0);

  const getPodiumIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (index === 1) return <Medal className="w-6 h-6 text-gray-400" />;
    if (index === 2) return <Award className="w-6 h-6 text-amber-600" />;
    return <div className="w-6 h-6 flex items-center justify-center text-lg font-bold text-muted-foreground">{index + 1}</div>;
  };

  const getPodiumBg = (index: number) => {
    if (index === 0) return "bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200";
    if (index === 1) return "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200";
    if (index === 2) return "bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200";
    return "bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <h1 className="text-2xl font-bold">Statistiques SAV</h1>
                <div className="w-full sm:w-56">
                  <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
                    <SelectTrigger aria-label="Période">
                      <SelectValue placeholder="Période" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">7 derniers jours</SelectItem>
                      <SelectItem value="30d">30 jours</SelectItem>
                      <SelectItem value="3m">3 mois</SelectItem>
                      <SelectItem value="6m">6 mois</SelectItem>
                      <SelectItem value="1y">1 an</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* KPI Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card onClick={() => navigate(`/stats/revenue?period=${period}`)} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>Chiffre d'affaires</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold">{formatCurrency(revenue)}</p>
                  </CardContent>
                </Card>

                <Card onClick={() => navigate(`/stats/expenses?period=${period}`)} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>Dépenses (pièces)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold">{formatCurrency(expenses)}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Profit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold">{formatCurrency(profit)}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Prises en charge</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">Montant total</div>
                    <div className="text-2xl font-semibold">{formatCurrency(takeoverStats.amount)}</div>
                    <div className="text-sm text-muted-foreground mt-1">Nombre de SAV</div>
                    <div className="text-lg">{takeoverStats.count}</div>
                  </CardContent>
                </Card>
              </div>

              {/* SAV Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle>SAV & Durée</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">Total SAV</div>
                    <div className="text-2xl font-semibold">{savStats.total}</div>
                    <div className="text-sm text-muted-foreground mt-1">Temps moyen</div>
                    <div className="text-lg">{savStats.averageTime} h</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Taux de retard</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">SAV en retard</div>
                    <div className="text-3xl font-semibold text-destructive">{savStats.lateRate.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground mt-1">Basé sur les délais configurés</div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Rentabilité</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ChartContainer
                      config={{
                        revenue: { label: "Revenus", color: "hsl(var(--primary))" },
                        expenses: { label: "Dépenses", color: "hsl(var(--muted-foreground))" },
                        profit: { label: "Profit", color: "hsl(var(--secondary))" }
                      }}
                      className="h-72"
                    >
                      <LineChart data={profitabilityChart}>
                        <XAxis dataKey="date" tickLine={false} axisLine={false} />
                        <YAxis tickFormatter={(v) => `${v/1000}k`} tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="expenses" stroke="var(--color-expenses)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="profit" stroke="var(--color-profit)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>SAV terminés</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ChartContainer
                      config={{ completed: { label: "SAV terminés", color: "hsl(var(--secondary))" } }}
                      className="h-72"
                    >
                      <BarChart data={completedSavChart}>
                        <XAxis dataKey="date" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="completed" fill="var(--color-completed)" radius={4} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top pièces utilisées</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ChartContainer
                      config={{ quantity: { label: "Quantité", color: "hsl(var(--primary))" } }}
                      className="h-72"
                    >
                      <BarChart data={topParts}>
                        <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={60} />
                        <YAxis tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="quantity" fill="var(--color-quantity)" radius={4} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Évolution du taux de retard</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ChartContainer
                      config={{ lateRate: { label: "Taux de retard (%)", color: "hsl(var(--destructive))" } }}
                      className="h-72"
                    >
                      <LineChart data={lateRateChart}>
                        <XAxis dataKey="date" tickLine={false} axisLine={false} />
                        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="lateRate" stroke="var(--color-lateRate)" strokeWidth={2} dot={true} />
                      </LineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>🏆 Podium des téléphones</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {topDevices.slice(0, 5).map((device, index) => (
                        <div 
                          key={`${device.brand}-${device.model}`}
                          className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${getPodiumBg(index)}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getPodiumIcon(index)}
                              <div>
                                <div className="font-semibold text-foreground">
                                  {device.brand}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {device.model}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-foreground">
                                {device.count}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                réparations
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {topDevices.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>Aucune donnée de téléphone disponible</p>
                          <p className="text-sm">Les données apparaîtront quand des SAV avec marque/modèle seront créés</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
