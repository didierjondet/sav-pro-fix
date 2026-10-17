import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit2, Archive, RotateCcw, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/hooks/useShop';
import { useProductFamilies, type ProductFamily } from '@/hooks/useProductFamilies';
import { FamilyChip } from '@/components/sav/ProductFamilyChips';
import { matchFamilyForDevice, findOtherFamily } from '@/lib/productFamilies';
import { cn } from '@/lib/utils';

const PRESET_COLORS = ['#3B82F6', '#06B6D4', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#84CC16', '#F97316', '#6B7280'];

export function ProductFamiliesManager() {
  const { shop } = useShop();
  const { families, activeFamilies, loading, saveFamily, setFamilyActive } = useProductFamilies({ seed: true });
  const [view, setView] = useState<'active' | 'archived'>('active');
  const [editing, setEditing] = useState<Partial<ProductFamily> | null>(null);
  const [classifying, setClassifying] = useState(false);

  const list = families.filter((f) => (view === 'active' ? f.is_active : !f.is_active));

  const classifyExisting = async () => {
    if (!shop?.id || !activeFamilies.length) return;
    setClassifying(true);
    try {
      const { data, error } = await (supabase as any)
        .from('sav_cases').select('id, device_brand, device_model, problem_description')
        .eq('shop_id', shop.id).is('product_family_id', null).limit(1000);
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const assign = new Map<string, string>();
      const unknown: any[] = [];
      for (const r of rows) {
        const { familyId } = matchFamilyForDevice(activeFamilies, r.device_brand || '', r.device_model || '');
        if (familyId) assign.set(r.id, familyId); else unknown.push(r);
      }
      const fams = activeFamilies.map((f) => ({ id: f.id, name: f.name }));
      for (let i = 0; i < unknown.length; i += 40) {
        const batch = unknown.slice(i, i + 40);
        const { data: res } = await supabase.functions.invoke('classify-sav-category', {
          body: { families: fams, items: batch.map((r) => ({ id: r.id, brand: r.device_brand, model: r.device_model, problem_description: r.problem_description })) },
        });
        const other = findOtherFamily(activeFamilies);
        for (const r of batch) {
          const id = res?.results?.[r.id] ?? other;
          if (id) assign.set(r.id, id);
        }
      }
      const byFamily = new Map<string, string[]>();
      assign.forEach((fid, cid) => byFamily.set(fid, [...(byFamily.get(fid) ?? []), cid]));
      for (const [fid, ids] of byFamily) {
        for (let i = 0; i < ids.length; i += 200) {
          await (supabase as any).from('sav_cases').update({ product_family_id: fid }).in('id', ids.slice(i, i + 200));
        }
      }
      toast.success(`${assign.size} SAV classé(s)`);
    } catch (e: any) {
      toast.error(e?.message || 'Classement impossible');
    } finally {
      setClassifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Familles de produits</h2>
          <p className="text-sm text-muted-foreground">
            Pastilles proposées automatiquement à la création d’un SAV et utilisables comme filtre sur la page SAV.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={classifyExisting} disabled={classifying || !activeFamilies.length}>
            {classifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Classer les SAV existants
          </Button>
          <Button onClick={() => setEditing({ name: '', color: PRESET_COLORS[0], display_order: families.length })}>
            <Plus className="h-4 w-4" /> Nouvelle famille
          </Button>
        </div>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as any)}>
        <TabsList>
          <TabsTrigger value="active">Actives ({activeFamilies.length})</TabsTrigger>
          <TabsTrigger value="archived">Archivées ({families.length - activeFamilies.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="text-sm text-muted-foreground">Chargement...</div>
      ) : list.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Aucune famille.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((f) => (
            <Card key={f.id}>
              <CardContent className="flex items-center justify-between gap-2 py-4">
                <div className="flex items-center gap-2">
                  <FamilyChip family={f} />
                  <span className="text-xs text-muted-foreground">Ordre {f.display_order}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(f)} title="Modifier"><Edit2 className="h-4 w-4" /></Button>
                  {f.is_active ? (
                    <Button size="icon" variant="ghost" onClick={() => setFamilyActive({ id: f.id, is_active: false })} title="Archiver"><Archive className="h-4 w-4" /></Button>
                  ) : (
                    <Button size="icon" variant="ghost" onClick={() => setFamilyActive({ id: f.id, is_active: true })} title="Réactiver"><RotateCcw className="h-4 w-4" /></Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? 'Modifier la famille' : 'Nouvelle famille'}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Ex : Trottinettes" />
              </div>
              <div className="space-y-2">
                <Label>Couleur</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setEditing({ ...editing, color: c })}
                      className={cn('h-8 w-8 rounded-full border-2', editing.color === c ? 'border-foreground ring-2 ring-ring ring-offset-2' : 'border-muted-foreground/30')}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ordre d’affichage</Label>
                <NumberInput min={0} value={editing.display_order ?? 0} onChange={(e) => setEditing({ ...editing, display_order: Number(e.target.value) || 0 })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button disabled={!editing?.name?.trim()} onClick={async () => { await saveFamily(editing as any); setEditing(null); }}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
