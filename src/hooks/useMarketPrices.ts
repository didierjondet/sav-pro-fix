import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from './useShop';

interface MarketPricesCache {
  [partName: string]: {
    price: number;
    timestamp: number;
  };
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 heures en millisecondes
const CACHE_KEY = 'market_prices_cache';

export function useMarketPrices(partNames: string[]) {
  const { shop } = useShop();
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vérifier si le module est activé
  const isEnabled = shop?.ai_market_prices_enabled ?? false;

  useEffect(() => {
    if (!isEnabled || partNames.length === 0) {
      setMarketPrices({});
      return;
    }

    const fetchMarketPrices = async () => {
      setLoading(true);
      setError(null);

      try {
        // Charger le cache du localStorage
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cache: MarketPricesCache = cachedData ? JSON.parse(cachedData) : {};
        
        // Séparer les pièces déjà en cache valide et celles à récupérer
        const now = Date.now();
        const validCachedPrices: Record<string, number> = {};
        const partsToFetch: string[] = [];

        partNames.forEach(name => {
          if (cache[name] && (now - cache[name].timestamp) < CACHE_DURATION) {
            validCachedPrices[name] = cache[name].price;
          } else {
            partsToFetch.push(name);
          }
        });

        // Si toutes les pièces sont en cache, retourner immédiatement
        if (partsToFetch.length === 0) {
          setMarketPrices(validCachedPrices);
          setLoading(false);
          return;
        }

        // Appeler l'edge function pour les pièces manquantes
        const { data, error: functionError } = await supabase.functions.invoke('get-market-prices', {
          body: { partNames: partsToFetch }
        });

        if (functionError) {
          throw functionError;
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        const newPrices = data?.marketPrices || {};

        // Mettre à jour le cache avec les nouveaux prix
        const updatedCache: MarketPricesCache = { ...cache };
        Object.entries(newPrices).forEach(([name, price]) => {
          updatedCache[name] = { price: price as number, timestamp: now };
        });
        localStorage.setItem(CACHE_KEY, JSON.stringify(updatedCache));

        // Combiner les prix en cache et les nouveaux
        setMarketPrices({ ...validCachedPrices, ...newPrices });

      } catch (err) {
        console.error('Error fetching market prices:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchMarketPrices();
  }, [isEnabled, partNames.join(',')]); // Utiliser join pour éviter les re-renders inutiles

  return { marketPrices, loading, error, isEnabled };
}

// Fonction utilitaire pour calculer la tendance
export function calculatePriceTrend(sellingPrice: number, marketPrice: number): {
  percentage: number;
  direction: 'above' | 'below' | 'equal';
  icon: string;
} {
  const diff = sellingPrice - marketPrice;
  const percentage = marketPrice > 0 ? Math.round((diff / marketPrice) * 100) : 0;

  if (Math.abs(percentage) <= 5) {
    return { percentage, direction: 'equal', icon: '≈' };
  }
  
  if (percentage > 0) {
    return { percentage, direction: 'above', icon: '▲' };
  }
  
  return { percentage, direction: 'below', icon: '▼' };
}
