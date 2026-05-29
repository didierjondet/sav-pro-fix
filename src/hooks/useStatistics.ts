import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from './useShop';
import { format, subDays, subMonths, startOfDay, endOfDay, startOfMonth } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { getClosureDate, isClosedLate, getMaxProcessingDays } from '@/lib/lateRate';

interface ProductCategoryRevenue {
  category: string;
  revenue: number;
  count: number;
  percentage: number;
  color: string;
}

interface StatisticsData {
  revenue: number;
  expenses: number;
  profit: number;
  savStats: {
    total: number;
    averageTime: number;
    averageProcessingDays: number;
    lateRate: number;
  };
  partsStats: {
    totalUsed: number;
    averageCost: number;
  };
  takeoverStats: {
    amount: number;
    count: number;
  };
  revenueChart: Array<{ date: string; revenue: number }>;
  savCountChart: Array<{ date: string; count: number }>;
  completedSavChart: Array<{ date: string; completed: number }>;
  lateRateChart: Array<{ date: string; lateRate: number }>;
  profitabilityChart: Array<{ date: string; revenue: number; expenses: number; profit: number }>;
  topParts: Array<{ name: string; quantity: number; revenue: number }>;
  topDevices: Array<{ model: string; brand: string; count: number }>;
  savStatusDistribution: Array<{ name: string; value: number }>;
  revenueByProductCategory: ProductCategoryRevenue[];
  loading: boolean;
}

interface StatisticsFilters {
  savStatuses?: string[] | null;
  savTypes?: string[] | null;
}

