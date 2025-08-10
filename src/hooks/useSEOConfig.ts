import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SEOConfig {
  id?: string;
  shop_id: string;
  
  // Meta tags de base
  default_title?: string;
  default_description?: string;
  default_keywords?: string[];
  
  // Open Graph
  og_title?: string;
  og_description?: string;
  og_image_url?: string;
  og_type?: string;
  
  // Twitter Cards
  twitter_card_type?: string;
  twitter_title?: string;
  twitter_description?: string;
  twitter_image_url?: string;
  
  // Structured data
  business_type?: string;
  business_hours?: any;
  price_range?: string;
  accepts_reservations?: boolean;
  
  // Analytics et verification
  google_analytics_id?: string;
  google_tag_manager_id?: string;
  google_site_verification?: string;
  bing_site_verification?: string;
  facebook_domain_verification?: string;
  
  // Robots et sitemap
  robots_txt?: string;
  sitemap_enabled?: boolean;
  
  // URL canoniques et redirections
  canonical_domain?: string;
  force_https?: boolean;
  
  // Images par défaut
  default_alt_text_pattern?: string;
  favicon_url?: string;
  
  // Performance et chargement
  lazy_loading_enabled?: boolean;
  webp_images_enabled?: boolean;
  
  // Données locales
  local_business_hours?: any;
  service_areas?: string[];
  languages_supported?: string[];
}

export function useSEOConfig() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [seoConfig, setSeoConfig] = useState<SEOConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSEOConfig();
    } else {
      setSeoConfig(null);
      setLoading(false);
    }
  }, [user]);

  const fetchSEOConfig = async () => {
    if (!user) return;
    
    try {
      // Récupérer le shop_id de l'utilisateur
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('shop_id, role')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      
      // Pour les super admins, on récupère la première boutique ou on en crée une par défaut
      if (profileData?.role === 'super_admin' && !profileData?.shop_id) {
        const { data: shops, error: shopsError } = await supabase
          .from('shops')
          .select('id')
          .limit(1);
        
        if (shopsError) throw shopsError;
        
        if (shops && shops.length > 0) {
          profileData.shop_id = shops[0].id;
        } else {
          // Créer une boutique par défaut pour la config globale
          const { data: newShop, error: shopError } = await supabase
            .from('shops')
            .insert([{ name: 'Configuration Globale', email: user.email }])
            .select()
            .single();
          
          if (shopError) throw shopError;
          profileData.shop_id = newShop.id;
        }
      }
      
      if (!profileData?.shop_id) {
        console.error('No shop_id found for user');
        setSeoConfig(null);
        setLoading(false);
        return;
      }

      // Récupérer la config SEO
      const { data, error } = await supabase
        .from('shop_seo_config')
        .select('*')
        .eq('shop_id', profileData.shop_id)
        .maybeSingle();

      if (error) throw error;
      setSeoConfig(data);
    } catch (error: any) {
      console.error('SEO config fetch error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger la configuration SEO',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createSEOConfig = async (shopId: string) => {
    try {
      const { data, error } = await supabase
        .from('shop_seo_config')
        .insert([{ shop_id: shopId }])
        .select()
        .single();

      if (error) throw error;
      setSeoConfig(data);
    } catch (error: any) {
      console.error('SEO config creation error:', error);
      throw error;
    }
  };

  const updateSEOConfig = async (updates: Partial<SEOConfig>) => {
    if (!user) return;

    try {
      // Récupérer le shop_id d'abord
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('shop_id, role')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      
      let shopId = profileData?.shop_id;
      
      // Pour les super admins sans shop_id, utiliser la première boutique disponible
      if (profileData?.role === 'super_admin' && !shopId) {
        const { data: shops } = await supabase
          .from('shops')
          .select('id')
          .limit(1);
        
        if (shops && shops.length > 0) {
          shopId = shops[0].id;
        }
      }
      
      if (!shopId) {
        throw new Error('Aucun magasin associé à cet utilisateur');
      }

      // Si pas de config SEO existante, la créer
      if (!seoConfig) {
        const { data, error } = await supabase
          .from('shop_seo_config')
          .insert([{ shop_id: shopId, ...updates }])
          .select()
          .single();

        if (error) throw error;
        setSeoConfig(data);
        return;

      }

      // Mettre à jour la config existante
      const { data, error } = await supabase
        .from('shop_seo_config')
        .update(updates)
        .eq('id', seoConfig.id)
        .select()
        .single();

      if (error) throw error;
      
      setSeoConfig(data);
      toast({
        title: 'Configuration SEO mise à jour',
        description: 'Les paramètres ont été sauvegardés avec succès'
      });
    } catch (error: any) {
      console.error('SEO config update error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder la configuration SEO',
        variant: 'destructive'
      });
    }
  };

  return {
    seoConfig,
    loading,
    updateSEOConfig,
    refetch: fetchSEOConfig
  };
}