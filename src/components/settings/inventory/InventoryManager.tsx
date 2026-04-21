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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useInventory } from '@/hooks/useInventory';
import { printInventoryDocument } from '@/lib/inventoryPrint';
import { cn } from '@/lib/utils';
import {
  Activity,
  Archive,
  Barcode,
  ClipboardList,
  FileSpreadsheet,
  PauseCircle,
  PlayCircle,
  Printer,
  RotateCcw,
  ScanLine,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { InventoryAssistedDialog } from './InventoryAssistedDialog';
import {
  INVENTORY_LINE_STATUS_LABELS,
  INVENTORY_MODE_LABELS,
  INVENTORY_STATUS_LABELS,
  type InventoryMode,
  type InventorySessionItem,
} from './types';

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

export function InventoryManager({ canApplyStock }: { canApplyStock: boolean }) {
  const {
    sessions,
    currentSession,
    items,
    logs,
    loading,
    setSelectedSessionId,
    createSession,
    updateSession,
    updateItem,
    applySession,
    deleteSession,
    bulkScanCodes,
  } = useInventory();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [assistedOpen, setAssistedOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createMode, setCreateMode] = useState<InventoryMode>('assisted');
  const [createNotes, setCreateNotes] = useState('');
  const [scanCodes, setScanCodes] = useState('');
  const [manualSearch, setManualSearch] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredItems = useMemo(() => {
    const term = manualSearch.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      [item.part_name, item.part_reference, item.part_sku, item.part_supplier]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [items, manualSearch]);

  const overwrittenItems = useMemo(
    () => items.filter((item) => item.applied_previous_quantity !== null || item.applied_new_quantity !== null),
    [items],
  );

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      await createSession({ name: createName, mode: createMode, notes: createNotes });
      setCreateName('');
      setCreateNotes('');
      setCreateMode('assisted');
      setCreateOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePause = async () => {
    if (!currentSession) return;
    await updateSession(currentSession.id, { status: 'paused', paused_at: new Date().toISOString() }, 'session_paused');
    toast({ title: 'Inventaire en pause', description: 'Vous pourrez le reprendre plus tard.' });
  };

  const handleResume = async () => {
    if (!currentSession) return;
    await updateSession(currentSession.id, { status: 'in_progress', paused_at: null }, 'session_resumed');
    toast({ title: 'Inventaire repris', description: 'La session est de nouveau active.' });
  };

  const handleForceStop = async () => {
    if (!currentSession) return;
    await updateSession(
      currentSession.id,
      { status: 'completed', forced_stop: true, completed_at: new Date().toISOString() },
      'session_forced_stop',
    );
    toast({ title: 'Inventaire arrêté', description: 'Vous pouvez désormais imprimer et valider ce relevé.' });
  };

  const handleCancel = async () => {
    if (!currentSession) return;
    await updateSession(currentSession.id, { status: 'cancelled' }, 'session_cancelled');
    toast({ title: 'Inventaire annulé', description: 'La session reste visible dans l’historique.' });
  };

  const handleApply = async () => {
    if (!currentSession) return;
    const result = await applySession(currentSession.id);
    const summary = result?.[0];
    if (summary?.blocked_reserved_rows) {
      toast({
        title: 'Attention réservations',
        description: `${summary.blocked_reserved_rows} pièce(s) inventoriée(s) sous la quantité réservée ont été signalées dans les logs.`,
      });
    }
  };

  const handleCountItem = async (item: InventorySessionItem, quantity: number, method: InventoryMode) => {
    await updateItem({
      sessionId: item.inventory_session_id,
      itemId: item.id,
      countedQuantity: quantity,
      lineStatus: quantity === item.expected_quantity ? 'found' : 'adjusted',
      entryMethod: method,
    });
  };

  const handleScan = async () => {
    if (!currentSession) return;
    const codes = scanCodes.split(/\s+/).map((code) => code.trim()).filter(Boolean);
    if (!codes.length) return;
    const result = await bulkScanCodes(currentSession.id, codes);
    setScanCodes('');
    if (result.unknownCodes.length) {
      toast({
        title: 'Codes inconnus',
        description: `${result.unknownCodes.length} code(s) n’ont pas été reconnus : ${result.unknownCodes.join(', ')}`,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Scans enregistrés', description: `${codes.length} code(s) ont été traités.` });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inventaire</h2>
          <p className="text-sm text-muted-foreground">
            Comparez le stock physique au stock Fixway, suivez les écarts et appliquez les quantités finales.
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
                Non trouvés
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
          <CardHeader className="pb-2"><CardTitle className="text-sm">Inventoriées</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-semibold">{currentSession?.counted_items || 0}</div></CardContent>
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

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sessions & historique</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ScrollArea className="h-[520px] pr-3">
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
                    ) : currentSession.status === 'in_progress' ? (
                      <Button variant="outline" onClick={handlePause}><PauseCircle className="h-4 w-4" />Pause</Button>
                    ) : null}
                    {currentSession.mode === 'assisted' && currentSession.status !== 'applied' && currentSession.status !== 'cancelled' && (
                      <Button variant="outline" onClick={() => setAssistedOpen(true)}>
                        <RotateCcw className="h-4 w-4" />Inventaire assisté
                      </Button>
                    )}
                    {currentSession.status !== 'applied' && currentSession.status !== 'cancelled' && (
                      <Button variant="outline" onClick={handleForceStop}><ShieldAlert className="h-4 w-4" />Arrêt forcé</Button>
                    )}
                    {currentSession.status !== 'applied' && currentSession.status !== 'cancelled' && (
                      <Button variant="outline" onClick={handleCancel}>Annuler</Button>
                    )}
                    {canApplyStock && currentSession.status !== 'applied' && currentSession.status !== 'cancelled' && (
                      <Button onClick={handleApply}>Valider l’inventaire</Button>
                    )}
                    {(currentSession.status === 'draft' || currentSession.status === 'cancelled') && (
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
                    <div className="text-sm text-muted-foreground">Produits non retrouvés</div>
                    <div className="mt-2 text-2xl font-semibold">{currentSession.missing_items}</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Sélectionnez un inventaire pour commencer.</div>
              )}
            </CardContent>
          </Card>

          {currentSession?.mode === 'scan' && currentSession.status !== 'applied' && currentSession.status !== 'cancelled' && (
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
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle className="text-base">Saisie manuelle & détail des pièces</CardTitle>
                <Input
                  value={manualSearch}
                  onChange={(event) => setManualSearch(event.target.value)}
                  placeholder="Rechercher une pièce, référence ou SKU"
                  className="max-w-xs"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[460px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pièce</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Théorique</TableHead>
                      <TableHead className="text-right">Comptée</TableHead>
                      <TableHead className="text-right">Écart</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.part_name}</div>
                          <div className="text-xs text-muted-foreground">{item.part_reference || 'Sans référence'}</div>
                        </TableCell>
                        <TableCell>{item.part_sku || '—'}</TableCell>
                        <TableCell className="text-right">{item.expected_quantity}</TableCell>
                        <TableCell className="text-right">{item.counted_quantity ?? '—'}</TableCell>
                        <TableCell className="text-right">{item.variance_quantity}</TableCell>
                        <TableCell>
                          <Badge variant={item.line_status === 'missing' ? 'destructive' : item.line_status === 'pending' ? 'outline' : 'secondary'}>
                            {INVENTORY_LINE_STATUS_LABELS[item.line_status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {currentSession && currentSession.status !== 'applied' && currentSession.status !== 'cancelled' ? (
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleCountItem(item, item.expected_quantity, 'manual')}>
                                Trouvé
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => updateItem({
                                sessionId: currentSession.id,
                                itemId: item.id,
                                countedQuantity: 0,
                                lineStatus: 'missing',
                                entryMethod: 'manual',
                              })}>
                                Pas trouvé
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  const value = window.prompt(`Quantité comptée pour ${item.part_name}`, String(item.counted_quantity ?? item.expected_quantity));
                                  if (value === null) return;
                                  const parsed = Number(value);
                                  if (!Number.isFinite(parsed) || parsed < 0) return;
                                  void handleCountItem(item, parsed, 'manual');
                                }}
                              >
                                Qté
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Lecture seule</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pièces écrasées / appliquées</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overwrittenItems.slice(0, 8).map((item) => (
                    <div key={item.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{item.part_name}</div>
                        <Badge variant="outline">{item.applied_previous_quantity ?? item.expected_quantity} → {item.applied_new_quantity ?? item.counted_quantity ?? 0}</Badge>
                      </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          Valeur impactée : {currency(((item.applied_new_quantity ?? item.counted_quantity ?? 0) - item.expected_quantity) * item.unit_cost)}
                        </div>
                    </div>
                  ))}
                  {!overwrittenItems.length && <div className="text-sm text-muted-foreground">Aucune quantité écrasée pour l’instant.</div>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Journal d’actions</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[320px] pr-3">
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div key={log.id} className="rounded-md border p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium">{log.action}</div>
                          <div className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString('fr-FR')}</div>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {log.changed_by_name} · {log.field_name || 'action'}
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {currentSession && (
        <InventoryAssistedDialog
          open={assistedOpen}
          onOpenChange={setAssistedOpen}
          session={currentSession}
          items={items}
          onCount={async (itemId, quantity) => {
            const item = items.find((entry) => entry.id === itemId);
            if (!item) return;
            await handleCountItem(item, quantity, 'assisted');
          }}
          onMissing={async (itemId) => {
            await updateItem({
              sessionId: currentSession.id,
              itemId,
              countedQuantity: 0,
              lineStatus: 'missing',
              entryMethod: 'assisted',
            });
          }}
          onPause={handlePause}
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau inventaire</DialogTitle>
            <DialogDescription>
              Fixez un instantané du stock actuel et choisissez le mode de saisie adapté.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inventory-name">Nom</Label>
              <Input id="inventory-name" value={createName} onChange={(event) => setCreateName(event.target.value)} placeholder="Inventaire annuel" />
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
              <Label htmlFor="inventory-notes">Notes</Label>
              <Textarea id="inventory-notes" value={createNotes} onChange={(event) => setCreateNotes(event.target.value)} rows={4} placeholder="Commentaire de départ, zone ou consignes de comptage" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>{isSubmitting ? 'Création...' : 'Créer la session'}</Button>
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
    </div>
  );
}