export function useStatistics(
  period: '7d' | '30d' | '1m_calendar' | '3m' | '6m' | '1y',
  filters?: StatisticsFilters
): StatisticsData {
  const { shop } = useShop();
  const [data, setData] = useState<Omit<StatisticsData, 'loading'>>({
    revenue: 0,
    expenses: 0,
    profit: 0,
    savStats: { total: 0, averageTime: 0, averageProcessingDays: 0, lateRate: 0 },
    partsStats: { totalUsed: 0, averageCost: 0 },
    takeoverStats: { amount: 0, count: 0 },
    revenueChart: [],
    savCountChart: [],
    completedSavChart: [],
    lateRateChart: [],
    profitabilityChart: [],
    topParts: [],
    topDevices: [],
    savStatusDistribution: [],
    revenueByProductCategory: []
  });
  const [loading, setLoading] = useState(true);

  const getDateRange = () => {
    const end = new Date();
    let start: Date;
    
    switch (period) {
      case '7d':
        start = subDays(end, 7);
        break;
      case '30d':
        start = subDays(end, 30);
        break;
      case '1m_calendar':
        start = startOfMonth(end);
        break;
      case '3m':
        start = subMonths(end, 3);
        break;
      case '6m':
        start = subMonths(end, 6);
        break;
      case '1y':
        start = subMonths(end, 12);
        break;
      default:
        start = subDays(end, 30);
    }
    
    return { start: startOfDay(start), end: endOfDay(end) };
  };

  // Fonction de catégorisation intelligente des produits
  const categorizeDevice = (brand: string, model: string): string => {
    const brandUpper = (brand || '').toUpperCase().trim();
    const modelUpper = (model || '').toUpperCase().trim();
    const combined = `${brandUpper} ${modelUpper}`;
    
    // ===== CONSOLES DE JEUX =====
    if (['MICROSOFT', 'XBOX', 'NINTENDO'].includes(brandUpper)) return 'Consoles';
    if (brandUpper === 'SONY' && (modelUpper.includes('PS') || modelUpper.includes('PLAYSTATION') || modelUpper.includes('DUALSENSE') || modelUpper.includes('DUALSHOCK'))) {
      return 'Consoles';
    }
    if (combined.match(/PS[345]|XBOX|SWITCH|NINTENDO|PLAYSTATION|CONSOLE|MANETTE|DUALSENSE|DUALSHOCK|JOY-?CON/i)) {
      return 'Consoles';
    }
    
    // ===== INFORMATIQUE (PC, Laptops, Tours, Accessoires PC) =====
    // Marques informatique pures
    const pcBrands = ['TOSHIBA', 'HP', 'LENOVO', 'DELL', 'ASUS', 'ACER', 'MSI', 'GIGABYTE', 'RAZER', 
                      'CORSAIR', 'LOGITECH', 'COOLER MASTER', 'NZXT', 'THERMALTAKE', 'OMEN', 'ALIENWARE',
                      'PREDATOR', 'REPUBLIC OF GAMERS', 'ROG', 'STEELSERIES', 'HYPERX', 'ROCCAT',
                      'EVGA', 'ZOTAC', 'SAPPHIRE', 'ASROCK', 'BIOSTAR', 'PALIT', 'PNY', 'INNO3D'];
    if (pcBrands.includes(brandUpper)) {
      return 'Informatique';
    }
    
    // Modèles Mac (informatique)
    if (modelUpper.match(/MACBOOK|IMAC|MAC MINI|MAC PRO|MAC STUDIO/)) return 'Informatique';
    
    // Mots-clés informatique génériques
    if (combined.match(/PC|LAPTOP|NOTEBOOK|TOUR|GAMER|PROBOOK|IDEAPAD|VIVOBOOK|THINKPAD|PAVILION|INSPIRON|ORDINATEUR|DESKTOP|CLAVIER|SOURIS|ECRAN|MONITEUR|CARTE GRAPHIQUE|GPU|CPU|PROCESSEUR|RAM|SSD|HDD|DISQUE DUR|ALIMENTATION|BOITIER|VENTILATEUR|WATERCOOLING|GAMING PC|TOUR GAMER|STATION|WORKSTATION/i)) {
      return 'Informatique';
    }
    
    // ===== TABLETTES =====
    if (modelUpper.match(/IPAD|GALAXY TAB|TAB S\d|TAB A\d|SURFACE|TABLETTE|MEDIAPAD|MATEPAD/i)) return 'Tablettes';
    
    // ===== TÉLÉPHONES =====
    // Marques téléphones
    const phoneBrands = ['APPLE', 'SAMSUNG', 'HUAWEI', 'XIAOMI', 'OPPO', 'GOOGLE', 'ONEPLUS', 
                         'HONOR', 'REALME', 'VIVO', 'MOTOROLA', 'NOKIA', 'LG', 'WIKO', 'FAIRPHONE',
                         'NOTHING', 'POCO', 'REDMI', 'INFINIX', 'TECNO', 'ZTE', 'ALCATEL', 'DORO',
                         'CROSSCALL', 'BLACKVIEW', 'CUBOT', 'UMIDIGI', 'OUKITEL'];
    
    // OnePlus (marque "ONE" ou "ONEPLUS")
    if (brandUpper === 'ONE' || brandUpper === 'ONEPLUS' || combined.includes('ONEPLUS')) {
      return 'Téléphones';
    }
    
    // iPhones - Patterns courants
    if (modelUpper.match(/IPHONE|^[0-9]+ PRO|^XS|^XR|^X$|^SE$|^MINI$|^PRO MAX$/i)) {
      if (brandUpper === 'APPLE' || brandUpper === '') return 'Téléphones';
    }
    
    // Samsung - distinguer téléphones des tablettes
    if (brandUpper === 'SAMSUNG') {
      if (modelUpper.match(/TAB|TABLETTE/i)) return 'Tablettes';
      if (modelUpper.match(/GALAXY|^S\d|^A\d|^M\d|^F\d|^Z FOLD|^Z FLIP|NOTE|ULTRA/i)) return 'Téléphones';
    }
    
    // Autres marques téléphones
    if (phoneBrands.includes(brandUpper)) {
      // Vérifier que ce n'est pas un PC ou tablette
      if (!modelUpper.match(/MACBOOK|IMAC|IPAD|TAB|PC|LAPTOP/i)) {
        return 'Téléphones';
      }
    }
    
    // Mots-clés téléphones génériques
    if (modelUpper.match(/GALAXY S|GALAXY A|GALAXY M|GALAXY Z|REDMI|PIXEL|MATE|XPERIA|PHONE|SMARTPHONE|POCO|FIND X|RENO|MI \d|NOTE \d/i)) {
      return 'Téléphones';
    }
    
    // ===== AUTRES =====
    return 'Autres';
  };

  // Couleurs pour les catégories de produits
  const categoryColors: Record<string, string> = {
    'Téléphones': 'hsl(217, 91%, 60%)', // Bleu
    'Informatique': 'hsl(142, 71%, 45%)', // Vert
    'Consoles': 'hsl(32, 95%, 50%)', // Orange
    'Tablettes': 'hsl(270, 70%, 60%)', // Violet
    'Autres': 'hsl(220, 9%, 46%)' // Gris
  };

  const normalizeDeviceName = (brand: string, model: string) => {
    // Normaliser la marque (garder en majuscules comme dans les données)
    const normalizedBrand = (brand || 'MARQUE INCONNUE')
      .toUpperCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Supprimer les caractères spéciaux
      .replace(/\s+/g, ' '); // Normaliser les espaces

    // Normaliser le modèle (garder en majuscules comme dans les données)
    let normalizedModel = (model || 'MODÈLE INCONNU')
      .toUpperCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Supprimer les caractères spéciaux
      .replace(/\s+/g, '') // Supprimer tous les espaces pour la comparaison
      .replace(/IPHONE(\d+)/g, 'IPHONE$1') // Standardiser "IPHONE 12" -> "IPHONE12"
      .replace(/SAMSUNG(\w+)/g, 'SAMSUNG$1') // Standardiser "SAMSUNG GALAXY" -> "SAMSUNGGALAXY"
      .replace(/GALAXY(\w+)/g, 'GALAXY$1'); // Standardiser "GALAXY S21" -> "GALAXYS21"

    return {
      normalizedKey: `${normalizedBrand}_${normalizedModel}`,
      displayBrand: brand || 'Marque inconnue',
      displayModel: model || 'Modèle inconnu'
    };
  };

  useEffect(() => {
    if (!shop?.id) return;

    const fetchStatistics = async () => {
      setLoading(true);
      try {
      const { start, end } = getDateRange();

      // Récupérer les types SAV avec leurs délais configurés et exclusions granulaires
      const { data: shopSavTypes, error: typesError } = await supabase
        .from('shop_sav_types')
        .select('type_key, max_processing_days, exclude_from_stats, exclude_purchase_costs, exclude_sales_revenue')
        .eq('shop_id', shop.id)
        .eq('is_active', true);

      if (typesError) throw typesError;

      // Calculer les listes de types exclus (séparément pour coûts et revenus)
      const excludeFromPurchaseCosts = (shopSavTypes || [])
        .filter(t => t.exclude_purchase_costs || t.exclude_from_stats)
        .map(t => t.type_key);
      
      const excludeFromSalesRevenue = (shopSavTypes || [])
        .filter(t => t.exclude_sales_revenue || t.exclude_from_stats)
        .map(t => t.type_key);

      // Types exclus complètement (les deux exclus = pas de calcul du tout)
      const excludedFromStatsTypes = (shopSavTypes || [])
        .filter(t => t.exclude_from_stats || (t.exclude_purchase_costs && t.exclude_sales_revenue))
        .map(t => t.type_key);

      // Récupérer les statuts SAV avec pause_timer + is_final_status
      const { data: shopSavStatuses, error: statusesError } = await supabase
        .from('shop_sav_statuses')
        .select('status_key, pause_timer, is_final_status, include_in_metrics')
        .eq('shop_id', shop.id)
        .eq('is_active', true);

      if (statusesError) throw statusesError;

      // Statuts à inclure dans les métriques (CA, marge, dépenses)
      const metricsStatusKeysRaw = (shopSavStatuses || [])
        .filter(s => s.include_in_metrics)
        .map(s => s.status_key);
      const metricsStatusKeys = metricsStatusKeysRaw.length > 0
        ? metricsStatusKeysRaw
        : ['ready', 'pret_et_cloture'];

      // Récupérer les SAV de la période (par created_at)
      const { data: savCasesRaw, error: savError } = await supabase
        .from('sav_cases')
        .select(`
          *,
          customer:customers(*),
          sav_parts(*, part:parts(*))
        `)
        .eq('shop_id', shop.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (savError) throw savError;

      // Récupérer les SAV CLÔTURÉS dont la date de clôture tombe dans la période
      // (peuvent avoir été créés bien avant). Buffer large sur created_at.
      const maxCfgDays = Math.max(60, ...((shopSavTypes || []).map(t => t.max_processing_days || 0)));
      const closedFetchStart = new Date(start.getTime() - (maxCfgDays + 30) * 24 * 60 * 60 * 1000);
      const finalStatusKeys = (shopSavStatuses || [])
        .filter(s => s.is_final_status)
        .map(s => s.status_key);
      const effectiveFinalStatuses = finalStatusKeys.length > 0
        ? finalStatusKeys
        : ['ready', 'pret_et_cloture', 'cancelled', 'delivered'];

      const { data: closedSavRaw, error: closedSavError } = await supabase
        .from('sav_cases')
        .select('id, case_number, sav_type, status, created_at, updated_at, closure_history')
        .eq('shop_id', shop.id)
        .in('status', effectiveFinalStatuses)
        .gte('updated_at', closedFetchStart.toISOString())
        .lte('updated_at', end.toISOString());

      if (closedSavError) throw closedSavError;

        // Appliquer les filtres de configuration (statuts / types SAV)
        const savCases = (savCasesRaw || []).filter((savCase: any) => {
          const statusOk =
            !filters?.savStatuses ||
            filters.savStatuses.length === 0 ||
            filters.savStatuses.includes(savCase.status);
          const typeOk =
            !filters?.savTypes ||
            filters.savTypes.length === 0 ||
            filters.savTypes.includes(savCase.sav_type);
          return statusOk && typeOk;
        });

        // Séparer les SAV pour les calculs financiers (statuts marqués include_in_metrics)
        // et pour les retards (tous les SAV actifs, hors types exclus)
        const readySavCases = (savCases || []).filter((c: any) => 
          metricsStatusKeys.includes(c.status) && !excludedFromStatsTypes.includes(c.sav_type)
        );
        const activeSavCases = (savCases || []).filter((c: any) => 
          !metricsStatusKeys.includes(c.status) && c.status !== 'delivered' && c.status !== 'cancelled' && !excludedFromStatsTypes.includes(c.sav_type)
        );
        const completedSavCases = (savCases || []).filter((c: any) => 
          c.status === 'delivered' && !excludedFromStatsTypes.includes(c.sav_type)
        );

        console.log('🔍 Debug stats - Types excluant coûts:', excludeFromPurchaseCosts);
        console.log('🔍 Debug stats - Types excluant revenus:', excludeFromSalesRevenue);
        console.log('🔍 Debug stats - Total SAV récupérés:', savCases?.length || 0);
        console.log('🔍 Debug stats - SAV actifs (hors exclus):', activeSavCases.length);
        console.log('🔍 Debug stats - SAV ready (hors exclus):', readySavCases.length);

        // Calculer les revenus et dépenses
        let totalRevenue = 0;
        let totalExpenses = 0;
        let totalTimeMinutes = 0;
        let savWithTimeCount = 0;
        let takeoverAmount = 0;
        let takeoverCount = 0;
        let lateCount = 0;
        const statusCounts: Record<string, number> = {};
        const partsUsage: Record<string, { quantity: number; revenue: number; name: string }> = {};
        const deviceUsage: Record<string, { model: string; brand: string; count: number }> = {};
        const productCategoryData: Record<string, { revenue: number; count: number }> = {};
        const dailyData: Record<string, { revenue: number; expenses: number; count: number; completed: number; lateCount: number; activeCount: number }> = {};

        const currentDate = new Date();
        console.log('🔍 Debug retard - Date actuelle:', currentDate.toISOString());

        // Calculer les données journalières pour tous les SAV (actifs et ready)
        (savCases || []).forEach((savCase: any) => {
          const dateKey = format(new Date(savCase.created_at), 'yyyy-MM-dd');
          if (!dailyData[dateKey]) {
            dailyData[dateKey] = { revenue: 0, expenses: 0, count: 0, completed: 0, lateCount: 0, activeCount: 0 };
          }
        });

        // Compter les SAV terminés par jour
        completedSavCases.forEach((savCase: any) => {
          const dateKey = format(new Date(savCase.created_at), 'yyyy-MM-dd');
          if (dailyData[dateKey]) {
            dailyData[dateKey].completed++;
          }
        });

        // Périmètre commun pour rankings (top téléphones + top pièces) :
        // tous les SAV de la période, hors types exclus et hors annulés.
        const trackedSavCases = (savCases || []).filter((c: any) =>
          !excludedFromStatsTypes.includes(c.sav_type) && c.status !== 'cancelled'
        );

        // Tracking des téléphones les plus réparés
        trackedSavCases.forEach((savCase: any) => {
          if (savCase.device_brand || savCase.device_model) {
            const { normalizedKey, displayBrand, displayModel } = normalizeDeviceName(
              savCase.device_brand,
              savCase.device_model
            );
            if (!deviceUsage[normalizedKey]) {
              deviceUsage[normalizedKey] = { model: displayModel, brand: displayBrand, count: 0 };
            }
            deviceUsage[normalizedKey].count++;
          }

          // Tracking des pièces les plus utilisées (même périmètre que le podium téléphones)
          const excludeRevenue = excludeFromSalesRevenue.includes(savCase.sav_type);
          savCase.sav_parts?.forEach((savPart: any) => {
            const partKey = savPart.part?.name || savPart.custom_part_name;
            if (!partKey) return;
            const partRevenue = (savPart.unit_price || savPart.part?.selling_price || 0) * savPart.quantity;
            if (!partsUsage[partKey]) {
              partsUsage[partKey] = { quantity: 0, revenue: 0, name: partKey };
            }
            partsUsage[partKey].quantity += savPart.quantity;
            if (!excludeRevenue) partsUsage[partKey].revenue += partRevenue;
          });
        });

        // Calculer le temps total pour tous les SAV non exclus qui ont un temps > 0
        (savCases || []).forEach((savCase: any) => {
          if (!excludedFromStatsTypes.includes(savCase.sav_type) && savCase.total_time_minutes && savCase.total_time_minutes > 0) {
            totalTimeMinutes += savCase.total_time_minutes;
            savWithTimeCount++;
          }
        });

        // Fonction pour obtenir les jours de traitement par défaut
        const getDefaultProcessingDays = (savType: string): number => {
          switch (savType) {
            case 'internal': return 0; // Pas de calcul de retard pour SAV internes
            case 'external': return 7;
            case 'client': return 7;
            default: return 7;
          }
        };

        // === NOUVEAU TAUX DE RETARD ===
        // Logique : SAV CLÔTURÉS dont la date de clôture est dans la période
        // (attribution = mois de clôture). Late si (closure - created) > max_processing_days.
        const closedInPeriod = (closedSavRaw || []).filter((c: any) => {
          if (excludedFromStatsTypes.includes(c.sav_type)) return false;
          const maxDays = getMaxProcessingDays(c.sav_type, shopSavTypes);
          if (maxDays === 0) return false;
          const closureDate = getClosureDate(c);
          return closureDate >= start && closureDate <= end;
        });

        let totalClosedForRate = 0;
        closedInPeriod.forEach((sav: any) => {
          totalClosedForRate++;
          const maxDays = getMaxProcessingDays(sav.sav_type, shopSavTypes);
          const closureDate = getClosureDate(sav);
          const dateKey = format(closureDate, 'yyyy-MM-dd');
          if (!dailyData[dateKey]) {
            dailyData[dateKey] = { revenue: 0, expenses: 0, count: 0, completed: 0, lateCount: 0, activeCount: 0 };
          }
          dailyData[dateKey].activeCount++;
          if (isClosedLate(sav, maxDays)) {
            dailyData[dateKey].lateCount++;
            lateCount++;
          }
        });

        readySavCases.forEach((savCase: any) => {
          // Calculer le coût total des pièces avec exclusions granulaires
          let caseCost = 0;
          let caseRevenue = 0;
          
          // Vérifier si ce type exclut les coûts ou revenus
          const excludeCosts = excludeFromPurchaseCosts.includes(savCase.sav_type);
          const excludeRevenue = excludeFromSalesRevenue.includes(savCase.sav_type);

          savCase.sav_parts?.forEach((savPart: any) => {
            const partCost = (savPart.purchase_price ?? savPart.part?.purchase_price ?? 0) * savPart.quantity;
            const partRevenue = (savPart.unit_price || savPart.part?.selling_price || 0) * savPart.quantity;
            if (!excludeCosts) caseCost += partCost;
            if (!excludeRevenue) caseRevenue += partRevenue;
          });

          // Calculer les prises en charge (seulement si revenus non exclus)
          if (!excludeRevenue) {
            if (savCase.partial_takeover && savCase.takeover_amount) {
              takeoverAmount += Number(savCase.takeover_amount) || 0;
              takeoverCount++;
              const rawRatio = Number(savCase.takeover_amount) / (Number(savCase.total_cost) || 1);
              const takeoverRatio = Math.min(1, Math.max(0, rawRatio));
              caseRevenue = caseCost + (caseRevenue - caseCost) * (1 - takeoverRatio);
            } else if (savCase.taken_over) {
              // Prise en charge totale : le magasin absorbe tout le coût
              // Le montant pris en charge = prix de vente original (ce que le client aurait payé)
              takeoverAmount += caseRevenue;
              takeoverCount++;
              caseRevenue = 0; // Le client ne paie rien, donc CA = 0
            }
          }

          totalRevenue += caseRevenue;
          totalExpenses += caseCost;

          // Compter les statuts
          const status = savCase.status;
          statusCounts[status] = (statusCounts[status] || 0) + 1;

          // Données journalières pour revenus/expenses
          const dateKey = format(new Date(savCase.created_at), 'yyyy-MM-dd');
          if (dailyData[dateKey]) {
            dailyData[dateKey].revenue += caseRevenue;
            dailyData[dateKey].expenses += caseCost;
            dailyData[dateKey].count += 1;
          }
          
          // Catégoriser le produit et accumuler les revenus par catégorie
          const category = categorizeDevice(savCase.device_brand || '', savCase.device_model || '');
          if (!productCategoryData[category]) {
            productCategoryData[category] = { revenue: 0, count: 0 };
          }
          productCategoryData[category].revenue += caseRevenue;
          productCategoryData[category].count += 1;
        });

        // Calculer le taux de retard sur les SAV CLÔTURÉS dans la période
        const lateRate = totalClosedForRate > 0 ? (lateCount / totalClosedForRate) * 100 : 0;

        console.log('🔍 Debug retard - Résultat final:', {
          lateCount,
          totalClosedForRate,
          lateRate: lateRate.toFixed(2) + '%'
        });

        // Préparer les données pour les graphiques
        const chartData = Object.entries(dailyData)
          .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
          .map(([date, data]) => ({
            date: format(new Date(date), 'dd/MM'),
            revenue: data.revenue,
            expenses: data.expenses,
            profit: data.revenue - data.expenses,
            count: data.count,
            lateRate: data.activeCount > 0 ? (data.lateCount / data.activeCount) * 100 : 0,
            completed: data.completed
          }));

        const topPartsArray = Object.values(partsUsage)
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5);

        const topDevicesArray = Object.values(deviceUsage)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({
          name: name === 'pending' ? 'En attente' : 
                name === 'in_progress' ? 'En cours' :
                name === 'ready' ? 'Prêt' :
                name === 'pret_et_cloture' ? 'Prêt et cloturé' :
                name === 'delivered' ? 'Livré' :
                name === 'cancelled' ? 'Annulé' : name,
          value
        }));

        console.log('📊 Statistiques temps:', {
          totalTimeMinutes,
          savWithTimeCount,
          averageTimeHours: savWithTimeCount > 0 ? (totalTimeMinutes / savWithTimeCount / 60).toFixed(1) : 0
        });

        // Calculer le temps moyen de traitement (ouverture → fermeture avec statut prêt ou annulé)
        // Identifier les statuts "prêt" et "annulé" dynamiquement
        const readyStatusKeys = (shopSavStatuses || [])
          .filter(s => s.status_key.toLowerCase().includes('ready') || s.status_key.toLowerCase().includes('prêt') || s.status_key.toLowerCase().includes('pret'))
          .map(s => s.status_key);
        
        const cancelledStatusKeys = (shopSavStatuses || [])
          .filter(s => s.status_key.toLowerCase().includes('cancel') || s.status_key.toLowerCase().includes('annul'))
          .map(s => s.status_key);
        
        // Fallback si aucun statut trouvé
        const closedStatusKeys = [...readyStatusKeys, ...cancelledStatusKeys];
        if (closedStatusKeys.length === 0) {
          closedStatusKeys.push('ready', 'pret_et_cloture', 'cancelled');
        }

        // Filtrer les SAV fermés (prêt ou annulé)
        const closedSavCases = (savCases || []).filter((c: any) => 
          closedStatusKeys.includes(c.status) && !excludedFromStatsTypes.includes(c.sav_type)
        );

        let totalProcessingDays = 0;
        let closedSavCount = 0;

        closedSavCases.forEach((savCase: any) => {
          const createdAt = new Date(savCase.created_at);
          const closedAt = new Date(savCase.updated_at); // La date de mise à jour = date de fermeture
          
          // Calculer la différence en jours
          const diffTime = closedAt.getTime() - createdAt.getTime();
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          
          if (diffDays >= 0) {
            totalProcessingDays += diffDays;
            closedSavCount++;
          }
        });

        const averageProcessingDays = closedSavCount > 0 
          ? Number((totalProcessingDays / closedSavCount).toFixed(1)) 
          : 0;

        console.log('📊 Temps moyen de traitement:', {
          closedSavCount,
          averageProcessingDays: averageProcessingDays + ' jours'
        });

        setData({
          revenue: totalRevenue,
          expenses: totalExpenses,
          profit: totalRevenue - totalExpenses,
          savStats: {
            total: (savCases || []).filter((c: any) => !excludedFromStatsTypes.includes(c.sav_type)).length,
            averageTime: savWithTimeCount > 0 ? Number((totalTimeMinutes / savWithTimeCount / 60).toFixed(1)) : 0,
            averageProcessingDays,
            lateRate: lateRate
          },
          partsStats: {
            totalUsed: Object.values(partsUsage).reduce((sum, part) => sum + part.quantity, 0),
            averageCost: totalExpenses / (readySavCases.length || 1)
          },
          takeoverStats: {
            amount: takeoverAmount,
            count: takeoverCount
          },
          revenueChart: chartData.map(d => ({ date: d.date, revenue: d.revenue })),
          savCountChart: chartData.map(d => ({ date: d.date, count: d.count })),
          completedSavChart: chartData.map(d => ({ date: d.date, completed: d.completed })),
          lateRateChart: chartData.map(d => ({ date: d.date, lateRate: d.lateRate })),
          profitabilityChart: chartData.map(d => ({ 
            date: d.date, 
            revenue: d.revenue, 
            expenses: d.expenses, 
            profit: d.profit 
          })),
          topParts: topPartsArray,
          topDevices: topDevicesArray,
          savStatusDistribution: statusDistribution,
          revenueByProductCategory: Object.entries(productCategoryData)
            .map(([category, data]) => ({
              category,
              revenue: data.revenue,
              count: data.count,
              percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
              color: categoryColors[category] || categoryColors['Autres']
            }))
            .sort((a, b) => b.revenue - a.revenue)
        });

      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [shop?.id, period, filters?.savStatuses?.join(','), filters?.savTypes?.join(',')]);

  // Abonnement temps réel pour rafraîchir automatiquement les statistiques
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!shop?.id) return;
    
    const channel = supabase
      .channel(`statistics-refresh-${shop.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sav_cases', filter: `shop_id=eq.${shop.id}` },
        () => {
          console.log('🔄 SAV changed, refreshing statistics...');
          // Invalider les queries liées aux statistiques
          queryClient.invalidateQueries({ queryKey: ['statistics'] });
          queryClient.invalidateQueries({ queryKey: ['monthly-statistics'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sav_parts' },
        () => {
          console.log('🔄 SAV parts changed, refreshing statistics...');
          queryClient.invalidateQueries({ queryKey: ['statistics'] });
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [shop?.id, queryClient]);

  return { ...data, loading };
}