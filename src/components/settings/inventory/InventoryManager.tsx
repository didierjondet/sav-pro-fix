import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useInventory } from '@/hooks/useInventory';
import { usePartCategories } from '@/hooks/usePartCategories';
import { cn } from '@/lib/utils';
import { Layers, Plus, X } from 'lucide-react';
import { InventoryAssistedDialog } from './InventoryAssistedDialog';
import { InventoryGeneralTab } from './InventoryGeneralTab';
import { InventorySessionTab } from './InventorySessionTab';
import {
  INVENTORY_STATUS_LABELS,
  type InventoryMode,
  type InventorySessionItem,
} from './types';

const OPEN_TABS_KEY = 'fixway_inventory_open_tabs';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Une erreur est survenue.';
}

export function InventoryManager({ canApplyStock }: { canApplyStock: boolean }) {
  const {
    shopId,
    sessions,
    currentSession,
    items,
    logs,
    setSelectedSessionId,
    createSession,
    updateItem,
    markItemMissing,
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

  // ----- Tabs state -----
  const [activeTab, setActiveTab] = useState<string>('general');
  const [openTabIds, setOpenTabIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(OPEN_TABS_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(OPEN_TABS_KEY, JSON.stringify(openTabIds));
    } catch { /* noop */ }
  }, [openTabIds]);

  // Sync currentSessionId with active tab
  useEffect(() => {
    if (activeTab !== 'general') {
      setSelectedSessionId(activeTab);
    }
  }, [activeTab, setSelectedSessionId]);

  // Clean up tabs whose session no longer exists
  useEffect(() => {
    if (!sessions.length) return;
    const existing = new Set(sessions.map((s) => s.id));
    setOpenTabIds((prev) => prev.filter((id) => existing.has(id)));
    if (activeTab !== 'general' && !existing.has(activeTab)) {
      setActiveTab('general');
    }
  }, [sessions, activeTab]);

  // Handle ?session=<id> deep link from Parts page
  const [searchParams, setSearchParams] = useSearchParams();
  const [focusedSessionId, setFocusedSessionId] = useState<string | null>(null);
  const handledRef = useRef<string | null>(null);
  useEffect(() => {
    const sid = searchParams.get('session');
    if (!sid || handledRef.current === sid) return;
    if (!sessions.length) return;
    handledRef.current = sid;
    setActiveTab('general');
    setFocusedSessionId(sid);
    const next = new URLSearchParams(searchParams);
    next.delete('session');
    setSearchParams(next, { replace: true });
  }, [searchParams, sessions, setSearchParams]);

  const openSession = (sessionId: string) => {
    setOpenTabIds((prev) => (prev.includes(sessionId) ? prev : [...prev, sessionId]));
    setActiveTab(sessionId);
  };

  const closeTab = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenTabIds((prev) => prev.filter((id) => id !== sessionId));
    if (activeTab === sessionId) setActiveTab('general');
  };

  // ----- Dialogs / drafts -----
  const [createOpen, setCreateOpen] = useState(false);
  const [assistedOpen, setAssistedOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createMode, setCreateMode] = useState<InventoryMode>('assisted');
  const [createNotes, setCreateNotes] = useState('');
  const [createCategoryIds, setCreateCategoryIds] = useState<string[]>([]);
  const [scanCodes, setScanCodes] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [confirmApplyOpen, setConfirmApplyOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftQuantities, setDraftQuantities] = useState<Record<string, string>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});

  const tabSessions = useMemo(
    () => openTabIds.map((id) => sessions.find((s) => s.id === id)).filter(Boolean) as typeof sessions,
    [openTabIds, sessions],
  );

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      const newId = await createSession({
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
      if (newId) openSession(newId);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCategoryId = (id: string) => {
    setCreateCategoryIds((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  };

  const setDraftQuantity = (id: string, v: string) => setDraftQuantities((c) => ({ ...c, [id]: v }));
  const setDraftNote = (id: string, v: string) => setDraftNotes((c) => ({ ...c, [id]: v }));

  const resolveDraftQuantity = (item: InventorySessionItem) => {
    const value = draftQuantities[item.id] ?? (item.counted_quantity ?? item.expected_quantity).toString();
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : item.counted_quantity ?? item.expected_quantity;
  };

  const clearDrafts = (id: string) => {
    setDraftQuantities((c) => { const n = { ...c }; delete n[id]; return n; });
    setDraftNotes((c) => { const n = { ...c }; delete n[id]; return n; });
  };

  const handleApplyQuantity = async (item: InventorySessionItem) => {
    const quantity = resolveDraftQuantity(item);
    const lineStatus =
      quantity === item.expected_quantity && quantity > 0 ? 'found' : quantity === 0 ? 'missing' : 'adjusted';
    await updateItem({
      sessionId: item.inventory_session_id,
      itemId: item.id,
      countedQuantity: quantity,
      lineStatus,
      entryMethod: 'manual',
      notes: draftNotes[item.id] ?? item.notes ?? null,
    });
    clearDrafts(item.id);
    toast({ title: 'Quantité enregistrée', description: `${item.part_name} : ${quantity}.` });
  };

  const handleValidateExpected = async (item: InventorySessionItem) => {
    await updateItem({
      sessionId: item.inventory_session_id,
      itemId: item.id,
      countedQuantity: item.expected_quantity,
      lineStatus: 'found',
      entryMethod: 'manual',
      notes: draftNotes[item.id] ?? item.notes ?? null,
    });
    clearDrafts(item.id);
    toast({ title: 'Pièce validée', description: `${item.part_name}.` });
  };

  const handleMarkMissing = async (item: InventorySessionItem) => {
    await updateItem({
      sessionId: item.inventory_session_id,
      itemId: item.id,
      countedQuantity: 0,
      lineStatus: 'missing',
      entryMethod: 'manual',
      notes: draftNotes[item.id] ?? item.notes ?? null,
    });
    clearDrafts(item.id);
    toast({ title: 'Pièce non trouvée', description: `${item.part_name}.`, variant: 'destructive' });
  };

  const handlePause = async () => { if (currentSession) { await pauseSession(currentSession.id); toast({ title: 'Pause' }); } };
  const handleResume = async () => { if (currentSession) { await resumeSession(currentSession.id); toast({ title: 'Reprise' }); } };
  const handleStop = async () => { if (currentSession) { await stopSession(currentSession.id); toast({ title: 'Arrêté' }); } };
  const handleCancel = async () => { if (currentSession) { await cancelSession(currentSession.id); toast({ title: 'Annulé' }); } };

  const handleClose = async () => {
    if (!currentSession) return;
    try {
      await closeSession(currentSession.id);
      toast({ title: 'Comptage clôturé' });
    } catch (e) {
      toast({ title: 'Clôture impossible', description: getErrorMessage(e), variant: 'destructive' });
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
        description: `${summary.blocked_reserved_rows} pièce(s) sous quantité réservée signalée(s).`,
      });
    }
    // Sortir l'onglet de l'inventaire appliqué
    if (currentSession) {
      setOpenTabIds((prev) => prev.filter((id) => id !== currentSession.id));
      setActiveTab('general');
    }
  };

  const handleScan = async () => {
    if (!currentSession) return;
    const codes = scanCodes.split(/\s+/).map((c) => c.trim()).filter(Boolean);
    if (!codes.length) return;
    const result = await bulkScanCodes(currentSession.id, codes);
    setScanCodes('');
    if (result.unknownCodes.length) {
      toast({ title: 'Codes inconnus', description: `${result.unknownCodes.length} code(s).`, variant: 'destructive' });
    } else {
      toast({ title: 'Scans enregistrés', description: `${codes.length} code(s).` });
    }
  };

  const handleLiveScan = async (code: string) => {
    if (!currentSession) return { matched: false };
    const result = await bulkScanCodes(currentSession.id, [code]);
    const matched = result.matchedCodes.length > 0;
    const normalized = code.trim().toUpperCase();
    const item = items.find(
      (i) => (i.part_sku || '').trim().toUpperCase() === normalized,
    );
    return { matched, itemName: item?.part_name };
  };

  return (
    <div className="space-y-4">
      {/* Onglets */}
      <div className="flex items-center gap-1 border-b overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={cn(
            'shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'general'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          Général
        </button>

        {tabSessions.map((s) => {
          const dotColor =
            s.status === 'in_progress'
              ? 'bg-success animate-pulse'
              : s.status === 'paused'
                ? 'bg-warning'
                : s.status === 'completed'
                  ? 'bg-primary'
                  : 'bg-muted-foreground';
          return (
            <div
              key={s.id}
              className={cn(
                'shrink-0 flex items-center gap-2 px-3 py-2.5 border-b-2 transition-colors cursor-pointer',
                activeTab === s.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setActiveTab(s.id)}
            >
              <span className={`h-2 w-2 rounded-full ${dotColor}`} />
              <span className="text-sm font-medium max-w-[180px] truncate">{s.name}</span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                {INVENTORY_STATUS_LABELS[s.status]}
              </span>
              <button
                type="button"
                onClick={(e) => closeTab(s.id, e)}
                className="ml-1 rounded p-0.5 hover:bg-muted"
                aria-label="Fermer l'onglet"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="shrink-0 ml-2 flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-dashed text-muted-foreground hover:text-foreground hover:border-primary"
          title="Lancer un nouvel inventaire"
        >
          <Plus className="h-4 w-4" /> Nouvel inventaire
        </button>
      </div>

      {/* Contenu */}
      {activeTab === 'general' ? (
        <InventoryGeneralTab
          sessions={sessions}
          shopId={shopId}
          onOpenSession={openSession}
          onCreate={() => setCreateOpen(true)}
          focusedSessionId={focusedSessionId}
          onFocusedHandled={() => setFocusedSessionId(null)}
        />
      ) : currentSession && currentSession.id === activeTab ? (
        <InventorySessionTab
          session={currentSession}
          items={items}
          logs={logs}
          canApplyStock={canApplyStock}
          canEditSession={canEditSession}
          canCloseSession={canCloseSession}
          canApplySession={canApplySession}
          canDeleteSession={canDeleteSession}
          completionRate={completionRate}
          pendingItems={pendingItems}
          exactMatchItems={exactMatchItems}
          adjustedItems={adjustedItems}
          missingItems={missingItems}
          overstockItems={overstockItems}
          understockItems={understockItems}
          overwrittenItems={overwrittenItems}
          reservedConflicts={stats.reservedConflicts}
          scanCodes={scanCodes}
          onScanCodesChange={setScanCodes}
          onScan={handleScan}
          onLiveScan={handleLiveScan}
          lastScanBatch={lastScanBatch}
          draftQuantities={draftQuantities}
          onDraftQuantityChange={setDraftQuantity}
          draftNotes={draftNotes}
          onDraftNoteChange={setDraftNote}
          onApplyQuantity={handleApplyQuantity}
          onMarkFound={handleValidateExpected}
          onMarkMissing={handleMarkMissing}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
          onCancel={handleCancel}
          onClose={handleClose}
          onOpenAssisted={() => setAssistedOpen(true)}
          onAskApply={() => setConfirmApplyOpen(true)}
          onAskDelete={() => setPendingDeleteId(currentSession.id)}
        />
      ) : (
        <div className="text-sm text-muted-foreground p-8 text-center">Chargement de la session…</div>
      )}

      {/* Dialog assisté */}
      {currentSession && (
        <InventoryAssistedDialog
          open={assistedOpen}
          onOpenChange={setAssistedOpen}
          session={currentSession}
          items={items}
          onCount={async (itemId, quantity) => {
            const item = items.find((e) => e.id === itemId);
            if (!item) return;
            await updateItem({
              sessionId: currentSession.id,
              itemId: item.id,
              countedQuantity: quantity,
              lineStatus: quantity === item.expected_quantity ? 'found' : quantity === 0 ? 'missing' : 'adjusted',
              entryMethod: 'assisted',
            });
          }}
          onMissing={async (itemId) => { await markItemMissing(currentSession.id, itemId, 'assisted'); }}
          onPause={handlePause}
          onClose={async () => { try { await handleClose(); setAssistedOpen(false); } catch { /* noop */ } }}
        />
      )}

      {/* Création */}
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
              <input
                id="inventory-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Inventaire annuel"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={createMode} onValueChange={(v: InventoryMode) => setCreateMode(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="assisted">Assisté</SelectItem>
                  <SelectItem value="scan">Scan / QR / SKU</SelectItem>
                  <SelectItem value="manual">Saisie manuelle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Layers className="h-4 w-4" />Catégories</Label>
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
                    <span className="font-medium">Toutes</span>
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
              <Textarea id="inventory-notes" value={createNotes} onChange={(e) => setCreateNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !createName.trim()}>
              {isSubmitting ? 'Création...' : 'Créer la session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suppression */}
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
                const idToDel = pendingDeleteId;
                await deleteSession(idToDel);
                setOpenTabIds((prev) => prev.filter((id) => id !== idToDel));
                if (activeTab === idToDel) setActiveTab('general');
                setPendingDeleteId(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Application */}
      <AlertDialog open={confirmApplyOpen} onOpenChange={setConfirmApplyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Appliquer cet inventaire au stock Fixway ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les produits manquants passeront à 0, les écarts écraseront les quantités actuelles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>{pendingItems.length} ligne(s) en attente</div>
            <div>{missingItems.length} produit(s) manquant(s)</div>
            <div>{overwrittenItems.length} stock(s) qui seront écrasés</div>
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
