import { useMemo, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useInventory } from '@/hooks/useInventory';
import { usePartCategories } from '@/hooks/usePartCategories';
import { printInventoryDocument } from '@/lib/inventoryPrint';
import { cn } from '@/lib/utils';
import {
  Activity,
  Archive,
  ArrowLeft,
  Barcode,
  ClipboardList,
  FileSpreadsheet,
  Layers,
  PauseCircle,
  PlayCircle,
  Printer,
  ScanLine,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { InventoryAssistedDialog } from './InventoryAssistedDialog';
import { InventoryManualEditor, type InventoryReviewTab } from './InventoryManualEditor';
import { InventorySessionSummary } from './InventorySessionSummary';
import {
  INVENTORY_MODE_LABELS,
  INVENTORY_STATUS_LABELS,
  type InventoryAuditLog,
  type InventoryMode,
  type InventorySessionItem,
} from './types';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Une erreur est survenue.';
}

const statusBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  in_progress: 'default',
  paused: 'secondary',
  applied: 'outline',
  cancelled: 'destructive',
  completed: 'secondary',
  draft: 'outline',
};

function currency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function getLogLabel(log: InventoryAuditLog) {
  const labels: Record<string, string> = {
    session_paused: 'Inventaire mis en pause',
    session_resumed: 'Inventaire repris',
    session_stopped: 'Inventaire arrêté',
    session_completed: 'Comptage clôturé',
    session_cancelled: 'Inventaire annulé',
    session_applied: 'Stock appliqué',
    item_updated: 'Ligne modifiée',
    bulk_scan: 'Lot de scan traité',
  };

  return labels[log.action] || log.action;
}

