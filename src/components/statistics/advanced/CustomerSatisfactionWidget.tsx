import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Star, TrendingUp, ThumbsUp, MessageCircle } from 'lucide-react';

interface SatisfactionData {
  period: string;
  rating: number;
  reviews: number;
  response_rate: number;
}

interface SatisfactionBreakdown {
  stars: number;
  count: number;
  percentage: number;
  color: string;
}

interface CustomerSatisfactionWidgetProps {
  satisfactionData: SatisfactionData[];
  satisfactionBreakdown: SatisfactionBreakdown[];
  averageRating: number;
  totalReviews: number;
  responseRate: number;
  trend: 'up' | 'down' | 'stable';
}

export const CustomerSatisfactionWidget = ({
  satisfactionData,
  satisfactionBreakdown,
  averageRating,
  totalReviews,
  responseRate,
  trend
}: CustomerSatisfactionWidgetProps) => {

  const formatRating = (rating: number) => rating.toFixed(1);

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
      default: return <TrendingUp className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const chartConfig = {
    rating: {
      label: "Note moyenne",
      color: "hsl(var(--primary))",
    },
    reviews: {
      label: "Nombre d'avis",
      color: "hsl(var(--secondary))",
    },
    response_rate: {
      label: "Taux de réponse",
      color: "hsl(var(--accent))",
    },
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            Satisfaction client
          </div>
          <Badge variant="outline" className={`flex items-center gap-1 ${getTrendColor()}`}>
            {getTrendIcon()}
            {formatRating(averageRating)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* KPIs principaux */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="w-3 h-3 text-yellow-500" />
              <span className="text-lg font-bold">{formatRating(averageRating)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Note moyenne</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <MessageCircle className="w-3 h-3" />
              <span className="text-lg font-bold">{totalReviews}</span>
            </div>
            <p className="text-xs text-muted-foreground">Avis totaux</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <ThumbsUp className="w-3 h-3" />
              <span className="text-lg font-bold">{responseRate}%</span>
            </div>
            <p className="text-xs text-muted-foreground">Taux réponse</p>
          </div>
        </div>

        {/* Répartition des étoiles */}
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Répartition des notes</h4>
          <div className="space-y-2">
            {satisfactionBreakdown.map((item) => (
              <div key={item.stars} className="flex items-center gap-2">
                <div className="flex items-center gap-1 w-12">
                  <span className="text-xs">{item.stars}</span>
                  <Star className="w-3 h-3 text-yellow-500" />
                </div>
                <Progress value={item.percentage} className="flex-1 h-2" />
                <span className="text-xs text-muted-foreground w-10 text-right">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Graphique d'évolution */}
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Évolution</h4>
          <ChartContainer config={chartConfig} className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={satisfactionData}>
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="rating" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};