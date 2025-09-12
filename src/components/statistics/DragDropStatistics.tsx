import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, Legend } from 'recharts';
import { Medal, Trophy, Award } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useStatistics } from '@/hooks/useStatistics';
import { useStatisticsConfig, StatisticModule } from '@/hooks/useStatisticsConfig';
import { DraggableStatisticsWidget } from './DraggableStatisticsWidget';

interface DragDropStatisticsProps {
  period: '7d' | '30d' | '3m' | '6m' | '1y';
  onPeriodChange: (period: '7d' | '30d' | '3m' | '6m' | '1y') => void;
}

export const DragDropStatistics = ({ period, onPeriodChange }: DragDropStatisticsProps) => {
  const navigate = useNavigate();
  const { modules, reorderModules } = useStatisticsConfig();
  const [sortedModules, setSortedModules] = useState<StatisticModule[]>([]);
  
  const {
    revenue,
    expenses,
    profit,
    savStats,
    takeoverStats,
    profitabilityChart,
    completedSavChart,
    topParts,
    topDevices,
    lateRateChart,
    loading
  } = useStatistics(period);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const enabledModules = modules.filter(m => m.enabled).sort((a, b) => a.order - b.order);
    setSortedModules(enabledModules);
  }, [modules]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedModules.findIndex(m => m.id === active.id);
      const newIndex = sortedModules.findIndex(m => m.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(sortedModules, oldIndex, newIndex);
        setSortedModules(newOrder);
        
        // Mettre à jour l'ordre dans la configuration complète
        const updatedModules = modules.map(module => {
          const newOrderItem = newOrder.find(no => no.id === module.id);
          if (newOrderItem) {
            return { ...module, order: newOrder.indexOf(newOrderItem) };
          }
          return module;
        });
        
        reorderModules(updatedModules);
      }
    }
  };

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

  const renderWidget = (module: StatisticModule) => {
    const baseProps = {
      id: module.id,
      title: module.name,
      isEnabled: module.enabled
    };

    switch (module.id) {
      case 'kpi-revenue':
        return (
          <DraggableStatisticsWidget {...baseProps}>
            <div 
              onClick={() => navigate(`/stats/revenue?period=${period}`)}
              className="cursor-pointer hover:bg-accent/20 p-2 rounded transition-colors"
            >
              <p className="text-3xl font-semibold">{formatCurrency(revenue)}</p>
            </div>
          </DraggableStatisticsWidget>
        );

      case 'kpi-expenses':
        return (
          <DraggableStatisticsWidget {...baseProps}>
            <div 
              onClick={() => navigate(`/stats/expenses?period=${period}`)}
              className="cursor-pointer hover:bg-accent/20 p-2 rounded transition-colors"
            >
              <p className="text-3xl font-semibold">{formatCurrency(expenses)}</p>
            </div>
          </DraggableStatisticsWidget>
        );

      case 'kpi-profit':
        return (
          <DraggableStatisticsWidget {...baseProps}>
            <p className="text-3xl font-semibold">{formatCurrency(profit)}</p>
          </DraggableStatisticsWidget>
        );

      case 'kpi-takeover':
        return (
          <DraggableStatisticsWidget {...baseProps}>
            <div className="text-sm text-muted-foreground">Montant total</div>
            <div className="text-2xl font-semibold">{formatCurrency(takeoverStats.amount)}</div>
            <div className="text-sm text-muted-foreground mt-1">Nombre de SAV</div>
            <div className="text-lg">{takeoverStats.count}</div>
          </DraggableStatisticsWidget>
        );

      case 'sav-stats':
        return (
          <DraggableStatisticsWidget {...baseProps}>
            <div className="text-sm text-muted-foreground">Total SAV</div>
            <div className="text-2xl font-semibold">{savStats.total}</div>
            <div className="text-sm text-muted-foreground mt-1">Temps moyen</div>
            <div className="text-lg">{savStats.averageTime} h</div>
          </DraggableStatisticsWidget>
        );

      case 'late-rate':
        return (
          <DraggableStatisticsWidget {...baseProps}>
            <div className="text-sm text-muted-foreground">SAV en retard</div>
            <div className="text-3xl font-semibold text-destructive">{savStats.lateRate.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground mt-1">Basé sur les délais configurés</div>
          </DraggableStatisticsWidget>
        );

      case 'profitability-chart':
        return (
          <DraggableStatisticsWidget {...baseProps} className="lg:col-span-1">
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
          </DraggableStatisticsWidget>
        );

      case 'completed-sav-chart':
        return (
          <DraggableStatisticsWidget {...baseProps} className="lg:col-span-1">
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
          </DraggableStatisticsWidget>
        );

      case 'top-parts-chart':
        return (
          <DraggableStatisticsWidget {...baseProps} className="lg:col-span-1">
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
          </DraggableStatisticsWidget>
        );

      case 'late-rate-chart':
        return (
          <DraggableStatisticsWidget {...baseProps} className="lg:col-span-1">
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
          </DraggableStatisticsWidget>
        );

      case 'top-devices':
        return (
          <DraggableStatisticsWidget {...baseProps} className="lg:col-span-1">
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
          </DraggableStatisticsWidget>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Statistiques SAV</h1>
        <div className="w-full sm:w-56">
          <Select value={period} onValueChange={onPeriodChange}>
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

      {/* DnD Context for reorderable widgets */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortedModules.map(m => m.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedModules.map((module) => (
              <div key={module.id} className={
                module.id.includes('chart') || module.id === 'top-devices' 
                  ? 'sm:col-span-2 lg:col-span-2 xl:col-span-2' 
                  : ''
              }>
                {renderWidget(module)}
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {sortedModules.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            <p className="text-lg mb-2">Aucun module activé</p>
            <p className="text-sm">
              Activez des modules dans les paramètres d'apparence pour voir vos statistiques ici.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};