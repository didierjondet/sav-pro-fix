import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Loader2, Search, SlidersHorizontal, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { INVENTORY_LINE_STATUS_LABELS, type InventorySessionItem } from './types';

const STATUS_DOMINANCE: Record<InventorySessionItem['line_status'], string> = {
  pending: 'bg-card border-border',
  found: 'bg-success/10 border-success/40',
  adjusted: 'bg-warning/15 border-warning/50',
  missing: 'bg-destructive/10 border-destructive/40',
  applied: 'bg-success/5 border-success/30',
  skipped: 'bg-muted/50 border-dashed',
};

type PendingActionType = 'found' | 'missing' | 'adjust';

const PENDING_ACTION_LABELS: Record<PendingActionType, string> = {
  found: 'Valider (reprend la quantité théorique)',
  missing: 'Marquer comme non trouvé',
  adjust: 'Enregistrer la quantité saisie',
};

export type InventoryReviewTab = 'counting' | 'discrepancies' | 'missing' | 'overwritten' | 'journal';

interface InventoryManualEditorProps {
  items: InventorySessionItem[];
  editable: boolean;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  draftQuantities: Record<string, string>;
  onDraftQuantityChange: (itemId: string, value: string) => void;
  draftNotes: Record<string, string>;
  onDraftNoteChange: (itemId: string, value: string) => void;
  onApplyQuantity: (item: InventorySessionItem) => Promise<unknown> | unknown;
  onMarkFound: (item: InventorySessionItem) => Promise<unknown> | unknown;
  onMarkMissing: (item: InventorySessionItem) => Promise<unknown> | unknown;
  activeFilter: 'all' | 'pending' | 'found' | 'missing' | 'adjusted';
  onActiveFilterChange: (value: 'all' | 'pending' | 'found' | 'missing' | 'adjusted') => void;
  compact?: boolean;
}

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(v || 0);
}

const filterLabels: Array<{ key: InventoryManualEditorProps['activeFilter']; label: string }> = [
  { key: 'all', label: 'Tout' },
  { key: 'pending', label: 'À traiter' },
  { key: 'found', label: 'Trouvés' },
  { key: 'missing', label: 'Manquants' },
  { key: 'adjusted', label: 'Écarts' },
];

function badgeVariant(status: InventorySessionItem['line_status']) {
  if (status === 'missing') return 'destructive' as const;
  if (status === 'pending') return 'outline' as const;
  return 'secondary' as const;
}

function statusLabel(item: InventorySessionItem) {
  if (item.line_status === 'pending') return 'À traiter';
  if (item.line_status === 'missing') return 'Non trouvé';
  if (item.line_status === 'found') return 'Traité';
  if (item.line_status === 'adjusted') return 'Ajusté';
  if (item.line_status === 'applied') return 'Appliqué';
  if (item.line_status === 'skipped') return 'Ignoré';
  return INVENTORY_LINE_STATUS_LABELS[item.line_status];
}

