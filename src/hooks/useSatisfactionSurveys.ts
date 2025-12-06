import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from './useShop';

interface SatisfactionSurvey {
  id: string;
  shop_id: string;
  sav_case_id: string | null;
  customer_id: string | null;
  access_token: string;
  rating: number | null;
  comment: string | null;
  sent_at: string;
  completed_at: string | null;
  sent_via: string;
  created_at: string;
}

interface SatisfactionBreakdown {
  stars: number;
  count: number;
  percentage: number;
  color: string;
}

interface MonthlyData {
  period: string;
  rating: number;
  reviews: number;
  response_rate: number;
}

export const useSatisfactionSurveys = () => {
  const { shop } = useShop();
  const [surveys, setSurveys] = useState<SatisfactionSurvey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shop?.id) {
      setLoading(false);
      return;
    }

    const fetchSurveys = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('satisfaction_surveys')
        .select('*')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching satisfaction surveys:', error);
      } else {
        setSurveys((data as SatisfactionSurvey[]) || []);
      }
      setLoading(false);
    };

    fetchSurveys();
  }, [shop?.id]);

  // Calculer les statistiques
  const stats = useMemo(() => {
    const completedSurveys = surveys.filter(s => s.completed_at && s.rating);
    const totalSent = surveys.length;
    const totalCompleted = completedSurveys.length;

    // Note moyenne
    const averageRating = totalCompleted > 0
      ? completedSurveys.reduce((sum, s) => sum + (s.rating || 0), 0) / totalCompleted
      : 0;

    // Taux de réponse
    const responseRate = totalSent > 0
      ? Math.round((totalCompleted / totalSent) * 100)
      : 0;

    // Répartition des étoiles
    const starCounts = [5, 4, 3, 2, 1].map(stars => {
      const count = completedSurveys.filter(s => s.rating === stars).length;
      return {
        stars,
        count,
        percentage: totalCompleted > 0 ? Math.round((count / totalCompleted) * 100) : 0,
        color: stars === 5 ? '#10b981' : stars === 4 ? '#3b82f6' : stars === 3 ? '#f59e0b' : stars === 2 ? '#ef4444' : '#dc2626'
      };
    });

    // Données mensuelles (6 derniers mois)
    const monthlyData: MonthlyData[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthSurveys = surveys.filter(s => {
        const sentDate = new Date(s.sent_at);
        return sentDate >= monthStart && sentDate <= monthEnd;
      });

      const monthCompleted = monthSurveys.filter(s => s.completed_at && s.rating);
      const monthAvg = monthCompleted.length > 0
        ? monthCompleted.reduce((sum, s) => sum + (s.rating || 0), 0) / monthCompleted.length
        : 0;

      const monthResponseRate = monthSurveys.length > 0
        ? Math.round((monthCompleted.length / monthSurveys.length) * 100)
        : 0;

      monthlyData.push({
        period: date.toLocaleString('fr-FR', { month: 'short' }).charAt(0).toUpperCase() + 
                date.toLocaleString('fr-FR', { month: 'short' }).slice(1),
        rating: Math.round(monthAvg * 10) / 10,
        reviews: monthCompleted.length,
        response_rate: monthResponseRate
      });
    }

    // Tendance (comparaison avec mois précédent)
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (monthlyData.length >= 2) {
      const current = monthlyData[monthlyData.length - 1].rating;
      const previous = monthlyData[monthlyData.length - 2].rating;
      if (current > previous + 0.1) trend = 'up';
      else if (current < previous - 0.1) trend = 'down';
    }

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: totalCompleted,
      responseRate,
      satisfactionBreakdown: starCounts,
      monthlyData,
      trend
    };
  }, [surveys]);

  return {
    surveys,
    loading,
    ...stats
  };
};
