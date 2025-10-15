import { useShop as useShopContext } from '@/contexts/ShopContext';

export type { Shop } from '@/contexts/ShopContext';

// Re-exporter le hook du contexte avec adaptation de la signature updateShop
export function useShop() {
  const context = useShopContext();
  
  // Adapter updateShop pour accepter soit (shopData) soit (shopId, updates)
  const updateShop = async (shopDataOrId: string | Partial<any>, updates?: Partial<any>) => {
    if (!context.shop) {
      throw new Error("Aucun magasin trouvé");
    }
    
    // Si premier argument est un objet, c'est l'ancienne signature
    if (typeof shopDataOrId === 'object') {
      await context.updateShop(context.shop.id, shopDataOrId);
    } else {
      // Nouvelle signature avec shopId et updates
      await context.updateShop(shopDataOrId, updates!);
    }
  };
  
  return {
    ...context,
    updateShop
  };
}