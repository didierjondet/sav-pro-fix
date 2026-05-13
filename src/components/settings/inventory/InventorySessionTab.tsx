import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Archive,
  Barcode,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  History,
  PauseCircle,
  PlayCircle,
  Printer,
  ScanLine,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { printInventoryDocument } from '@/lib/inventoryPrint';
import { InventoryJournalDialog } from './InventoryJournalDialog';
import { InventoryManualEditor, type InventoryReviewTab } from './InventoryManualEditor';
import { InventorySessionSummary } from './InventorySessionSummary';
import {
  INVENTORY_MODE_LABELS,
  INVENTORY_STATUS_LABELS,
  type InventoryAuditLog,
  type InventoryMode,
  type InventorySession,
  type InventorySessionItem,
} from './types';

function currency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value || 0);
}

const STATUS_BANNER: Record<string, string> = {
  in_progress: 'bg-primary/10 border-primary/40 text-primary',
  paused: 'bg-warning/10 border-warning/40 text-warning-foreground',
  completed: 'bg-success/10 border-success/40 text-success',
  applied: 'bg-muted border-border text-muted-foreground',
  cancelled: 'bg-destructive/10 border-destructive/40 text-destructive',
  draft: 'bg-card border-border text-foreground',
};

const ACTION_LABELS: Record<string, string> = {
  session_paused: 'Pause',
  session_resumed: 'Reprise',
  session_stopped: 'Arrêt',
  session_completed: 'Clôture',
  session_cancelled: 'Annulation',
  session_applied: 'Application stock',
  item_updated: 'Ligne modifiée',
  bulk_scan: 'Lot de scan',
};

export interface InventorySessionTabProps {
  session: InventorySession;
  items: InventorySessionItem[];
  logs: InventoryAuditLog[];
  canApplyStock: boolean;
  canEditSession: boolean;
  canCloseSession: boolean;
  canApplySession: boolean;
  canDeleteSession: boolean;
  completionRate: number;
  pendingItems: InventorySessionItem[];
  exactMatchItems: InventorySessionItem[];
  adjustedItems: InventorySessionItem[];
  missingItems: InventorySessionItem[];
  overstockItems: InventorySessionItem[];
  understockItems: InventorySessionItem[];
  overwrittenItems: InventorySessionItem[];
  reservedConflicts: number;
  scanCodes: string;
  onScanCodesChange: (v: string) => void;
  onScan: () => void;
  lastScanBatch: { totalCodes: number; matchedCodes: string[]; ambiguousCodes: string[]; unknownCodes: string[] } | null;
  draftQuantities: Record<string, string>;
  onDraftQuantityChange: (id: string, v: string) => void;
  draftNotes: Record<string, string>;
  onDraftNoteChange: (id: string, v: string) => void;
  onApplyQuantity: (item: InventorySessionItem) => void;
  onMarkFound: (item: InventorySessionItem) => void;
  onMarkMissing: (item: InventorySessionItem) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onCancel: () => void;
  onClose: () => void;
  onOpenAssisted: () => void;
  onAskApply: () => void;
  onAskDelete: () => void;
}

