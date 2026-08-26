import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Edit, Plus, Trash2, Wrench, Mail, Phone } from 'lucide-react';
import { SAVProvider, useSAVProviders } from '@/hooks/useSAVProviders';

const emptyForm: Partial<SAVProvider> = {
  name: '',
  contact_name: '',
  phone: '',
  email: '',
  address: '',
  specialties: '',
  avg_delay_days: null,
  color: '#8b5cf6',
  notes: '',
  is_active: true,
  show_in_sidebar: true,
  display_order: 0,
};

export function SAVProvidersManager() {
  const { providers, isLoading, createProvider, updateProvider, deleteProvider } = useSAVProviders();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SAVProvider | null>(null);
  const [form, setForm] = useState<Partial<SAVProvider>>(emptyForm);
  const [deleting, setDeleting] = useState<SAVProvider | null>(null);
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, display_order: providers.length });
    setOpen(true);
  };

  const openEdit = (p: SAVProvider) => {
    setEditing(p);
    setForm({ ...p });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateProvider(editing.id, {
          name: form.name,
          contact_name: form.contact_name || null,
          phone: form.phone || null,
          email: form.email || null,
          address: form.address || null,
          specialties: form.specialties || null,
          avg_delay_days: form.avg_delay_days ?? null,
          color: form.color || '#8b5cf6',
          notes: form.notes || null,
          is_active: form.is_active ?? true,
          show_in_sidebar: form.show_in_sidebar ?? true,
          display_order: form.display_order ?? 0,
        });
      } else {
        await createProvider(form);
      }
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" /> Prestataires techniques
          </CardTitle>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" /> Nouveau prestataire
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Entreprises tierces (micro-soudure, broker…) auxquelles vous pouvez confier un dossier SAV.
          Cette information reste interne : elle n'est jamais visible par le client.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Chargement…</p>
        ) : providers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Wrench className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Aucun prestataire enregistré.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Spécialités</TableHead>
                  <TableHead>Coordonnées</TableHead>
                  <TableHead>Délai moyen</TableHead>
                  <TableHead>Sidebar</TableHead>
                  <TableHead>État</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </span>
                      {p.contact_name && (
                        <div className="text-xs text-muted-foreground">{p.contact_name}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{p.specialties || '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5 text-xs">
                        {p.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{p.email}</span>}
                        {p.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span>}
                        {!p.email && !p.phone && '—'}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{p.avg_delay_days ? `${p.avg_delay_days} j` : '—'}</TableCell>
                    <TableCell>
                      <Switch
                        checked={p.show_in_sidebar}
                        onCheckedChange={(v) => updateProvider(p.id, { show_in_sidebar: v })}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? 'default' : 'secondary'}>
                        {p.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setDeleting(p)}>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le prestataire' : 'Nouveau prestataire'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nom *</Label>
              <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contact</Label>
                <Input value={form.contact_name || ''} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Adresse</Label>
              <Input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label>Spécialités</Label>
              <Input
                placeholder="Micro-soudure, récupération de données…"
                value={form.specialties || ''}
                onChange={(e) => setForm({ ...form, specialties: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Délai moyen (jours)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.avg_delay_days ?? ''}
                  onChange={(e) => setForm({ ...form, avg_delay_days: e.target.value === '' ? null : parseInt(e.target.value, 10) })}
                />
              </div>
              <div>
                <Label>Couleur</Label>
                <Input type="color" value={form.color || '#8b5cf6'} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Notes internes</Label>
              <Textarea rows={3} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>Afficher dans la barre latérale</Label>
                <p className="text-xs text-muted-foreground">Compteur des dossiers en cours chez ce prestataire</p>
              </div>
              <Switch checked={form.show_in_sidebar ?? true} onCheckedChange={(v) => setForm({ ...form, show_in_sidebar: v })} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label>Prestataire actif</Label>
              <Switch checked={form.is_active ?? true} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving || !form.name?.trim()}>
              {editing ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce prestataire ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {deleting?.name} » sera supprimé. Si des dossiers SAV lui sont encore rattachés, la
              suppression sera refusée : désactivez-le à la place.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting) return;
                try { await deleteProvider(deleting.id); } catch {}
                setDeleting(null);
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
