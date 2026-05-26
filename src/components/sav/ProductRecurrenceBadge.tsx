import { useState } from 'react';
import { History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useProductHistory } from '@/hooks/useProductHistory';
import { ProductHistoryDrawer } from './ProductHistoryDrawer';

interface Props {
  shopId?: string | null;
  imei?: string | null;
  excludeSavId?: string | null;
  className?: string;
}

/** Petit badge cliquable affiché à côté de l'IMEI dans la fiche SAV ou la card */
export function ProductRecurrenceBadge({ shopId, imei, excludeSavId, className }: Props) {
  const [open, setOpen] = useState(false);
  const { trackedProduct, previousCases } = useProductHistory({ shopId, imei, excludeSavId });

  if (!previousCases.length) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={`inline-flex items-center ${className || ''}`}
        title={`${previousCases.length} SAV précédent${previousCases.length > 1 ? 's' : ''} pour ce produit`}
      >
        <Badge variant="outline" className="gap-1 border-amber-500/60 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 cursor-pointer">
          <History className="h-3 w-3" />
          {previousCases.length} SAV
        </Badge>
      </button>
      <ProductHistoryDrawer
        open={open}
        onOpenChange={setOpen}
        product={trackedProduct}
        cases={previousCases}
        title="Historique du produit"
      />
    </>
  );
}