export function InventorySessionTab(props: InventorySessionTabProps) {
  const {
    session,
    items,
    logs,
    canApplyStock,
    canEditSession,
    canCloseSession,
    canApplySession,
    canDeleteSession,
    completionRate,
    pendingItems,
    exactMatchItems,
    adjustedItems,
    missingItems,
    overstockItems,
    understockItems,
    overwrittenItems,
    reservedConflicts,
    scanCodes,
    onScanCodesChange,
    onScan,
    lastScanBatch,
    draftQuantities,
    onDraftQuantityChange,
    draftNotes,
    onDraftNoteChange,
    onApplyQuantity,
    onMarkFound,
    onMarkMissing,
    onPause,
    onResume,
    onStop,
    onCancel,
    onClose,
    onOpenAssisted,
    onAskApply,
    onAskDelete,
  } = props;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'found' | 'missing' | 'adjusted'>('all');
  const [reviewTab, setReviewTab] = useState<InventoryReviewTab>('discrepancies');
  const [journalOpen, setJournalOpen] = useState(false);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !term ||
        [item.part_name, item.part_reference, item.part_sku, item.part_supplier]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term));
      if (!matchesSearch) return false;
      switch (filter) {
        case 'pending':
          return item.line_status === 'pending';
        case 'found':
          return item.line_status === 'found';
        case 'missing':
          return item.line_status === 'missing';
        case 'adjusted':
          return item.line_status === 'adjusted';
        default:
          return true;
      }
    });
  }, [items, search, filter]);

  const visibleDiscrepancies = useMemo(
    () => adjustedItems.filter((i) => i.line_status !== 'missing'),
    [adjustedItems],
  );

  const isComplete = completionRate >= 100 && pendingItems.length === 0;
  const isFinalized = session.status === 'applied' || session.status === 'cancelled';

  return (
    <div className="space-y-6">
      {/* Bandeau d'état */}
      <div className={cn('rounded-lg border-2 p-4', STATUS_BANNER[session.status] || STATUS_BANNER.draft)}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{session.name}</h2>
              <Badge variant="outline">{INVENTORY_STATUS_LABELS[session.status]}</Badge>
              {isComplete && session.status !== 'applied' && (
                <Badge className="bg-success text-success-foreground">
                  <CheckCircle2 className="h-3 w-3" /> Comptage terminé
                </Badge>
              )}
            </div>
            <div className="text-xs">
              {INVENTORY_MODE_LABELS[session.mode]} · créé le{' '}
              {new Date(session.created_at).toLocaleDateString('fr-FR')} · progression {Math.round(completionRate)}%
            </div>
            <div className="h-1.5 w-full max-w-md rounded-full bg-background/50 overflow-hidden mt-1">
              <div className="h-full bg-current transition-all" style={{ width: `${completionRate}%` }} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setJournalOpen(true)}>
              <History className="h-4 w-4" />Journal log
            </Button>
            {session.status === 'paused' ? (
              <Button variant="outline" size="sm" onClick={onResume}><PlayCircle className="h-4 w-4" />Reprendre</Button>
            ) : canEditSession ? (
              <Button variant="outline" size="sm" onClick={onPause}><PauseCircle className="h-4 w-4" />Pause</Button>
            ) : null}
            {session.mode === 'assisted' && canEditSession && (
              <Button variant="outline" size="sm" onClick={onOpenAssisted}>
                <ClipboardList className="h-4 w-4" />Mode assisté
              </Button>
            )}
            {canEditSession && (
              <Button
                variant={isComplete ? 'default' : 'outline'}
                size="sm"
                onClick={onClose}
                disabled={!canCloseSession}
              >
                <CheckCircle2 className="h-4 w-4" />
                Clôturer le comptage
              </Button>
            )}
            {canEditSession && (
              <Button variant="outline" size="sm" onClick={onStop}><ShieldAlert className="h-4 w-4" />Arrêter</Button>
            )}
            {!isFinalized && (
              <Button variant="outline" size="sm" onClick={onCancel}>Annuler</Button>
            )}
            {canApplyStock && !isFinalized && (
              <Button size="sm" onClick={onAskApply} disabled={!canApplySession}>
                Valider et appliquer au stock
              </Button>
            )}
            {canDeleteSession && (
              <Button variant="destructive" size="sm" onClick={onAskDelete}>
                <Trash2 className="h-4 w-4" />Supprimer
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bouton d'appel à l'action si terminé */}
      {isComplete && session.status === 'in_progress' && (
        <Card className="border-success bg-success/5">
          <CardContent className="py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Toutes les pièces sont traitées. Vous pouvez clôturer l'inventaire.</span>
            </div>
            <Button onClick={onClose} disabled={!canCloseSession}>
              Clôturer maintenant
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Métriques compactes */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs">Stock théorique</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-semibold">{currency(session.expected_total_cost)}</div></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs">Stock inventorié</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-semibold">{currency(session.counted_total_cost)}</div></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs">Lignes restantes</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-semibold">{pendingItems.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs">Écart global</CardTitle></CardHeader>
          <CardContent><div className={`text-xl font-semibold ${session.variance_total_cost < 0 ? 'text-destructive' : ''}`}>
            {currency(session.variance_total_cost)}</div></CardContent></Card>
      </div>

      {/* BLOC 1 : RAPPROCHEMENT — analyse & écarts */}
      <Card>
        <CardHeader className="border-b bg-muted/30">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
              Analyse &amp; rapprochement
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => printInventoryDocument({ session, items, variant: 'summary' })}>
                <Printer className="h-4 w-4" />Synthèse
              </Button>
              <Button size="sm" variant="outline" onClick={() => printInventoryDocument({ session, items, variant: 'count-sheet' })}>
                <FileSpreadsheet className="h-4 w-4" />Feuille papier
              </Button>
              <Button size="sm" variant="outline" onClick={() => printInventoryDocument({ session, items, variant: 'missing' })}>
                <Archive className="h-4 w-4" />Manquants
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <Tabs value={reviewTab} onValueChange={(v) => setReviewTab(v as InventoryReviewTab)} className="space-y-4">
            <TabsList className="flex h-auto flex-wrap gap-2 bg-transparent p-0">
              <TabsTrigger value="discrepancies">Synthèse & écarts</TabsTrigger>
              <TabsTrigger value="missing">Manquants ({missingItems.length})</TabsTrigger>
              <TabsTrigger value="overwritten">Stocks écrasés ({overwrittenItems.length})</TabsTrigger>
              <TabsTrigger value="journal">Journal session</TabsTrigger>
            </TabsList>

            <TabsContent value="discrepancies">
              <InventorySessionSummary
                pendingCount={pendingItems.length}
                exactCount={exactMatchItems.length}
                adjustedCount={adjustedItems.length}
                missingCount={missingItems.length}
                overstockCount={overstockItems.length}
                varianceValue={session.variance_total_cost}
                overwrittenItems={overwrittenItems}
              />
              {visibleDiscrepancies.length > 0 && (
                <div className="mt-4">
                  <InventoryManualEditor
                    items={visibleDiscrepancies}
                    editable={canEditSession}
                    searchTerm=""
                    onSearchTermChange={() => {}}
                    draftQuantities={draftQuantities}
                    onDraftQuantityChange={onDraftQuantityChange}
                    draftNotes={draftNotes}
                    onDraftNoteChange={onDraftNoteChange}
                    onApplyQuantity={onApplyQuantity}
                    onMarkFound={onMarkFound}
                    onMarkMissing={onMarkMissing}
                    activeFilter="adjusted"
                    onActiveFilterChange={() => {}}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="missing">
              <InventoryManualEditor
                items={missingItems}
                editable={canEditSession}
                searchTerm=""
                onSearchTermChange={() => {}}
                draftQuantities={draftQuantities}
                onDraftQuantityChange={onDraftQuantityChange}
                draftNotes={draftNotes}
                onDraftNoteChange={onDraftNoteChange}
                onApplyQuantity={onApplyQuantity}
                onMarkFound={onMarkFound}
                onMarkMissing={onMarkMissing}
                activeFilter="missing"
                onActiveFilterChange={() => {}}
              />
            </TabsContent>

            <TabsContent value="overwritten">
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
                  </div>
                ))}
                {!overwrittenItems.length && <div className="text-sm text-muted-foreground">Aucun stock écrasé.</div>}
              </div>
            </TabsContent>

            <TabsContent value="journal">
              <ScrollArea className="h-[400px] pr-3">
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="rounded-md border p-2.5 text-sm">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{ACTION_LABELS[log.action] || log.action}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {log.changed_by_name}
                        {typeof log.metadata?.item_name === 'string' ? ` · ${log.metadata.item_name}` : ''}
                      </div>
                    </div>
                  ))}
                  {!logs.length && <div className="text-sm text-muted-foreground">Aucune action.</div>}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* BLOC 2 : COMPTAGE / saisie terrain — replié si l'inventaire est clos */}
      {(() => {
        const countingBody = (
          <CardContent className="pt-4">
            <Tabs defaultValue="manual" className="space-y-4">
              <TabsList>
                <TabsTrigger value="manual">Saisie manuelle</TabsTrigger>
                {session.mode === 'scan' && <TabsTrigger value="scan">Scan code-barres</TabsTrigger>}
              </TabsList>

              <TabsContent value="manual" className="mt-0">
                <InventoryManualEditor
                  items={filteredItems}
                  editable={canEditSession}
                  searchTerm={search}
                  onSearchTermChange={setSearch}
                  draftQuantities={draftQuantities}
                  onDraftQuantityChange={onDraftQuantityChange}
                  draftNotes={draftNotes}
                  onDraftNoteChange={onDraftNoteChange}
                  onApplyQuantity={onApplyQuantity}
                  onMarkFound={onMarkFound}
                  onMarkMissing={onMarkMissing}
                  activeFilter={filter}
                  onActiveFilterChange={setFilter}
                  compact={!canEditSession}
                />
              </TabsContent>

              {session.mode === 'scan' && (
                <TabsContent value="scan" className="mt-0 space-y-4">
                  <Textarea
                    value={scanCodes}
                    onChange={(e) => onScanCodesChange(e.target.value)}
                    placeholder="Scannez ou collez une succession de SKU"
                    rows={5}
                    disabled={!canEditSession}
                  />
                  <Button onClick={onScan} disabled={!canEditSession}>
                    <Barcode className="h-4 w-4" />Traiter les codes
                  </Button>
                  {lastScanBatch && (
                    <div className="rounded-md border p-3 text-sm text-muted-foreground">
                      <div className="font-medium text-foreground">Dernier lot</div>
                      <div className="mt-1">
                        {lastScanBatch.totalCodes} code(s) · {lastScanBatch.matchedCodes.length} reconnu(s)
                      </div>
                      {!!lastScanBatch.unknownCodes.length && (
                        <div className="mt-1">Inconnus : {lastScanBatch.unknownCodes.join(', ')}</div>
                      )}
                    </div>
                  )}
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        );

        if (canEditSession) {
          return (
            <Card>
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                  Comptage / saisie terrain
                </CardTitle>
              </CardHeader>
              {countingBody}
            </Card>
          );
        }

        return (
          <Card>
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger asChild>
                <CardHeader className="border-b bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-base flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold">2</span>
                      Voir la saisie terrain (lecture seule)
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>{countingBody}</CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })()}

      {/* Validation finale */}
      {session.status === 'completed' && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Validation finale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>{understockItems.length} ligne(s) sous le stock théorique · {overstockItems.length} en surplus.</div>
            {!!reservedConflicts && (
              <div className="text-destructive">
                {reservedConflicts} ligne(s) sous la quantité réservée — vérifiez avant application.
              </div>
            )}
            {canApplyStock && (
              <Button onClick={onAskApply} disabled={!canApplySession} className="mt-2">
                Valider et appliquer au stock
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      <InventoryJournalDialog
        open={journalOpen}
        onOpenChange={setJournalOpen}
        title={`Journal de l'inventaire — ${session.name}`}
        logs={logs}
        session={session}
      />
    </div>
  );
}