export function InventoryManager({ canApplyStock }: { canApplyStock: boolean }) {
  const {
    sessions,
    currentSession,
    items,
    logs,
    loading,
    setSelectedSessionId,
    createSession,
    updateItem,
    markItemMissing,
    resetItem,
    skipItem,
    updateItemNote,
    pauseSession,
    resumeSession,
    stopSession,
    cancelSession,
    closeSession,
    applySession,
    deleteSession,
    bulkScanCodes,
    lastScanBatch,
    pendingItems,
    missingItems,
    adjustedItems,
    exactMatchItems,
    overstockItems,
    understockItems,
    overwrittenItems,
    completionRate,
    canEditSession,
    canCloseSession,
    canApplySession,
    canDeleteSession,
    stats,
  } = useInventory();
  const { toast } = useToast();
  const { categories } = usePartCategories();

  const [createOpen, setCreateOpen] = useState(false);
  const [assistedOpen, setAssistedOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createMode, setCreateMode] = useState<InventoryMode>('assisted');
  const [createNotes, setCreateNotes] = useState('');
  const [createCategoryIds, setCreateCategoryIds] = useState<string[]>([]);
  const [scanCodes, setScanCodes] = useState('');
  const [manualSearch, setManualSearch] = useState('');
  const [manualFilter, setManualFilter] = useState<'all' | 'pending' | 'found' | 'missing' | 'adjusted'>('all');
  const [activeTab, setActiveTab] = useState<InventoryReviewTab>('counting');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [confirmApplyOpen, setConfirmApplyOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftQuantities, setDraftQuantities] = useState<Record<string, string>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  const filteredItems = useMemo(() => {
    const term = manualSearch.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !term ||
        [item.part_name, item.part_reference, item.part_sku, item.part_supplier]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      if (!matchesSearch) return false;

      switch (manualFilter) {
        case 'pending':
          return item.line_status === 'pending';
        case 'found':
          return item.line_status === 'found';
        case 'missing':
          return item.line_status === 'missing' || (item.counted_quantity ?? 0) === 0;
        case 'adjusted':
          return item.counted_quantity !== null && item.variance_quantity !== 0;
        default:
          return true;
      }
    });
  }, [items, manualSearch, manualFilter]);

  const visibleDiscrepancies = useMemo(
    () => adjustedItems.filter((item) => item.line_status !== 'missing'),
    [adjustedItems],
  );

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      await createSession({
        name: createName,
        mode: createMode,
        notes: createNotes,
        categoryIds: createCategoryIds.length > 0 ? createCategoryIds : undefined,
      });
      setCreateName('');
      setCreateNotes('');
      setCreateMode('assisted');
      setCreateCategoryIds([]);
      setCreateOpen(false);
      setViewMode('detail');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setViewMode('detail');
  };

  const goBackToList = () => {
    setViewMode('list');
  };

  const toggleCategoryId = (id: string) => {
    setCreateCategoryIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  };

  const setDraftQuantity = (itemId: string, value: string) => {
    setDraftQuantities((current) => ({ ...current, [itemId]: value }));
  };

  const setDraftNote = (itemId: string, value: string) => {
    setDraftNotes((current) => ({ ...current, [itemId]: value }));
  };

  const resolveDraftQuantity = (item: InventorySessionItem) => {
    const value = draftQuantities[item.id] ?? (item.counted_quantity ?? item.expected_quantity).toString();
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : item.counted_quantity ?? item.expected_quantity;
  };

  const handleApplyQuantity = async (item: InventorySessionItem, method: InventoryMode = 'manual') => {
    const quantity = resolveDraftQuantity(item);
    await updateItem({
      sessionId: item.inventory_session_id,
      itemId: item.id,
      countedQuantity: quantity,
      lineStatus: quantity === item.expected_quantity ? 'found' : quantity === 0 ? 'missing' : 'adjusted',
      entryMethod: method,
    });
  };

  const handleSaveNote = async (item: InventorySessionItem) => {
    await updateItemNote(item.inventory_session_id, item.id, draftNotes[item.id] ?? item.notes ?? null);
    toast({ title: 'Note enregistrée', description: `Note mise à jour pour ${item.part_name}.` });
  };

  const handlePause = async () => {
    if (!currentSession) return;
    await pauseSession(currentSession.id);
    toast({ title: 'Inventaire en pause', description: 'Vous pourrez le reprendre plus tard.' });
  };

  const handleResume = async () => {
    if (!currentSession) return;
    await resumeSession(currentSession.id);
    toast({ title: 'Inventaire repris', description: 'La session est de nouveau active.' });
  };

  const handleStop = async () => {
    if (!currentSession) return;
    await stopSession(currentSession.id);
    toast({ title: 'Inventaire arrêté', description: 'Le comptage est figé et reste révisable avant application.' });
  };

  const handleCancel = async () => {
    if (!currentSession) return;
    await cancelSession(currentSession.id);
    toast({ title: 'Inventaire annulé', description: 'La session reste visible dans l’historique.' });
  };

  const handleCloseSession = async () => {
    if (!currentSession) return;
    try {
      await closeSession(currentSession.id);
      toast({ title: 'Comptage clôturé', description: 'Vous pouvez maintenant revoir la synthèse avant validation.' });
    } catch (error: unknown) {
      toast({ title: 'Clôture impossible', description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  const handleApply = async () => {
    if (!currentSession) return;
    const result = await applySession(currentSession.id);
    const summary = result?.[0];
    setConfirmApplyOpen(false);

    if (summary?.blocked_reserved_rows) {
      toast({
        title: 'Attention réservations',
        description: `${summary.blocked_reserved_rows} pièce(s) inventoriée(s) sous la quantité réservée ont été signalées dans les logs.`,
      });
    }
  };

  const handleScan = async () => {
    if (!currentSession) return;
    const codes = scanCodes.split(/\s+/).map((code) => code.trim()).filter(Boolean);
    if (!codes.length) return;
    const result = await bulkScanCodes(currentSession.id, codes);
    setScanCodes('');

    if (result.unknownCodes.length) {
      toast({
        title: 'Codes inconnus détectés',
        description: `${result.unknownCodes.length} code(s) non reconnus.`,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Scans enregistrés', description: `${codes.length} code(s) ont été traités.` });
    }
  };

  const sessionItemsForTab = useMemo(() => {
    switch (activeTab) {
      case 'discrepancies':
        return visibleDiscrepancies;
      case 'missing':
        return missingItems;
      case 'overwritten':
        return overwrittenItems;
      default:
        return filteredItems;
    }
  }, [activeTab, filteredItems, missingItems, overwrittenItems, visibleDiscrepancies]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inventaire</h2>
          <p className="text-sm text-muted-foreground">
            Comparez le stock physique au stock Fixway, ajustez les quantités et sécurisez l’application finale.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setCreateOpen(true)}>
            <ClipboardList className="h-4 w-4" />
            Lancer un inventaire
          </Button>
          {currentSession && (
            <>
              <Button variant="outline" onClick={() => printInventoryDocument({ session: currentSession, items, variant: 'summary' })}>
                <Printer className="h-4 w-4" />
                Synthèse
              </Button>
              <Button variant="outline" onClick={() => printInventoryDocument({ session: currentSession, items, variant: 'count-sheet' })}>
                <FileSpreadsheet className="h-4 w-4" />
                Feuille papier
              </Button>
              <Button variant="outline" onClick={() => printInventoryDocument({ session: currentSession, items, variant: 'missing' })}>
                <Archive className="h-4 w-4" />
                Manquants
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Références</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-semibold">{currentSession?.total_items || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Progression</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-semibold">{Math.round(completionRate)}%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Valeur non retrouvée</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-semibold">{currency(currentSession?.missing_total_cost || 0)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Écart global</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-semibold">{currency(currentSession?.variance_total_cost || 0)}</div></CardContent>
        </Card>
      </div>

      {viewMode === 'list' || !currentSession ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sessions d'inventaire</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
                Aucun inventaire pour le moment. Cliquez sur « Lancer un inventaire » pour commencer.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => openSession(session.id)}
                    className="w-full rounded-md border p-4 text-left transition-colors hover:bg-muted/50 hover:border-primary"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{session.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {INVENTORY_MODE_LABELS[session.mode]} · {new Date(session.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <Badge variant={statusBadgeVariant[session.status] || 'outline'}>
                        {INVENTORY_STATUS_LABELS[session.status]}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Comptés:</span> {session.counted_items}/{session.total_items}</div>
                      <div><span className="text-muted-foreground">Manquants:</span> {session.missing_items}</div>
                      <div><span className="text-muted-foreground">Écart:</span> {currency(session.variance_total_cost)}</div>
                    </div>
                    <div className="mt-3 text-xs text-primary font-medium">Cliquer pour ouvrir →</div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
      <div className="space-y-6">
        <Button variant="outline" size="sm" onClick={goBackToList}>
          <ArrowLeft className="h-4 w-4" /> Retour à la liste des inventaires
        </Button>

      <div className="grid gap-6">
        <Card className="hidden">
          <CardHeader>
            <CardTitle className="text-base">Sessions & historique</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ScrollArea className="h-[680px] pr-3">
              <div className="space-y-3">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => setSelectedSessionId(session.id)}
                    className={cn(
                      'w-full rounded-md border p-3 text-left transition-colors hover:bg-muted/50',
                      currentSession?.id === session.id && 'border-primary bg-primary/5',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{session.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {INVENTORY_MODE_LABELS[session.mode]} · {new Date(session.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                      <Badge variant={statusBadgeVariant[session.status] || 'outline'}>
                        {INVENTORY_STATUS_LABELS[session.status]}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div>{session.counted_items}/{session.total_items}</div>
                      <div>{session.missing_items} manquantes</div>
                      <div>{currency(session.variance_total_cost)}</div>
                    </div>
                  </button>
                ))}
                {!sessions.length && (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Aucun inventaire pour le moment.
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-4 w-4" />
                    {currentSession ? currentSession.name : 'Aucune session sélectionnée'}
                  </CardTitle>
                  {currentSession && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {INVENTORY_MODE_LABELS[currentSession.mode]} · {INVENTORY_STATUS_LABELS[currentSession.status]}
                    </p>
                  )}
                </div>
                {currentSession && (
                  <div className="flex flex-wrap gap-2">
                    {currentSession.status === 'paused' ? (
                      <Button variant="outline" onClick={handleResume}><PlayCircle className="h-4 w-4" />Reprendre</Button>
                    ) : canEditSession ? (
                      <Button variant="outline" onClick={handlePause}><PauseCircle className="h-4 w-4" />Pause</Button>
                    ) : null}
                    {currentSession.mode === 'assisted' && canEditSession && (
                      <Button variant="outline" onClick={() => setAssistedOpen(true)}>
                        <ClipboardList className="h-4 w-4" />Mode assisté
                      </Button>
                    )}
                    {canEditSession && (
                      <Button variant="outline" onClick={handleCloseSession} disabled={!canCloseSession}>
                        Clôturer le comptage
                      </Button>
                    )}
                    {canEditSession && (
                      <Button variant="outline" onClick={handleStop}><ShieldAlert className="h-4 w-4" />Arrêter</Button>
                    )}
                    {currentSession.status !== 'applied' && currentSession.status !== 'cancelled' && (
                      <Button variant="outline" onClick={handleCancel}>Annuler</Button>
                    )}
                    {canApplyStock && currentSession.status !== 'applied' && currentSession.status !== 'cancelled' && (
                      <Button onClick={() => setConfirmApplyOpen(true)} disabled={!canApplySession}>Appliquer le stock</Button>
                    )}
                    {canDeleteSession && (
                      <Button variant="destructive" onClick={() => setPendingDeleteId(currentSession.id)}>
                        <Trash2 className="h-4 w-4" />Supprimer
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {currentSession ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-md bg-muted/50 p-4">
                    <div className="text-sm text-muted-foreground">Stock théorique</div>
                    <div className="mt-2 text-2xl font-semibold">{currency(currentSession.expected_total_cost)}</div>
                  </div>
                  <div className="rounded-md bg-muted/50 p-4">
                    <div className="text-sm text-muted-foreground">Stock inventorié</div>
                    <div className="mt-2 text-2xl font-semibold">{currency(currentSession.counted_total_cost)}</div>
                  </div>
                  <div className="rounded-md bg-muted/50 p-4">
                    <div className="text-sm text-muted-foreground">Lignes restantes</div>
                    <div className="mt-2 text-2xl font-semibold">{stats.pendingItems}</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Sélectionnez un inventaire pour commencer.</div>
              )}
            </CardContent>
          </Card>

          {currentSession && (
            <InventorySessionSummary
              pendingCount={pendingItems.length}
              exactCount={exactMatchItems.length}
              adjustedCount={adjustedItems.length}
              missingCount={missingItems.length}
              overstockCount={overstockItems.length}
              varianceValue={currentSession.variance_total_cost}
              overwrittenItems={overwrittenItems}
            />
          )}

          {currentSession?.mode === 'scan' && canEditSession && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><ScanLine className="h-4 w-4" />Saisie scan / QR / SKU</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={scanCodes}
                  onChange={(event) => setScanCodes(event.target.value)}
                  placeholder="Scannez ou collez une succession de SKU, un code par ligne ou séparé par des espaces"
                  rows={5}
                />
                <Button onClick={handleScan}><Barcode className="h-4 w-4" />Traiter les codes</Button>
                {lastScanBatch && (
                  <div className="rounded-md border p-3 text-sm text-muted-foreground">
                    <div className="font-medium text-foreground">Dernier lot traité</div>
                    <div className="mt-1">{lastScanBatch.totalCodes} code(s) · {lastScanBatch.matchedCodes.length} reconnu(s)</div>
                    {!!lastScanBatch.ambiguousCodes.length && (
                      <div className="mt-1">SKU présents plusieurs fois : {lastScanBatch.ambiguousCodes.join(', ')}</div>
                    )}
                    {!!lastScanBatch.unknownCodes.length && (
                      <div className="mt-1">Codes inconnus : {lastScanBatch.unknownCodes.join(', ')}</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contrôle du rapprochement</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as InventoryReviewTab)} className="space-y-4">
                <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
                  <TabsTrigger value="counting">Comptage</TabsTrigger>
                  <TabsTrigger value="discrepancies">Écarts</TabsTrigger>
                  <TabsTrigger value="missing">Manquants</TabsTrigger>
                  <TabsTrigger value="overwritten">Stocks écrasés</TabsTrigger>
                  <TabsTrigger value="journal">Journal</TabsTrigger>
                </TabsList>

                <TabsContent value="counting" className="mt-0">
                  <InventoryManualEditor
                    items={sessionItemsForTab}
                    editable={canEditSession}
                    searchTerm={manualSearch}
                    onSearchTermChange={setManualSearch}
                    draftQuantities={draftQuantities}
                    onDraftQuantityChange={setDraftQuantity}
                    draftNotes={draftNotes}
                    onDraftNoteChange={setDraftNote}
                    onApplyQuantity={(item) => handleApplyQuantity(item, 'manual')}
                    onMarkFound={(item) => updateItem({
                      sessionId: item.inventory_session_id,
                      itemId: item.id,
                      countedQuantity: item.expected_quantity,
                      lineStatus: 'found',
                      entryMethod: 'manual',
                    })}
                    onMarkMissing={(item) => markItemMissing(item.inventory_session_id, item.id, 'manual')}
                    onReset={(item) => resetItem(item.inventory_session_id, item.id)}
                    onSaveNote={handleSaveNote}
                    activeFilter={manualFilter}
                    onActiveFilterChange={setManualFilter}
                  />
                </TabsContent>

                <TabsContent value="discrepancies" className="mt-0">
                  <InventoryManualEditor
                    items={sessionItemsForTab}
                    editable={canEditSession}
                    searchTerm={manualSearch}
                    onSearchTermChange={setManualSearch}
                    draftQuantities={draftQuantities}
                    onDraftQuantityChange={setDraftQuantity}
                    draftNotes={draftNotes}
                    onDraftNoteChange={setDraftNote}
                    onApplyQuantity={(item) => handleApplyQuantity(item, 'manual')}
                    onMarkFound={(item) => updateItem({
                      sessionId: item.inventory_session_id,
                      itemId: item.id,
                      countedQuantity: item.expected_quantity,
                      lineStatus: 'found',
                      entryMethod: 'manual',
                    })}
                    onMarkMissing={(item) => markItemMissing(item.inventory_session_id, item.id, 'manual')}
                    onReset={(item) => resetItem(item.inventory_session_id, item.id)}
                    onSaveNote={handleSaveNote}
                    activeFilter="adjusted"
                    onActiveFilterChange={setManualFilter}
                  />
                </TabsContent>

                <TabsContent value="missing" className="mt-0">
                  <InventoryManualEditor
                    items={sessionItemsForTab}
                    editable={canEditSession}
                    searchTerm={manualSearch}
                    onSearchTermChange={setManualSearch}
                    draftQuantities={draftQuantities}
                    onDraftQuantityChange={setDraftQuantity}
                    draftNotes={draftNotes}
                    onDraftNoteChange={setDraftNote}
                    onApplyQuantity={(item) => handleApplyQuantity(item, 'manual')}
                    onMarkFound={(item) => updateItem({
                      sessionId: item.inventory_session_id,
                      itemId: item.id,
                      countedQuantity: resolveDraftQuantity(item),
                      lineStatus: resolveDraftQuantity(item) === item.expected_quantity ? 'found' : 'adjusted',
                      entryMethod: 'manual',
                    })}
                    onMarkMissing={(item) => markItemMissing(item.inventory_session_id, item.id, 'manual')}
                    onReset={(item) => resetItem(item.inventory_session_id, item.id)}
                    onSaveNote={handleSaveNote}
                    activeFilter="missing"
                    onActiveFilterChange={setManualFilter}
                  />
                </TabsContent>

                <TabsContent value="overwritten" className="mt-0">
                  <div className="space-y-3">
                    {overwrittenItems.map((item) => (
                      <div key={item.id} className="rounded-md border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="font-medium">{item.part_name}</div>
                            <div className="text-sm text-muted-foreground">
                              Théorique {item.expected_quantity} · Comptée {item.counted_quantity ?? '—'}
                            </div>
                          </div>
                          <Badge variant="outline">
                            {item.applied_previous_quantity ?? item.expected_quantity} → {item.applied_new_quantity ?? item.counted_quantity ?? 0}
                          </Badge>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          Impact valeur : {currency((item.variance_quantity || ((item.counted_quantity ?? 0) - item.expected_quantity)) * item.unit_cost)}
                        </div>
                      </div>
                    ))}
                    {!overwrittenItems.length && <div className="text-sm text-muted-foreground">Aucun stock écrasé pour l’instant.</div>}
                  </div>
                </TabsContent>

                <TabsContent value="journal" className="mt-0">
                  <ScrollArea className="h-[460px] pr-3">
                    <div className="space-y-3">
                      {logs.map((log) => (
                        <div key={log.id} className="rounded-md border p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-medium">{getLogLabel(log)}</div>
                            <div className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString('fr-FR')}</div>
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {log.changed_by_name}
                            {typeof log.metadata?.item_name === 'string' ? ` · ${log.metadata.item_name}` : ''}
                          </div>
                          {(log.old_value || log.new_value) && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {log.old_value ? `Avant: ${log.old_value}` : ''}
                              {log.old_value && log.new_value ? ' · ' : ''}
                              {log.new_value ? `Après: ${log.new_value}` : ''}
                            </div>
                          )}
                        </div>
                      ))}
                      {!logs.length && <div className="text-sm text-muted-foreground">Aucune action enregistrée.</div>}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {currentSession && currentSession.status === 'completed' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Validation finale</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div>Les produits manquants passeront à 0 et les écarts écraseront le stock actuel Fixway.</div>
                <div>{understockItems.length} ligne(s) sont sous le stock théorique et {overstockItems.length} en surplus.</div>
                {!!stats.reservedConflicts && (
                  <div>{stats.reservedConflicts} ligne(s) sont sous la quantité réservée : vérifiez avant application.</div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </div>
      )}

      {currentSession && (
        <InventoryAssistedDialog
          open={assistedOpen}
          onOpenChange={setAssistedOpen}
          session={currentSession}
          items={items}
          onCount={async (itemId, quantity) => {
            const item = items.find((entry) => entry.id === itemId);
            if (!item) return;
            await updateItem({
              sessionId: currentSession.id,
              itemId: item.id,
              countedQuantity: quantity,
              lineStatus: quantity === item.expected_quantity ? 'found' : quantity === 0 ? 'missing' : 'adjusted',
              entryMethod: 'assisted',
            });
          }}
          onMissing={async (itemId) => {
            await markItemMissing(currentSession.id, itemId, 'assisted');
          }}
          onPause={handlePause}
          onClose={async () => {
            await handleCloseSession();
            setAssistedOpen(false);
          }}
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel inventaire</DialogTitle>
            <DialogDescription>
              Fixez un instantané du stock actuel et choisissez le mode de saisie adapté.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inventory-name">Nom</Label>
              <input id="inventory-name" value={createName} onChange={(event) => setCreateName(event.target.value)} placeholder="Inventaire annuel" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={createMode} onValueChange={(value: InventoryMode) => setCreateMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assisted">Assisté</SelectItem>
                  <SelectItem value="scan">Scan / QR / SKU</SelectItem>
                  <SelectItem value="manual">Saisie manuelle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Layers className="h-4 w-4" />Catégories à inventorier</Label>
              {categories.length === 0 ? (
                <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                  Aucune catégorie. L'inventaire portera sur toutes les pièces.
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto rounded-md border p-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={createCategoryIds.length === 0}
                      onCheckedChange={() => setCreateCategoryIds([])}
                    />
                    <span className="font-medium">Toutes les catégories</span>
                  </label>
                  {categories.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={createCategoryIds.includes(cat.id)}
                        onCheckedChange={() => toggleCategoryId(cat.id)}
                      />
                      <span className="inline-block h-3 w-3 rounded-full border" style={{ backgroundColor: cat.color ?? '#9CA3AF' }} />
                      {cat.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="inventory-notes">Notes</Label>
              <Textarea id="inventory-notes" value={createNotes} onChange={(event) => setCreateNotes(event.target.value)} rows={3} placeholder="Commentaire de départ, zone ou consignes de comptage" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !createName.trim()}>{isSubmitting ? 'Création...' : 'Créer la session'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet inventaire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette suppression est réservée aux brouillons ou inventaires annulés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingDeleteId) return;
                await deleteSession(pendingDeleteId);
                setPendingDeleteId(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmApplyOpen} onOpenChange={setConfirmApplyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Appliquer cet inventaire au stock Fixway ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les produits manquants passeront à 0, les écarts écraseront les quantités actuelles, et cette action impactera immédiatement les modules pièces, commandes, devis et SAV.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>{pendingItems.length} ligne(s) en attente</div>
            <div>{missingItems.length} produit(s) manquant(s)</div>
            <div>{overwrittenItems.length} stock(s) qui seront écrasés</div>
            <div>Valeur d’écart globale : {currency(currentSession?.variance_total_cost || 0)}</div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleApply} disabled={!canApplySession || !canApplyStock}>
              Appliquer le stock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
