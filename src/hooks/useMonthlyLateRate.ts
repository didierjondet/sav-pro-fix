import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from './useShop';
import { useShopSAVTypes } from './useShopSAVTypes';
import { useShopSAVStatuses } from './useShopSAVStatuses';
import { startOfYear, endOfMonth, startOfMonth, format, getDaysInMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

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

        // Récupérer tous les SAV de l'année
        const { data: savCases, error } = await supabase
          .from('sav_cases')
          .select('id, case_number, created_at, updated_at, status, sav_type')
          .eq('shop_id', shop.id)
          .gte('created_at', yearStart.toISOString())
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Identifier les types exclus des statistiques
        const excludedTypes = (shopSavTypes || [])
          .filter(t => t.exclude_from_stats)
          .map(t => t.type_key);

        // Identifier les statuts finaux (prêt, annulé, livré)
        const finalStatusKeys = (shopSavStatuses || [])
          .filter(s => s.is_final_status)
          .map(s => s.status_key);
        
        // Fallback si aucun statut final trouvé
        if (finalStatusKeys.length === 0) {
          finalStatusKeys.push('ready', 'cancelled', 'delivered');
        }

        // Identifier les statuts qui mettent le timer en pause
        const pauseTimerStatuses = (shopSavStatuses || [])
          .filter(s => s.pause_timer)
          .map(s => s.status_key);

        // Fonction pour obtenir les jours max de traitement
        const getMaxProcessingDays = (savType: string): number => {
          const typeConfig = (shopSavTypes || []).find(t => t.type_key === savType);
          if (typeConfig?.max_processing_days) return typeConfig.max_processing_days;
          // Valeurs par défaut
          if (savType.toLowerCase().includes('interne')) return 0;
          return 7;
        };

        // Calculer le taux de retard pour chaque mois
        const monthlyData: MonthlyLateRateData[] = [];
        const monthsToProcess = isCurrentYear ? currentMonth + 1 : 12;

        for (let month = 0; month < monthsToProcess; month++) {
          const monthStart = startOfMonth(new Date(currentYear, month, 1));
          const monthEnd = endOfMonth(monthStart);

          // Pour le mois en cours, utiliser la date actuelle
          const evaluationDate = (isCurrentYear && month === currentMonth) 
            ? now 
            : monthEnd;

          // Filtrer les SAV actifs à la fin du mois (créés avant la fin du mois et pas encore fermés à cette date)
          const activeSavsAtEndOfMonth = (savCases || []).filter((sav: any) => {
            const createdAt = new Date(sav.created_at);
            const updatedAt = new Date(sav.updated_at);
            
            // Exclure les types exclus des stats
            if (excludedTypes.includes(sav.sav_type)) return false;
            
            // Le SAV doit avoir été créé avant ou pendant ce mois
            if (createdAt > monthEnd) return false;
            
            // Vérifier si le SAV était encore actif à la fin du mois
            // Un SAV est considéré fermé s'il a un statut final ET que la date de mise à jour est avant la fin du mois
            const isFinalStatus = finalStatusKeys.includes(sav.status);
            const wasClosedBeforeMonthEnd = isFinalStatus && updatedAt <= monthEnd;
            
            // Si le SAV est fermé avant la fin du mois, ne pas le compter
            if (wasClosedBeforeMonthEnd) return false;
            
            // Vérifier si le timer est en pause
            if (pauseTimerStatuses.includes(sav.status)) return false;
            
            return true;
          });

          // Calculer les retards
          let lateCount = 0;
          activeSavsAtEndOfMonth.forEach((sav: any) => {
            const maxDays = getMaxProcessingDays(sav.sav_type);
            if (maxDays === 0) return; // SAV internes ignorés
            
            const createdAt = new Date(sav.created_at);
            const deadline = new Date(createdAt);
            deadline.setDate(deadline.getDate() + maxDays);
            
            if (evaluationDate > deadline) {
              lateCount++;
            }
          });

          const totalCount = activeSavsAtEndOfMonth.length;
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
