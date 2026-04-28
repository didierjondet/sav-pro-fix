import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from "@/components/ui/number-input";
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2 } from 'lucide-react';
import type { InventorySession, InventorySessionItem } from './types';

interface InventoryAssistedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: InventorySession;
  items: InventorySessionItem[];
  onCount: (itemId: string, quantity: number) => Promise<{ freshItems?: InventorySessionItem[] } | void>;
  onMissing: (itemId: string) => Promise<{ freshItems?: InventorySessionItem[] } | void>;
  onPause: () => Promise<void>;
  onClose: () => Promise<void>;
}

export function InventoryAssistedDialog({
  open,
  onOpenChange,
  session,
  items,
  onCount,
  onMissing,
  onPause,
  onClose,
}: InventoryAssistedDialogProps) {
  const orderedItems = useMemo(() => [...items].sort((a, b) => a.position - b.position), [items]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctionMode, setCorrectionMode] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [quantity, setQuantity] = useState('1');

  const correctionItems = orderedItems.filter((item) => item.line_status !== 'pending' && item.counted_quantity !== null && item.variance_quantity !== 0);
  const visibleItems = correctionMode ? correctionItems : orderedItems;
  const currentItem = visibleItems[currentIndex] || null;
  const remainingPending = orderedItems.filter((item) => item.line_status === 'pending');
  const isAllProcessed = orderedItems.length > 0 && remainingPending.length === 0;
  const isLastPending = !correctionMode && remainingPending.length === 1 && currentItem?.line_status === 'pending';
  const countedValue = orderedItems.reduce((sum, item) => sum + ((item.counted_quantity ?? 0) * item.unit_cost), 0);
  const missingItems = orderedItems.filter((item) => item.line_status !== 'pending' && (item.line_status === 'missing' || (item.counted_quantity ?? 0) === 0));
  const positiveItems = orderedItems.filter((item) => item.counted_quantity !== null && (item.counted_quantity ?? 0) > item.expected_quantity);
  const positiveValue = positiveItems.reduce((sum, item) => sum + Math.max(0, item.variance_quantity) * item.unit_cost, 0);
  const progressValue = orderedItems.length > 0
    ? ((orderedItems.length - remainingPending.length) / orderedItems.length) * 100
    : 0;

  // À l'ouverture du dialogue uniquement, positionner sur le premier pending.
  // On ne réagit PAS aux changements de orderedItems pour éviter de revenir
  // en arrière après chaque enregistrement (cause de la boucle infinie).
  useEffect(() => {
    if (!open) return;
    const firstPendingIndex = orderedItems.findIndex((item) => item.line_status === 'pending');
    setCurrentIndex(firstPendingIndex >= 0 ? firstPendingIndex : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Met à jour la quantité affichée quand on change d'item.
  useEffect(() => {
    setQuantity(currentItem?.counted_quantity !== null && currentItem?.counted_quantity !== undefined
      ? String(currentItem.counted_quantity)
      : currentItem?.expected_quantity
        ? String(currentItem.expected_quantity)
        : '1');
  }, [currentItem?.id, currentItem?.expected_quantity, currentItem?.counted_quantity]);

  // Avance vers le prochain item pending APRÈS qu'un item ait été traité.
  // On exclut explicitement l'ID qu'on vient de traiter pour gérer le cas
  // (improbable) où la liste n'aurait pas encore reflété la mise à jour.
  const advanceAfterTreatment = (treatedId: string, freshItems: InventorySessionItem[]) => {
    const ordered = [...freshItems].sort((a, b) => a.position - b.position);
    const nextPending = ordered.find(
      (item) => item.line_status === 'pending' && item.id !== treatedId,
    );
    if (nextPending) {
      const idx = ordered.findIndex((item) => item.id === nextPending.id);
      setCurrentIndex(idx);
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, Math.max(orderedItems.length - 1, 0)));
  };

  const handleFound = async () => {
    if (!currentItem) return;
    const treatedId = currentItem.id;
    const wasLastPending = isLastPending;
    const parsed = Number(quantity);
    const value = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    await onCount(treatedId, value);
    if (wasLastPending) {
      await handleClose();
    } else {
      advanceAfterTreatment(treatedId, items);
    }
  };

  const handleMissing = async () => {
    if (!currentItem) return;
    const treatedId = currentItem.id;
    const wasLastPending = isLastPending;
    await onMissing(treatedId);
    if (wasLastPending) {
      await handleClose();
    } else {
      advanceAfterTreatment(treatedId, items);
    }
  };

  const handlePause = async () => {
    await onPause();
    onOpenChange(false);
  };

  const handleClose = async () => {
    setIsClosing(true);
    try {
      await onClose();
    } finally {
      setIsClosing(false);
    }
  };

  const handleReviewFirst = () => {
    setCurrentIndex(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Inventaire assisté</DialogTitle>
          <DialogDescription>
            Avancez pièce par pièce, corrigez au besoin et reprenez une ligne précédente à tout moment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Au départ</div>
              <div className="text-2xl font-semibold">{session.total_items}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Traitées</div>
              <div className="text-2xl font-semibold">{session.total_items - remainingPending.length}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Restantes</div>
              <div className="text-2xl font-semibold">{remainingPending.length}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Position</div>
              <div className="text-2xl font-semibold">{orderedItems.length ? currentIndex + 1 : 0}/{orderedItems.length}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Progression</span>
              <span>{Math.round(progressValue)}%</span>
            </div>
            <Progress value={progressValue} />
          </div>

          {isAllProcessed ? (
            <div className="space-y-4 rounded-md border border-primary/40 bg-primary/5 p-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Comptage terminé</h3>
                <p className="text-sm text-muted-foreground">
                  Toutes les pièces ont été traitées. Vous pouvez réviser une ligne ou clôturer le comptage maintenant.
                </p>
              </div>
              <div className="flex flex-col-reverse justify-center gap-2 sm:flex-row">
                <Button variant="outline" onClick={handleReviewFirst}>Réviser une ligne</Button>
                <Button onClick={handleClose} disabled={isClosing}>
                  {isClosing ? 'Clôture en cours…' : 'Clôturer le comptage'}
                </Button>
              </div>
            </div>
          ) : currentItem ? (
            <div className="space-y-4 rounded-md border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{currentItem.part_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {currentItem.part_reference || 'Sans référence'} · SKU {currentItem.part_sku || '—'}
                  </p>
                </div>
                <Badge variant="outline">Qté théorique {currentItem.expected_quantity}</Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-[180px_1fr] md:items-end">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantité trouvée</label>
                  <NumberInput
                    
                    min="0"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                </div>
                <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                  Coût unitaire {(currentItem.unit_cost || 0).toFixed(2)} € · Écart attendu après validation :{' '}
                  {((Number(quantity || 0) - currentItem.expected_quantity) * currentItem.unit_cost).toFixed(2)} €
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              Aucune pièce à afficher dans cette session.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between sm:space-x-0">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={goToPrevious} disabled={currentIndex <= 0}>Précédent</Button>
            <Button variant="outline" onClick={goToNext} disabled={!currentItem || currentIndex >= orderedItems.length - 1}>Passer</Button>
            <Button variant="outline" onClick={handlePause}>Pause</Button>
          </div>
          {!isAllProcessed && (
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button variant="outline" onClick={handleMissing} disabled={!currentItem || isClosing}>
                {isLastPending ? 'Non trouvé et clôturer' : 'Non trouvé'}
              </Button>
              <Button onClick={handleFound} disabled={!currentItem || isClosing}>
                {isLastPending ? 'Enregistrer et clôturer' : 'Enregistrer / suivant'}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
