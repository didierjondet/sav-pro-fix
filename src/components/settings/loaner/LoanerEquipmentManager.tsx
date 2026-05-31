import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Plus, Search, Trash2, PackageOpen, History } from 'lucide-react';
import {
  LoanerEquipment,
  LOANER_CATEGORIES,
  LOANER_STATUSES,
  useLoanerEquipment,
} from '@/hooks/useLoanerEquipment';
import { LoanerEquipmentForm } from './LoanerEquipmentForm';
import { LoanerLoanHistoryDialog } from './LoanerLoanHistoryDialog';


export function LoanerEquipmentManager() {
  const { equipment, isLoading, deleteEquipment } = useLoanerEquipment();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editing, setEditing] = useState<LoanerEquipment | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<LoanerEquipment | null>(null);
  const [historyFor, setHistoryFor] = useState<LoanerEquipment | null>(null);


  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return equipment.filter((e) => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (!q) return true;
      return [e.name, e.brand, e.model, e.imei, e.serial_number]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q));
    });
  }, [equipment, search, categoryFilter, statusFilter]);

  const counts = useMemo(() => ({
    available: equipment.filter((e) => e.status === 'available').length,
    loaned: equipment.filter((e) => e.status === 'loaned').length,
    total: equipment.length,
  }), [equipment]);

  const statusBadge = (status: string) => {
    const s = LOANER_STATUSES.find((x) => x.value === status);
    return (
      <Badge className={`${s?.color || 'bg-gray-500'} text-white hover:opacity-90`}>
        {s?.label || status}
      </Badge>
    );
  };

  const categoryLabel = (cat: string) =>
    LOANER_CATEGORIES.find((c) => c.value === cat)?.label || cat;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <PackageOpen className="h-5 w-5" /> Matériel de prêt
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{counts.available} disponibles</Badge>
            <Badge variant="outline">{counts.loaned} prêtés</Badge>
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Ajouter
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Rechercher (nom, IMEI, n° série…)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Catégorie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {LOANER_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              {LOANER_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Chargement…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <PackageOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Aucun matériel de prêt enregistré.</p>
            <p className="text-xs mt-1">Ajoutez du matériel pour pouvoir le prêter lors d'une réparation.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Marque / Modèle</TableHead>
                  <TableHead>IMEI / N° série</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>{categoryLabel(e.category)}</TableCell>
                    <TableCell className="text-xs">
                      {[e.brand, e.model].filter(Boolean).join(' ') || '—'}
                      {e.color ? <div className="text-muted-foreground">{e.color}</div> : null}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {e.imei && <div>IMEI: {e.imei}</div>}
                      {e.serial_number && <div>SN: {e.serial_number}</div>}
                      {!e.imei && !e.serial_number && '—'}
                    </TableCell>
                    <TableCell>{statusBadge(e.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="outline" onClick={() => setHistoryFor(e)} title="Historique des prêts">
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setEditing(e); setFormOpen(true); }}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleting(e)}
                          disabled={e.status === 'loaned'}
                          title={e.status === 'loaned' ? 'Impossible de supprimer un matériel actuellement prêté' : ''}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>

                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <LoanerEquipmentForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce matériel ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {deleting?.name} » sera supprimé définitivement. L'historique des prêts associés sera également supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleting) {
                  await deleteEquipment(deleting.id);
                  setDeleting(null);
                }
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
