import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { NewSAVFromProductDialog } from './NewSAVFromProductDialog';
import type { PreviousSAVCase } from '@/hooks/useProductHistory';

interface Props {
  sourceCase: PreviousSAVCase | null;
  trackedProductId?: string | null;
  label?: string;
  size?: 'sm' | 'default';
  variant?: 'outline' | 'secondary' | 'default';
  className?: string;
}

/**
 * Bouton réutilisable "Nouveau SAV pour ce produit".
 * Ouvre le dialogue de re-création pré-remplie à partir d'un dossier source.
 */
export function NewSAVFromProductButton({
  sourceCase,
  trackedProductId,
  label = 'Nouveau SAV pour ce produit',
  size = 'sm',
  variant = 'outline',
  className,
}: Props) {
  const [open, setOpen] = useState(false);

  if (!sourceCase) return null;

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        className={className}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title="Créer un nouveau SAV en reprenant les références de cet appareil"
      >
        <RotateCcw className="h-4 w-4 mr-1" />
        {label}
      </Button>
      {open && (
        <NewSAVFromProductDialog
          sourceCase={sourceCase}
          trackedProductId={trackedProductId || null}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  );
}
