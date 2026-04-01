import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Euro, 
  TrendingUp, 
  CreditCard,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Minus
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
}: FinanceKPIsWidgetProps) => {

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR', 
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(Math.round(value));

  const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${Math.round(value)}%`;

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const revenueGrowth = calculateGrowth(currentMonth.revenue, previousMonth.revenue);
  const expensesGrowth = calculateGrowth(currentMonth.expenses, previousMonth.expenses);
  const profitGrowth = calculateGrowth(currentMonth.profit, previousMonth.profit);
  const targetProgress = yearTarget > 0 ? Math.min((currentMonth.revenue / yearTarget) * 100, 100) : 0;
  const expenseRatio = currentMonth.revenue > 0 ? Math.round((currentMonth.expenses / currentMonth.revenue) * 100) : 0;

  const GrowthIndicator = ({ value }: { value: number }) => {
    const color = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-muted-foreground';
    const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${color}`}>
        <Icon className="w-3 h-3" />
        {formatPercent(value)}
      </span>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Euro className="w-5 h-5 text-primary" />
            KPIs Financiers
          </div>
          <Badge variant="outline" className="text-xs">Ce mois</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Main KPIs grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Revenue */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Chiffre d'affaires
              </span>
              <GrowthIndicator value={revenueGrowth} />
            </div>
            <div className="text-xl font-bold">{formatCurrency(currentMonth.revenue)}</div>
            <div className="space-y-1">
              <Progress value={targetProgress} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground">
                Objectif : {formatCurrency(yearTarget)} ({Math.round(targetProgress)}%)
              </p>
            </div>
          </div>

          {/* Expenses */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CreditCard className="w-3 h-3" />
                Dépenses pièces
              </span>
              <GrowthIndicator value={-expensesGrowth} />
            </div>
            <div className="text-xl font-bold text-destructive">{formatCurrency(currentMonth.expenses)}</div>
            <p className="text-[10px] text-muted-foreground">
              Ratio : {expenseRatio}% du CA
            </p>
          </div>

          {/* Profit */}
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <PiggyBank className="w-3 h-3" />
                Profit net
              </span>
              <GrowthIndicator value={profitGrowth} />
            </div>
            <div className="text-xl font-bold text-green-600">{formatCurrency(currentMonth.profit)}</div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Marge :</span>
              <Badge 
                variant={currentMonth.margin > 50 ? "default" : currentMonth.margin > 30 ? "secondary" : "destructive"} 
                className="text-[10px] h-4 px-1.5"
              >
                {Math.round(currentMonth.margin)}%
              </Badge>
            </div>
          </div>
        </div>

        {/* Comparison with previous month */}
        <div className="rounded-lg bg-muted/50 p-2.5">
          <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">vs. mois précédent</p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="text-muted-foreground">CA</p>
              <p className="font-semibold">{formatCurrency(previousMonth.revenue)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Dépenses</p>
              <p className="font-semibold">{formatCurrency(previousMonth.expenses)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Profit</p>
              <p className="font-semibold">{formatCurrency(previousMonth.profit)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
