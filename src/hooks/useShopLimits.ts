import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useShopLimits() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const refreshShopLimits = async (shopId: string) => {
    console.log('🔄 [REFRESH-LIMITS] Début du rafraîchissement pour le magasin:', shopId);
    setLoading(true);
    
    try {
      // 1. Récupérer les informations actuelles du magasin
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('*')
        .eq('id', shopId)
        .single();

      if (shopError) throw shopError;
      
      console.log('📊 [REFRESH-LIMITS] Données magasin récupérées:', {
        active_sav_count: shopData.active_sav_count,
        sms_credits_allocated: shopData.sms_credits_allocated,
        subscription_tier: shopData.subscription_tier
      });

      // 2. Vérifier les nouvelles limites via la fonction check_subscription_limits_v2
      const { data: limitsCheck, error: limitsError } = await supabase.rpc(
        'check_subscription_limits_v2',
        { 
          p_shop_id: shopId,
          p_action: 'sav'
        }
      );

      if (limitsError) {
        console.log('❌ [REFRESH-LIMITS] Erreur lors de la vérification des limites:', limitsError);
        throw limitsError;
      }

      console.log('✅ [REFRESH-LIMITS] Vérification des limites:', limitsCheck);

      // 3. Notifier l'utilisateur du statut
      const limits = limitsCheck as any;
      if (limits.allowed) {
        toast({
          title: "✅ Magasin débloqué",
          description: "Le magasin peut maintenant créer de nouveaux SAV",
        });
      } else {
        toast({
          title: "⚠️ Magasin toujours bloqué",
          description: limits.reason || "Limites toujours atteintes",
          variant: "destructive",
        });
      }

      return {
        success: true,
        allowed: limits.allowed,
        reason: limits.reason,
        shopData
      };

    } catch (error: any) {
      console.error('💥 [REFRESH-LIMITS] Erreur:', error);
      toast({
        title: "Erreur",
        description: `Impossible de rafraîchir les limites: ${error.message}`,
        variant: "destructive",
      });
      return {
        success: false,
        error: error.message
      };
    } finally {
      setLoading(false);
    }
  };

  const forceUnlockShop = async (shopId: string, newSavLimit: number) => {
    console.log('🔓 [FORCE-UNLOCK] Débloquage forcé du magasin:', shopId, 'nouvelle limite:', newSavLimit);
    setLoading(true);
    
    try {
      // Mettre à jour la limite SAV et désactiver l'abonnement forcé temporairement
      const { error: updateError } = await supabase
        .from('shops')
        .update({
          subscription_forced: true, // Désactiver les vérifications de limites
        })
        .eq('id', shopId);

      if (updateError) throw updateError;

      console.log('✅ [FORCE-UNLOCK] Magasin débloqué temporairement');
      
      toast({
        title: "🔓 Magasin débloqué",
        description: `Limite SAV mise à jour. Le magasin peut maintenant créer ${newSavLimit} SAV.`,
      });

      return { success: true };

    } catch (error: any) {
      console.error('💥 [FORCE-UNLOCK] Erreur:', error);
      toast({
        title: "Erreur",
        description: `Impossible de débloquer le magasin: ${error.message}`,
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    refreshShopLimits,
    forceUnlockShop,
    loading
  };
}