import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useStatistics } from '@/hooks/useStatistics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Euro, Wrench, Users, Clock } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const chartConfig = {
  revenue: {
    label: "Revenus",
    color: "hsl(var(--chart-1))",
  },
  expenses: {
    label: "Dépenses", 
    color: "hsl(var(--chart-2))",
  },
  profit: {
    label: "Bénéfices",
    color: "hsl(var(--chart-3))", 
  },
  sav_count: {
    label: "Nombre de SAV",
    color: "hsl(var(--chart-4))",
  },
};

export default function Statistics() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [period, setPeriod] = useState<'7d' | '30d' | '3m' | '6m' | '1y'>('30d');
  const statistics = useStatistics(period);

  const periodLabels = {
    '7d': '7 derniers jours',
    '30d': '30 derniers jours', 
    '3m': '3 derniers mois',
    '6m': '6 derniers mois',
    '1y': '1 année'
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Statistiques SAV</h1>
                <Select value={period} onValueChange={(value: '7d' | '30d' | '3m' | '6m' | '1y') => setPeriod(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(periodLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {statistics.loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <div className="animate-pulse">
                          <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                          <div className="h-8 bg-muted rounded w-1/2"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <>
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Revenus</p>
                            <p className="text-2xl font-bold">{statistics.totalRevenue.toFixed(2)}€</p>
                          </div>
                          <Euro className="h-8 w-8 text-green-500" />
                        </div>
                        <div className="flex items-center mt-2">
                          {statistics.revenueChange >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                          )}
                          <span className={`text-sm ${statistics.revenueChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {statistics.revenueChange >= 0 ? '+' : ''}{statistics.revenueChange.toFixed(1)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Dépenses</p>
                            <p className="text-2xl font-bold">{statistics.totalExpenses.toFixed(2)}€</p>
                          </div>
                          <TrendingDown className="h-8 w-8 text-red-500" />
                        </div>
                        <div className="flex items-center mt-2">
                          <span className="text-sm text-muted-foreground">
                            Coût pièces principalement
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Bénéfices</p>
                            <p className="text-2xl font-bold">{statistics.totalProfit.toFixed(2)}€</p>
                          </div>
                          <TrendingUp className="h-8 w-8 text-blue-500" />
                        </div>
                        <div className="flex items-center mt-2">
                          <span className={`text-sm ${statistics.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            Marge: {((statistics.totalProfit / (statistics.totalRevenue || 1)) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">SAV traités</p>
                            <p className="text-2xl font-bold">{statistics.totalSavCount}</p>
                          </div>
                          <Wrench className="h-8 w-8 text-purple-500" />
                        </div>
                        <div className="flex items-center mt-2">
                          <Clock className="h-4 w-4 text-muted-foreground mr-1" />
                          <span className="text-sm text-muted-foreground">
                            {statistics.avgResolutionTime} jours moyen
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Revenue vs Expenses Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Évolution revenus vs dépenses</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer config={chartConfig} className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={statistics.revenueData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" />
                              <YAxis />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Bar dataKey="revenue" fill="var(--color-revenue)" />
                              <Bar dataKey="expenses" fill="var(--color-expenses)" />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </CardContent>
                    </Card>

                    {/* SAV Status Distribution */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Répartition des statuts SAV</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer config={chartConfig} className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={statistics.savStatusData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {statistics.savStatusData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <ChartTooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Bottom Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* SAV Volume Over Time */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Volume de SAV dans le temps</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer config={chartConfig} className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={statistics.savVolumeData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" />
                              <YAxis />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Line type="monotone" dataKey="count" stroke="var(--color-sav_count)" strokeWidth={2} />
                            </LineChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </CardContent>
                    </Card>

                    {/* Top Customers */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Top 5 clients</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {statistics.topCustomers.map((customer, index) => (
                            <div key={customer.name} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mr-3">
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="font-medium">{customer.name}</p>
                                  <p className="text-sm text-muted-foreground">{customer.savCount} SAV</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">{customer.totalSpent.toFixed(2)}€</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}