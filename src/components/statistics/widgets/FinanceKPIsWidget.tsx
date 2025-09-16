import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Euro, 
  TrendingUp, 
  TrendingDown, 
  Target,
  CreditCard,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface MonthlyFinanceData {
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  takeoverAmount: number;
  takeoverCount: number;
  growth: number;
  target: number;
}

interface FinanceKPIsWidgetProps {
  currentMonth: MonthlyFinanceData;
  previousMonth: MonthlyFinanceData;
  yearTarget: number;
  monthProgress: number;
}

export const FinanceKPIsWidget = ({
  currentMonth,
  previousMonth,
  yearTarget,
  monthProgress
}: FinanceKPIsWidgetProps) => {

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', notation: 'compact' }).format(value);

  const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <ArrowUpRight className="w-3 h-3" />;
    if (growth < 0) return <ArrowDownRight className="w-3 h-3" />;
    return <TrendingUp className="w-3 h-3" />;
  };

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const revenueGrowth = calculateGrowth(currentMonth.revenue, previousMonth.revenue);
  const expensesGrowth = calculateGrowth(currentMonth.expenses, previousMonth.expenses);
  const profitGrowth = calculateGrowth(currentMonth.profit, previousMonth.profit);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Euro className="w-4 h-4" />
            KPIs Financiers
          </div>
          <Badge variant="outline" className="text-xs">
            Ce mois
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Revenus */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Chiffre d'affaires
            </span>
            <div className={`flex items-center gap-1 text-xs ${getGrowthColor(revenueGrowth)}`}>
              {getGrowthIcon(revenueGrowth)}
              {formatPercent(revenueGrowth)}
            </div>
          </div>
          <div className="text-lg font-bold">{formatCurrency(currentMonth.revenue)}</div>
          <Progress 
            value={Math.min((currentMonth.revenue / yearTarget) * 100, 100)} 
            className="h-1" 
          />
          <div className="text-xs text-muted-foreground">
            Objectif: {formatCurrency(yearTarget)} ({((currentMonth.revenue / yearTarget) * 100).toFixed(1)}%)
          </div>
        </div>

        {/* Dépenses */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              Dépenses pièces
            </span>
            <div className={`flex items-center gap-1 text-xs ${getGrowthColor(-expensesGrowth)}`}>
              {getGrowthIcon(expensesGrowth)}
              {formatPercent(expensesGrowth)}
            </div>
          </div>
          <div className="text-lg font-bold text-destructive">{formatCurrency(currentMonth.expenses)}</div>
          <div className="text-xs text-muted-foreground">
            Ratio: {((currentMonth.expenses / currentMonth.revenue) * 100).toFixed(1)}% du CA
          </div>
        </div>

        {/* Profit */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <PiggyBank className="w-3 h-3" />
              Profit net
            </span>
            <div className={`flex items-center gap-1 text-xs ${getGrowthColor(profitGrowth)}`}>
              {getGrowthIcon(profitGrowth)}
              {formatPercent(profitGrowth)}
            </div>
          </div>
          <div className="text-lg font-bold text-success">{formatCurrency(currentMonth.profit)}</div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Marge:</span>
            <Badge variant={currentMonth.margin > 50 ? "default" : currentMonth.margin > 30 ? "secondary" : "destructive"}>
              {currentMonth.margin.toFixed(1)}%
            </Badge>
          </div>
        </div>

        {/* Prises en charge */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Target className="w-3 h-3" />
              Prises en charge
            </span>
            <Badge variant="outline" className="text-xs">
              {currentMonth.takeoverCount} SAV
            </Badge>
          </div>
          <div className="text-lg font-bold">{formatCurrency(currentMonth.takeoverAmount)}</div>
          <div className="text-xs text-muted-foreground">
            Moyenne: {formatCurrency(currentMonth.takeoverAmount / currentMonth.takeoverCount)} / SAV
          </div>
        </div>
      </CardContent>
    </Card>
  );
};