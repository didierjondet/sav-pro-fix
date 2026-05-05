import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Printer, Search } from 'lucide-react';
import { printInventoryAuditLog } from '@/lib/inventoryPrint';
import type { InventoryAuditLog, InventorySession } from './types';

const ACTION_LABELS: Record<string, string> = {
  session_paused: 'Pause',
  session_resumed: 'Reprise',
  session_stopped: 'Arrêt',
  session_completed: 'Clôture',
  session_cancelled: 'Annulation',
  session_applied: 'Application stock',
  item_updated: 'Modification',
  bulk_scan: 'Lot de scan',
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  logs: InventoryAuditLog[];
  session?: InventorySession;
  sessionNameById?: Map<string, string>;
  showSessionColumn?: boolean;
}

export function InventoryJournalDialog({
  open,
  onOpenChange,
  title,
  logs,
  session,
  sessionNameById,
  showSessionColumn,
}: Props) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const sorted = [...logs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    if (!term) return sorted;
    return sorted.filter((l) => {
      const itemName = typeof l.metadata?.item_name === 'string' ? l.metadata.item_name : '';
      return [
        l.changed_by_name,
        l.action,
        ACTION_LABELS[l.action],
        l.field_name,
        l.old_value,
        l.new_value,
        itemName,
        sessionNameById?.get(l.inventory_session_id),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [logs, search, sessionNameById]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <DialogTitle>{title}</DialogTitle>
            {session && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => printInventoryAuditLog({ session, logs })}
              >
                <Printer className="h-4 w-4" /> Imprimer
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (action, auteur, pièce, valeur…)"
            className="pl-8"
          />
        </div>

        <ScrollArea className="h-[60vh] pr-2">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-2 font-medium">Date</th>
                <th className="py-2 pr-2 font-medium">Auteur</th>
                <th className="py-2 pr-2 font-medium">Action</th>
                {showSessionColumn && <th className="py-2 pr-2 font-medium">Inventaire</th>}
                <th className="py-2 pr-2 font-medium">Pièce</th>
                <th className="py-2 pr-2 font-medium">Champ</th>
                <th className="py-2 pr-2 font-medium">Avant</th>
                <th className="py-2 pr-2 font-medium">Après</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => {
                const itemName = typeof log.metadata?.item_name === 'string'
                  ? log.metadata.item_name
                  : '';
                return (
                  <tr key={log.id} className="border-b align-top hover:bg-muted/40">
                    <td className="py-2 pr-2 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('fr-FR')}
                    </td>
                    <td className="py-2 pr-2">{log.changed_by_name}</td>
                    <td className="py-2 pr-2">
                      <Badge variant="outline">{ACTION_LABELS[log.action] || log.action}</Badge>
                    </td>
                    {showSessionColumn && (
                      <td className="py-2 pr-2 text-muted-foreground">
                        {sessionNameById?.get(log.inventory_session_id) || '—'}
                      </td>
                    )}
                    <td className="py-2 pr-2">{itemName || '—'}</td>
                    <td className="py-2 pr-2 text-muted-foreground">{log.field_name || '—'}</td>
                    <td className="py-2 pr-2 text-destructive line-through">
                      {log.old_value ?? ''}
                    </td>
                    <td className="py-2 pr-2 text-success font-medium">
                      {log.new_value ?? ''}
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={showSessionColumn ? 8 : 7} className="text-center py-8 text-muted-foreground">
                    Aucune entrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
