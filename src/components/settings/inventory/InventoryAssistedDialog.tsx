import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { InventorySession, InventorySessionItem } from './types';

interface InventoryAssistedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: InventorySession;
  items: InventorySessionItem[];
  onCount: (itemId: string, quantity: number) => Promise<void>;
  onMissing: (itemId: string) => Promise<void>;
  onPause: () => Promise<void>;
}

export function InventoryAssistedDialog({
  open,
  onOpenChange,
  session,
  items,
  onCount,
  onMissing,
  onPause,
}: InventoryAssistedDialogProps) {
  const orderedItems = useMemo(() => [...items].sort((a, b) => a.position - b.position), [items]);
  const initialIndex = useMemo(() => {
    const firstPendingIndex = orderedItems.findIndex((item) => item.line_status === 'pending');
    return firstPendingIndex >= 0 ? firstPendingIndex : 0;
  }, [orderedItems]);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentItem = orderedItems[currentIndex] || null;
  const [quantity, setQuantity] = useState('1');
  const progressValue = session.total_items > 0 ? ((session.total_items - orderedItems.filter((item) => item.line_status === 'pending').length) / session.total_items) * 100 : 0;

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, open]);

  useEffect(() => {
    setQuantity(currentItem?.counted_quantity !== null && currentItem?.counted_quantity !== undefined
      ? String(currentItem.counted_quantity)
      : currentItem?.expected_quantity
        ? String(currentItem.expected_quantity)
        : '1');
  }, [currentItem?.id, currentItem?.expected_quantity, currentItem?.counted_quantity]);

  const remainingCount = orderedItems.filter((item) => item.line_status === 'pending').length;

  const goToNext = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, Math.max(orderedItems.length - 1, 0)));
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleFound = async () => {
    if (!currentItem) return;
    const parsed = Number(quantity);
    await onCount(currentItem.id, Number.isFinite(parsed) && parsed >= 0 ? parsed : 0);
    goToNext();
  };

  const handleMissing = async () => {
    if (!currentItem) return;
    await onMissing(currentItem.id);
    goToNext();
  };

  const handlePause = async () => {
    await onPause();
    onOpenChange(false);
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
              <div className="text-2xl font-semibold">{session.counted_items}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Restantes</div>
              <div className="text-2xl font-semibold">{remainingCount}</div>
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

          {currentItem ? (
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
                  <Input
                    type="number"
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
              Toutes les pièces ont été traitées dans cette session.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between sm:space-x-0">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={goToPrevious} disabled={currentIndex <= 0}>Précédent</Button>
            <Button variant="outline" onClick={goToNext} disabled={!currentItem || currentIndex >= orderedItems.length - 1}>Passer</Button>
            <Button variant="outline" onClick={handlePause}>Pause</Button>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={handleMissing} disabled={!currentItem}>Non trouvé</Button>
            <Button onClick={handleFound} disabled={!currentItem}>Enregistrer / suivant</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
