import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from './useShop';
import { useShopSAVTypes } from './useShopSAVTypes';
import { useShopSAVStatuses } from './useShopSAVStatuses';
import { useWidgetConfiguration } from './useWidgetConfiguration';
import {
  buildLateRateBuckets,
  computeLateRateBuckets,
  getRangeForPeriod,
  LatePeriodKey,
  LateRateBucket,
} from '@/lib/lateRate';

function temporalityToPeriod(t?: string | null): LatePeriodKey {
  switch (t) {
    case 'monthly': return '30d';
    case 'monthly_calendar': return '1m_calendar';
    case 'quarterly': return '3m';
    case 'yearly': return '1y';
    default: return '1m_calendar';
  }
}

export function useLateRateChart(widgetId: string) {
  const { shop } = useShop();
  const { types: shopSavTypes } = useShopSAVTypes();
  const { statuses: shopSavStatuses } = useShopSAVStatuses();
  const { config } = useWidgetConfiguration(widgetId);

  const period = temporalityToPeriod(config?.temporality);
  const [data, setData] = useState<LateRateBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!shop?.id) return;
      setLoading(true);

      try {
        // Période globale couvrant tous les buckets, + buffer pour récupérer
        // les SAV créés avant mais clôturés dans la période.
        const { start, end } = getRangeForPeriod(period);
        const maxCfgDays = Math.max(60, ...((shopSavTypes || []).map((t: any) => t.max_processing_days || 0)));
        const fetchStart = new Date(start.getTime() - (maxCfgDays + 30) * 24 * 60 * 60 * 1000);

        const { data: savCases, error } = await supabase
          .from('sav_cases')
          .select('id, case_number, created_at, updated_at, status, sav_type, closure_history')
          .eq('shop_id', shop.id)
          .gte('updated_at', fetchStart.toISOString())
          .lte('updated_at', end.toISOString());

        if (error) throw error;

        const buckets = computeLateRateBuckets(savCases || [], period, {
          shopSavTypes,
          shopSavStatuses,
          savStatusesFilter: config?.sav_statuses_filter ?? null,
          savTypesFilter: config?.sav_types_filter ?? null,
        });

        setData(buckets);
      } catch (err) {
        console.error('Error fetching late rate chart:', err);
        setData(buildLateRateBuckets(period).map((b) => ({
          ...b, lateCount: 0, totalCount: 0, lateRate: 0,
        })));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [shop?.id, period, shopSavTypes, shopSavStatuses, config?.sav_statuses_filter, config?.sav_types_filter]);

  return { data, loading, period };
}
