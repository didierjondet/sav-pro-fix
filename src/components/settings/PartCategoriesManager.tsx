import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NumberInput } from "@/components/ui/number-input";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { usePartCategories, type PartCategory } from '@/hooks/usePartCategories';
import { useParts } from '@/hooks/useParts';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6B7280',
];

export function PartCategoriesManager() {
  const { categories, loading, createCategory, updateCategory, deleteCategory } = usePartCategories();
  const { parts } = useParts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PartCategory | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PartCategory | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(PRESET_COLORS[0]);
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const partsCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const part of parts) {
      const cid = (part as unknown as { category_id?: string | null }).category_id;
      if (cid) map.set(cid, (map.get(cid) ?? 0) + 1);
    }
    return map;
  }, [parts]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setColor(PRESET_COLORS[0]);
    setDisplayOrder(categories.length);
    setDialogOpen(true);
  };

  const openEdit = (cat: PartCategory) => {
    setEditing(cat);
    setName(cat.name);
    setDescription(cat.description ?? '');
    setColor(cat.color ?? PRESET_COLORS[0]);
    setDisplayOrder(cat.display_order);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      if (editing) {
        await updateCategory({ id: editing.id, name, description, color, display_order: displayOrder });
      } else {
        await createCategory({ name, description, color, display_order: displayOrder });
      }
      setDialogOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    await deleteCategory(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Catégories de pièces</h2>
          <p className="text-sm text-muted-foreground">
            Regroupez vos pièces par famille pour faciliter le tri, le filtrage et lancer des inventaires partiels.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nouvelle catégorie
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Chargement...</div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Tag className="h-10 w-10 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              Aucune catégorie pour l’instant. Créez-en pour organiser votre stock.
            </div>
            <Button onClick={openCreate} variant="outline">
              <Plus className="h-4 w-4" />
              Créer une catégorie
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((cat) => {
            const count = partsCountByCategory.get(cat.id) ?? 0;
            return (
              <Card key={cat.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-4 w-4 rounded-full border"
                        style={{ backgroundColor: cat.color ?? '#9CA3AF' }}
                      />
                      <CardTitle className="text-base">{cat.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(cat)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setPendingDelete(cat)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {cat.description && (
                    <p className="text-sm text-muted-foreground">{cat.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{count} pièce{count > 1 ? 's' : ''}</Badge>
                    <Badge variant="outline">Ordre {cat.display_order}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</DialogTitle>
            <DialogDescription>
              Une catégorie permet de regrouper plusieurs pièces (ex : Écrans iPhone, Batteries Samsung).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Nom *</Label>
              <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Écrans iPhone" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea id="cat-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Couleur du badge</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      'h-8 w-8 rounded-full border-2 transition-transform hover:scale-110',
                      color === c ? 'border-foreground ring-2 ring-ring ring-offset-2' : 'border-muted-foreground/30',
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-order">Ordre d’affichage</Label>
              <NumberInput
                id="cat-order"
                
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={submitting || !name.trim()}>
              {submitting ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la catégorie « {pendingDelete?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && (partsCountByCategory.get(pendingDelete.id) ?? 0) > 0
                ? `Cette catégorie est utilisée par ${partsCountByCategory.get(pendingDelete.id)} pièce(s). Elles seront déclassées (sans catégorie) mais conservées.`
                : 'Aucune pièce n’utilise cette catégorie. La suppression est sans impact.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
