import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NumberInput } from '@/components/ui/number-input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Loader2 } from 'lucide-react';
import type { InventorySession, InventorySessionItem } from './types';

function currency(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(value || 0);
}

interface InventoryAssistedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: InventorySession;
  items: InventorySessionItem[];
  onCount: (itemId: string, quantity: number) => Promise<unknown> | unknown;
  onMissing: (itemId: string) => Promise<unknown> | unknown;
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

  // Mode visualisation : 'counting' (parcours) | 'review' (correction des écarts)
  const [mode, setMode] = useState<'counting' | 'review'>('counting');
  // ID de l'item courant — recalculé depuis les données fraîches.
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [busy, setBusy] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const pendingItems = orderedItems.filter((i) => i.line_status === 'pending');
  const correctionItems = orderedItems.filter(
    (i) => i.line_status !== 'pending' && i.counted_quantity !== null && i.variance_quantity !== 0,
  );
  const allProcessed = orderedItems.length > 0 && pendingItems.length === 0;

  const treated = orderedItems.length - pendingItems.length;
  const progressValue = orderedItems.length > 0 ? (treated / orderedItems.length) * 100 : 0;

  const countedValue = orderedItems.reduce(
    (sum, i) => sum + (i.counted_quantity ?? 0) * i.unit_cost,
    0,
  );
  const missingItems = orderedItems.filter(
    (i) => i.line_status !== 'pending' && (i.line_status === 'missing' || (i.counted_quantity ?? 0) === 0),
  );
  const positiveItems = orderedItems.filter(
    (i) => i.counted_quantity !== null && (i.counted_quantity ?? 0) > i.expected_quantity,
  );
  const positiveValue = positiveItems.reduce(
    (sum, i) => sum + Math.max(0, i.variance_quantity) * i.unit_cost,
    0,
  );

  // Liste affichée en cours selon le mode.
  const visibleList = mode === 'review' ? correctionItems : pendingItems;
  const currentItem = useMemo(() => {
    if (!currentId) return visibleList[0] ?? null;
    return visibleList.find((i) => i.id === currentId) ?? visibleList[0] ?? null;
  }, [currentId, visibleList]);

  const positionInList = currentItem ? visibleList.findIndex((i) => i.id === currentItem.id) + 1 : 0;

  // À l'ouverture, repositionne sur le premier pending.
  useEffect(() => {
    if (!open) return;
    setMode('counting');
    setIsClosing(false);
    const firstPending = orderedItems.find((i) => i.line_status === 'pending');
    setCurrentId(firstPending?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Quand l'item courant change, met la quantité par défaut.
  useEffect(() => {
    if (!currentItem) return;
    const def =
      currentItem.counted_quantity !== null && currentItem.counted_quantity !== undefined
        ? String(currentItem.counted_quantity)
        : currentItem.expected_quantity > 0
          ? String(currentItem.expected_quantity)
          : '1';
    setQuantity(def);
  }, [currentItem?.id]);

  // Quand on est en mode "counting" et que l'item courant n'est plus pending
  // (suite à une mutation), on avance vers le prochain pending par position.
  useEffect(() => {
    if (mode !== 'counting' || !currentId) return;
    const cur = orderedItems.find((i) => i.id === currentId);
    if (!cur || cur.line_status === 'pending') return;
    const next =
      orderedItems.find((i) => i.line_status === 'pending' && i.position > cur.position) ??
      orderedItems.find((i) => i.line_status === 'pending');
    setCurrentId(next?.id ?? null);
  }, [mode, currentId, orderedItems]);

  // En mode review, si l'item courant n'a plus d'écart, passer au suivant.
  useEffect(() => {
    if (mode !== 'review' || !currentId) return;
    const stillIn = correctionItems.find((i) => i.id === currentId);
    if (stillIn) return;
    setCurrentId(correctionItems[0]?.id ?? null);
  }, [mode, currentId, correctionItems]);

  const handleFound = async () => {
    if (!currentItem || busy) return;
    const parsed = Number(quantity);
    const value = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    setBusy(true);
    try {
      await onCount(currentItem.id, value);
    } finally {
      setBusy(false);
    }
  };

  const handleValidateExpected = async () => {
    if (!currentItem || busy) return;
    setQuantity(String(currentItem.expected_quantity));
    setBusy(true);
    try {
      await onCount(currentItem.id, currentItem.expected_quantity);
    } finally {
      setBusy(false);
    }
  };

  const handleMissing = async () => {
    if (!currentItem || busy) return;
    setQuantity('0');
    setBusy(true);
    try {
      await onMissing(currentItem.id);
    } finally {
      setBusy(false);
    }
  };

  const handlePause = async () => {
    await onPause();
    onOpenChange(false);
  };

  const handleClose = async () => {
    if (isClosing) return;
    setIsClosing(true);
    try {
      await onClose();
    } finally {
      setIsClosing(false);
    }
  };

  const handleStartReview = () => {
    if (correctionItems.length === 0) return;
    setMode('review');
    setCurrentId(correctionItems[0].id);
  };

  const goToPrevious = () => {
    if (!currentItem) return;
    const idx = visibleList.findIndex((i) => i.id === currentItem.id);
    if (idx > 0) setCurrentId(visibleList[idx - 1].id);
  };

  const goToNext = () => {
    if (!currentItem) return;
    const idx = visibleList.findIndex((i) => i.id === currentItem.id);
    if (idx >= 0 && idx < visibleList.length - 1) setCurrentId(visibleList[idx + 1].id);
  };

  const showSummary = allProcessed && mode === 'counting';

  return (
    <Dialog open={open} onOpenChange={(o) => (busy || isClosing ? null : onOpenChange(o))}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Inventaire assisté</DialogTitle>
          <DialogDescription>
            Avancez pièce par pièce. Validez la quantité attendue, marquez non trouvé, ou ajustez manuellement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-2xl font-semibold">{orderedItems.length}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Traitées</div>
              <div className="text-2xl font-semibold">{treated}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Restantes</div>
              <div className="text-2xl font-semibold">{pendingItems.length}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Position</div>
              <div className="text-2xl font-semibold">
                {visibleList.length ? positionInList : 0}/{visibleList.length}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{mode === 'review' ? 'Correction des écarts' : 'Progression'}</span>
              <span>{Math.round(progressValue)}%</span>
            </div>
            <Progress value={progressValue} />
          </div>

          {showSummary ? (
            <div className="space-y-4 rounded-md border border-primary/40 bg-primary/5 p-4 text-center sm:p-6">
              <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Comptage terminé — 100%</h3>
                <p className="text-sm text-muted-foreground">
                  Toutes les pièces ont été traitées. Vérifiez les résultats puis clôturez le comptage.
                </p>
              </div>
              <div className="grid gap-3 text-left sm:grid-cols-3">
                <div className="rounded-md border bg-background/70 p-3">
                  <div className="text-xs text-muted-foreground">Valeur finale comptée</div>
                  <div className="mt-1 text-xl font-semibold">{currency(countedValue)}</div>
                </div>
                <div className="rounded-md border bg-background/70 p-3">
                  <div className="text-xs text-muted-foreground">Produits manquants</div>
                  <div className="mt-1 text-xl font-semibold">{missingItems.length}</div>
                  <div className="text-xs text-muted-foreground">
                    {currency(missingItems.reduce((s, i) => s + i.expected_quantity * i.unit_cost, 0))}
                  </div>
                </div>
                <div className="rounded-md border bg-background/70 p-3">
                  <div className="text-xs text-muted-foreground">Produits positifs</div>
                  <div className="mt-1 text-xl font-semibold">{positiveItems.length}</div>
                  <div className="text-xs text-muted-foreground">+{currency(positiveValue)}</div>
                </div>
              </div>
              <div className="flex flex-col-reverse justify-center gap-2 sm:flex-row">
                <Button variant="outline" onClick={handleStartReview} disabled={correctionItems.length === 0}>
                  Corriger les écarts ({correctionItems.length})
                </Button>
                <Button onClick={handleClose} disabled={isClosing}>
                  {isClosing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Clôture en cours…
                    </>
                  ) : (
                    'Clôturer et revenir à la liste'
                  )}
                </Button>
              </div>
            </div>
          ) : currentItem ? (
            <div className="space-y-4 rounded-md border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold">{currentItem.part_name}</h3>
                  <p className="truncate text-sm text-muted-foreground">
                    {currentItem.part_reference || 'Sans référence'} · SKU {currentItem.part_sku || '—'}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  Théorique {currentItem.expected_quantity}
                </Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-[180px_1fr] md:items-end">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantité trouvée</label>
                  <NumberInput
                    min="0"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    disabled={busy}
                  />
                </div>
                <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                  Coût unitaire {(currentItem.unit_cost || 0).toFixed(2)} € · Écart après validation :{' '}
                  {((Number(quantity || 0) - currentItem.expected_quantity) * currentItem.unit_cost).toFixed(2)} €
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
              {mode === 'review'
                ? 'Plus aucun écart à corriger.'
                : 'Aucune pièce à traiter dans cette session.'}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between sm:space-x-0">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={goToPrevious} disabled={busy || !currentItem || positionInList <= 1}>
              Précédent
            </Button>
            <Button
              variant="outline"
              onClick={goToNext}
              disabled={busy || !currentItem || positionInList >= visibleList.length}
            >
              Passer
            </Button>
            <Button variant="outline" onClick={handlePause} disabled={busy}>
              Pause
            </Button>
          </div>
          {!showSummary && currentItem && (
            <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-3">
              <Button
                onClick={handleValidateExpected}
                disabled={busy}
                className="h-11 bg-success text-success-foreground hover:bg-success/90"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Valider
              </Button>
              <Button
                variant="destructive"
                onClick={handleMissing}
                disabled={busy}
                className="h-11"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Non trouvé
              </Button>
              <Button
                onClick={handleFound}
                disabled={busy}
                className="h-11 bg-warning text-warning-foreground hover:bg-warning/90"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Ajuster
              </Button>
            </div>
          )}
          {mode === 'review' && correctionItems.length === 0 && (
            <Button onClick={handleClose} disabled={isClosing}>
              {isClosing ? 'Clôture en cours…' : 'Clôturer'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
