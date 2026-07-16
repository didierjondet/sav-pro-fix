import { useState } from 'react';
import { AlertCircle, History, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProductHistory } from '@/hooks/useProductHistory';
import { ProductHistoryDrawer } from './ProductHistoryDrawer';
import { NewSAVFromProductDialog } from './NewSAVFromProductDialog';

interface Props {
  shopId?: string | null;
  imei?: string | null;
  sku?: string | null;
  brand?: string | null;
  model?: string | null;
  excludeSavId?: string | null;
}

/**
 * Bandeau non-bloquant qui alerte le technicien quand un produit
 * (identifié par IMEI ou SKU/modèle) est déjà passé en SAV dans la boutique.
 */
export function ProductHistoryBanner({ shopId, imei, sku, brand, model, excludeSavId }: Props) {
  const [open, setOpen] = useState(false);
  const [newSavOpen, setNewSavOpen] = useState(false);
  const { trackedProduct, previousCases, suggestions, detection } = useProductHistory({
    shopId, imei, sku, brand, model, excludeSavId,
  });

  if (detection.level === 'none') return null;

  const isExact = detection.level === 'exact';
  const cases = isExact ? previousCases : suggestions;

  return (
    <>
      <div
        className={`rounded-lg border p-3 flex items-start gap-3 ${
          isExact
            ? 'border-amber-500/50 bg-amber-500/10'
            : 'border-blue-500/40 bg-blue-500/5'
        }`}
      >
        <AlertCircle className={`h-5 w-5 mt-0.5 shrink-0 ${isExact ? 'text-amber-600' : 'text-blue-600'}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {isExact
              ? `Produit déjà connu — ${detection.count} SAV précédent${detection.count > 1 ? 's' : ''}`
              : `Produit potentiellement déjà vu — ${detection.count} dossier${detection.count > 1 ? 's' : ''} similaire${detection.count > 1 ? 's' : ''}`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isExact
              ? "Cet IMEI a déjà été enregistré dans votre boutique. Consultez l'historique avant de créer un nouveau SAV."
              : "Un produit avec le même SKU est déjà passé. Vérifiez s'il s'agit du même appareil."}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant={isExact ? 'default' : 'outline'}
          onClick={() => setOpen(true)}
          className="shrink-0"
        >
          <History className="h-3.5 w-3.5 mr-1" />
          Voir l'historique
        </Button>
      </div>

      <ProductHistoryDrawer
        open={open}
        onOpenChange={setOpen}
        product={trackedProduct}
        cases={cases}
        title={isExact ? 'Historique du produit' : 'Dossiers similaires'}
      />
    </>
  );
}