export function InventoryManualEditor({
  items,
  editable,
  searchTerm,
  onSearchTermChange,
  draftQuantities,
  onDraftQuantityChange,
  draftNotes,
  onDraftNoteChange,
  onApplyQuantity,
  onMarkFound,
  onMarkMissing,
  activeFilter,
  onActiveFilterChange,
  compact = false,
}: InventoryManualEditorProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<PendingActionType | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    item: InventorySessionItem;
    action: PendingActionType;
  } | null>(null);

  const runAction = async (
    item: InventorySessionItem,
    action: PendingActionType,
    fn: () => Promise<unknown> | unknown,
  ) => {
    if (busyId) return;
    setBusyId(item.id);
    setBusyAction(action);
    try {
      await fn();
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  };

  const executeFound = (item: InventorySessionItem) =>
    runAction(item, 'found', async () => {
      onDraftQuantityChange(item.id, String(item.expected_quantity));
      await onMarkFound(item);
    });

  const executeMissing = (item: InventorySessionItem) =>
    runAction(item, 'missing', async () => {
      onDraftQuantityChange(item.id, '0');
      await onMarkMissing(item);
    });

  const executeAdjust = (item: InventorySessionItem) =>
    runAction(item, 'adjust', () => onApplyQuantity(item));

  const requestAction = (item: InventorySessionItem, action: PendingActionType) => {
    if (item.line_status !== 'pending') {
      setPendingAction({ item, action });
      return;
    }
    if (action === 'found') void executeFound(item);
    else if (action === 'missing') void executeMissing(item);
    else void executeAdjust(item);
  };

  const handleFound = (item: InventorySessionItem) => requestAction(item, 'found');
  const handleMissing = (item: InventorySessionItem) => requestAction(item, 'missing');
  const handleAdjust = (item: InventorySessionItem) => requestAction(item, 'adjust');

  const confirmPendingAction = () => {
    if (!pendingAction) return;
    const { item, action } = pendingAction;
    setPendingAction(null);
    if (action === 'found') void executeFound(item);
    else if (action === 'missing') void executeMissing(item);
    else void executeAdjust(item);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex flex-nowrap gap-2">
            {filterLabels.map((filter) => (
              <Button
                key={filter.key}
                type="button"
                size="sm"
                variant={activeFilter === filter.key ? 'default' : 'outline'}
                onClick={() => onActiveFilterChange(filter.key)}
                className="shrink-0"
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="Rechercher une pièce, référence ou SKU"
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className={cn(compact ? 'h-[280px]' : 'h-[60vh] min-h-[420px]')}>
        <div className="grid gap-3 pr-2 sm:grid-cols-1 xl:grid-cols-2">
          {items.map((item) => {
            const currentQuantity = draftQuantities[item.id] ?? (item.counted_quantity ?? '').toString();
            const currentNote = draftNotes[item.id] ?? item.notes ?? '';
            const isBusy = busyId === item.id;

            return (
              <div
                key={item.id}
                className={cn(
                  'flex flex-col gap-3 rounded-lg border p-3 shadow-sm sm:p-4 transition-colors',
                  STATUS_DOMINANCE[item.line_status],
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold">{item.part_name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {item.part_reference || 'Sans référence'} · SKU {item.part_sku || '—'}
                    </div>
                  </div>
                  <Badge variant={badgeVariant(item.line_status)} className="shrink-0">
                    {statusLabel(item)}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-md bg-muted/50 p-2">
                    <div className="text-muted-foreground">Théorique</div>
                    <div className="text-base font-semibold">{item.expected_quantity}</div>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <div className="text-muted-foreground">Comptée</div>
                    <div className="text-base font-semibold">
                      {item.counted_quantity ?? '—'}
                    </div>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <div className="text-muted-foreground">Écart</div>
                    <div className="text-base font-semibold">
                      {item.counted_quantity === null ? '—' : item.variance_quantity}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-[150px_1fr]">
                  <div>
                    <label className="text-xs text-muted-foreground">Quantité</label>
                    <NumberInput
                      min="0"
                      value={currentQuantity}
                      disabled={!editable || isBusy}
                      onChange={(event) => onDraftQuantityChange(item.id, event.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Note (auto-enregistrée)</label>
                    <Input
                      value={currentNote}
                      disabled={!editable || isBusy}
                      onChange={(event) => onDraftNoteChange(item.id, event.target.value)}
                      placeholder="Note rapide"
                      className="mt-1"
                    />
                  </div>
                </div>

                {editable ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Button
                      onClick={() => handleFound(item)}
                      disabled={isBusy}
                      className="h-11 bg-success text-success-foreground hover:bg-success/90"
                    >
                      {isBusy && busyAction === 'found' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Valider
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleMissing(item)}
                      disabled={isBusy}
                      className="h-11"
                    >
                      {isBusy && busyAction === 'missing' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      Non trouvé
                    </Button>
                    <Button
                      onClick={() => handleAdjust(item)}
                      disabled={isBusy}
                      className="h-11 bg-warning text-warning-foreground hover:bg-warning/90"
                    >
                      {isBusy && busyAction === 'adjust' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <SlidersHorizontal className="h-4 w-4" />
                      )}
                      Ajuster
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Lecture seule</span>
                )}
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground sm:col-span-2">
              Aucune pièce à afficher avec ces filtres.
            </div>
          )}
        </div>
      </ScrollArea>

      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pièce déjà traitée</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction ? (
                <>
                  La pièce <strong>{pendingAction.item.part_name}</strong> a déjà été traitée
                  (statut : <strong>{statusLabel(pendingAction.item)}</strong>, quantité comptée :{' '}
                  <strong>{pendingAction.item.counted_quantity ?? '—'}</strong>).
                  <br />
                  En continuant ({PENDING_ACTION_LABELS[pendingAction.action]}), la saisie
                  précédente sera écrasée. Le stock réel n'est pas modifié tant que l'inventaire
                  n'est pas clôturé.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPendingAction}>
              Écraser la saisie
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
