import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from './useShop';
import { useShopSAVTypes } from './useShopSAVTypes';
import { useShopSAVStatuses } from './useShopSAVStatuses';
import { startOfYear, endOfMonth, startOfMonth, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getClosureDate, isClosedLate, getMaxProcessingDays } from '@/lib/lateRate';


interface MonthlyLateRateData {
  month: number;
  monthLabel: string;
  lateRate: number;
  lateCount: number;
  totalCount: number;
}

export function useMonthlyLateRate(year?: number) {
  const { shop } = useShop();
  const { types: shopSavTypes } = useShopSAVTypes();
  const { statuses: shopSavStatuses } = useShopSAVStatuses();
  const [data, setData] = useState<MonthlyLateRateData[]>([]);
  const [loading, setLoading] = useState(true);

  const currentYear = year || new Date().getFullYear();

  useEffect(() => {
    const fetchData = async () => {
      if (!shop?.id) return;

      setLoading(true);

      try {
        const yearStart = startOfYear(new Date(currentYear, 0, 1));
        const now = new Date();
        const currentMonth = now.getMonth();
        const isCurrentYear = currentYear === now.getFullYear();

        // Récupérer tous les SAV pouvant être clôturés cette année
        // (buffer de 90j sur created_at pour ne pas manquer les SAV ouverts fin N-1 et clôturés en janvier N)
        const fetchStart = new Date(yearStart.getTime() - 90 * 24 * 60 * 60 * 1000);
        const { data: savCases, error } = await supabase
          .from('sav_cases')
          .select('id, case_number, created_at, updated_at, status, sav_type, closure_history')
          .eq('shop_id', shop.id)
          .gte('created_at', fetchStart.toISOString())
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Identifier les types exclus des statistiques
        const excludedTypes = (shopSavTypes || [])
          .filter(t => t.exclude_from_stats)
          .map(t => t.type_key);

        // Identifier les statuts finaux
        const finalStatusKeys = (shopSavStatuses || [])
          .filter(s => s.is_final_status)
          .map(s => s.status_key);
        
        if (finalStatusKeys.length === 0) {
          finalStatusKeys.push('ready', 'pret_et_cloture', 'cancelled', 'delivered');
        }

        // Fonction pour obtenir les jours max de traitement (helper partagé)
        const getMaxDays = (savType: string): number =>
          getMaxProcessingDays(savType, shopSavTypes);

        // Calculer le taux de retard pour chaque mois
        const monthlyData: MonthlyLateRateData[] = [];
        const monthsToProcess = isCurrentYear ? currentMonth + 1 : 12;

        for (let month = 0; month < monthsToProcess; month++) {
          const monthStart = startOfMonth(new Date(currentYear, month, 1));
          const monthEnd = endOfMonth(monthStart);

          // Filtrer les SAV CLÔTURÉS dans ce mois (date de clôture dans le mois)
          // Attribution = mois de clôture (et plus mois de création).
          const closedSavsThisMonth = (savCases || []).filter((sav: any) => {
            if (excludedTypes.includes(sav.sav_type)) return false;
            const maxDays = getMaxDays(sav.sav_type);
            if (maxDays === 0) return false;
            if (!finalStatusKeys.includes(sav.status)) return false;

            const closureDate = getClosureDate(sav);
            return closureDate >= monthStart && closureDate <= monthEnd;
          });

          // Calculer les retards parmi les SAV clôturés ce mois (helper partagé)
          let lateCount = 0;
          closedSavsThisMonth.forEach((sav: any) => {
            const maxDays = getMaxDays(sav.sav_type);
            if (isClosedLate(sav, maxDays)) {
              lateCount++;
            }
          });


          const totalCount = closedSavsThisMonth.length;
          const lateRate = totalCount > 0 ? (lateCount / totalCount) * 100 : 0;

          monthlyData.push({
            month: month + 1,
            monthLabel: format(monthStart, 'MMM', { locale: fr }),
            lateRate: Math.round(lateRate * 10) / 10,
            lateCount,
            totalCount
          });
        }

        setData(monthlyData);
      } catch (err) {
        console.error('Error fetching monthly late rate:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [shop?.id, currentYear, shopSavTypes, shopSavStatuses]);

  return { data, loading, year: currentYear };
}
