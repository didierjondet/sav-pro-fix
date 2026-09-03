import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Edit, Info, Layers, Package, PackagePlus, Plus, Trash2, Wrench } from 'lucide-react';
import { usePartnerProfile, PartnerPriceItem, PriceItemKind } from '@/hooks/usePartnerProfile';
import { useParts, Part } from '@/hooks/useParts';
import { formatPartnerPrice } from '@/lib/partnerPricing';
import { multiWordSearch } from '@/utils/searchUtils';

const emptyLine = {
  label: '',
  device_family: '',
  public_price: undefined as number | undefined,
  pro_price: undefined as number | undefined,
  delay_days: undefined as number | undefined,
  note: '',
  visible_public: true,
  visible_pro: true,
  published: true,
};

type PickerMode = 'import' | 'bundle';

const kindMeta: Record<PriceItemKind, { label: string; icon: typeof Package }> = {
  part: { label: 'Pièce', icon: Package },
  service: { label: 'Prestation', icon: Wrench },
  bundle: { label: 'Pièce + pose', icon: Layers },
};

/** Catalogue publié sur le site internet et dans les annuaires. */
export function WebsiteCatalogSection() {
  const {
    partnerProfile, priceItems, savePriceItem, addPriceItemsFromParts, deletePriceItem,
  } = usePartnerProfile();
  const { parts } = useParts();

  const [lineDialog, setLineDialog] = useState(false);
  const [editingLine, setEditingLine] = useState<PartnerPriceItem | null>(null);
  const [lineForm, setLineForm] = useState({ ...emptyLine });

  const [pickerMode, setPickerMode] = useState<PickerMode | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerFilter, setPickerFilter] = useState<'all' | 'part' | 'service'>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [bundleLabel, setBundleLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const vatSettings = {
    prices_include_vat: partnerProfile?.prices_include_vat ?? true,
    vat_rate: Number(partnerProfile?.vat_rate ?? 20),
    vat_exempt: partnerProfile?.vat_exempt ?? false,
  };

  const alreadyPublished = useMemo(
    () => new Set(priceItems.map((i) => i.part_id).filter(Boolean) as string[]),
    [priceItems],
  );

  const pickerParts = useMemo(() => {
    return parts.filter((p) => {
      if (pickerFilter === 'part' && p.is_service) return false;
      if (pickerFilter === 'service' && !p.is_service) return false;
      if (pickerMode === 'import' && alreadyPublished.has(p.id)) return false;
      if (!pickerSearch.trim()) return true;
      return multiWordSearch(pickerSearch, p.name, p.reference || '', p.sku || '');
    });
  }, [parts, pickerFilter, pickerSearch, pickerMode, alreadyPublished]);

  const selectedParts = useMemo(
    () => parts.filter((p) => selected.includes(p.id)),
    [parts, selected],
  );
  const bundleTotal = selectedParts.reduce((s, p) => s + (Number(p.selling_price) || 0), 0);

  const openLine = (line?: PartnerPriceItem) => {
    if (line) {
      setEditingLine(line);
      setLineForm({
        label: line.label,
        device_family: line.device_family || '',
        public_price: line.public_price ?? undefined,
        pro_price: line.pro_price ?? undefined,
        delay_days: line.delay_days ?? undefined,
        note: line.note || '',
        visible_public: line.visible_public,
        visible_pro: line.visible_pro,
        published: line.published ?? true,
      });
    } else {
      setEditingLine(null);
      setLineForm({ ...emptyLine });
    }
    setLineDialog(true);
  };

  const submitLine = async () => {
    if (!lineForm.label.trim()) return;
    await savePriceItem({
      id: editingLine?.id,
      label: lineForm.label,
      device_family: lineForm.device_family || null,
      public_price: lineForm.public_price ?? null,
      pro_price: lineForm.pro_price ?? null,
      delay_days: lineForm.delay_days ?? null,
      note: lineForm.note || null,
      visible_public: lineForm.visible_public,
      visible_pro: lineForm.visible_pro,
      published: lineForm.published,
      kind: editingLine?.kind ?? 'service',
      display_order: editingLine?.display_order ?? priceItems.length,
    });
    setLineDialog(false);
  };

  const togglePublished = (line: PartnerPriceItem, value: boolean) =>
    savePriceItem({ id: line.id, published: value });

  const openPicker = (mode: PickerMode) => {
    setPickerMode(mode);
    setSelected([]);
    setPickerSearch('');
    setPickerFilter('all');
    setBundleLabel('');
  };

  const toggleSelect = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const confirmPicker = async () => {
    if (selected.length === 0) return;
    setBusy(true);
    try {
      if (pickerMode === 'import') {
        await addPriceItemsFromParts(
          selectedParts.map((p: Part) => ({
            label: p.name,
            device_family: p.reference || null,
            public_price: p.selling_price ?? null,
            pro_price: p.selling_price ?? null,
            note: null,
            part_id: p.id,
            kind: (p.is_service ? 'service' : 'part') as PriceItemKind,
            published: true,
          })),
        );
      } else {
        await addPriceItemsFromParts([
          {
            label: bundleLabel.trim() || selectedParts.map((p) => p.name).join(' + '),
            public_price: bundleTotal || null,
            pro_price: bundleTotal || null,
            kind: 'bundle' as PriceItemKind,
            published: true,
            components: selectedParts.map((p) => ({
              part_id: p.id,
              label: p.name,
              kind: (p.is_service ? 'service' : 'part') as 'part' | 'service',
              price: p.selling_price ?? null,
            })),
          },
        ]);
      }
      setPickerMode(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
            <span className="flex items-center gap-2"><Layers className="h-5 w-5" />Catalogue en ligne</span>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => openPicker('import')}>
                <PackagePlus className="h-4 w-4 mr-2" /> Ajouter depuis mon stock
              </Button>
              <Button variant="outline" size="sm" onClick={() => openPicker('bundle')}>
                <Layers className="h-4 w-4 mr-2" /> Article combiné
              </Button>
              <Button size="sm" onClick={() => openLine()}>
                <Plus className="h-4 w-4 mr-2" /> Ligne libre
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Publiez directement vos pièces et prestations déjà saisies dans le stock : prix public
            (particuliers, site et annuaire) et prix professionnel (magasins Fixway).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {priceItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucun article dans votre catalogue. Utilisez « Ajouter depuis mon stock » pour éviter toute
              double saisie.
            </p>
          ) : (
            <div className="space-y-3">
              {priceItems.map((line) => {
                const meta = kindMeta[line.kind] ?? kindMeta.service;
                const KindIcon = meta.icon;
                return (
                  <div key={line.id} className="flex items-center justify-between gap-3 p-4 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          <KindIcon className="h-3 w-3 mr-1" />{meta.label}
                        </Badge>
                        <span className="font-medium">{line.label}</span>
                        {line.device_family && (
                          <Badge variant="outline" className="text-xs">{line.device_family}</Badge>
                        )}
                        {!line.visible_public && <Badge variant="outline" className="text-xs">Non public</Badge>}
                        {!line.visible_pro && <Badge variant="outline" className="text-xs">Non pro</Badge>}
                      </div>
                      {line.kind === 'bundle' && (line.components?.length ?? 0) > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {line.components.map((c) => c.label).join(' + ')}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        <span>Public : {formatPartnerPrice(line.public_price, vatSettings, 'ttc')}</span>
                        <span>Pro : {formatPartnerPrice(line.pro_price, vatSettings, 'ht')}</span>
                        {line.delay_days != null && <span>{line.delay_days} j</span>}
                        {line.note && <span className="italic">{line.note}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground hidden sm:block">Publié</Label>
                        <Switch
                          checked={line.published ?? true}
                          onCheckedChange={(v) => togglePublished(line, v)}
                        />
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => openLine(line)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm"><Trash2 className="w-4 h-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Retirer du catalogue</AlertDialogTitle>
                            <AlertDialogDescription>
                              Retirer « {line.label} » de votre catalogue en ligne ? Votre fiche de stock
                              n’est pas modifiée.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deletePriceItem(line.id)}>Retirer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <ul className="list-disc list-inside space-y-1">
                <li>Votre site affiche les articles publiés et marqués « visible public », en TTC</li>
                <li>L’annuaire professionnel affiche les articles « visible pro », en HT</li>
                <li>Modifier un prix ici ne change jamais la fiche de stock correspondante</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sélecteur pièces / prestations */}
      <Dialog open={pickerMode !== null} onOpenChange={(o) => !o && setPickerMode(null)}>
        <DialogContent className="w-[95vw] max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {pickerMode === 'bundle' ? 'Créer un article combiné' : 'Publier des articles de mon stock'}
            </DialogTitle>
            <DialogDescription>
              {pickerMode === 'bundle'
                ? 'Sélectionnez une pièce physique et la prestation associée pour créer un article unique (ex. « Écran posé »).'
                : 'Cochez les pièces et prestations à publier dans votre catalogue en ligne.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {pickerMode === 'bundle' && (
              <div>
                <Label htmlFor="bundle_label">Nom de l’article combiné</Label>
                <Input id="bundle_label" value={bundleLabel} onChange={(e) => setBundleLabel(e.target.value)}
                  placeholder="ex: Écran iPhone 13 posé" />
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <Input
                className="flex-1 min-w-[200px]"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Rechercher une pièce ou une prestation…"
              />
              {(['all', 'part', 'service'] as const).map((f) => (
                <Button key={f} size="sm" variant={pickerFilter === f ? 'default' : 'outline'}
                  onClick={() => setPickerFilter(f)}>
                  {f === 'all' ? 'Tout' : f === 'part' ? 'Pièces' : 'Prestations'}
                </Button>
              ))}
            </div>

            <ScrollArea className="h-[320px] border rounded-lg">
              <div className="divide-y">
                {pickerParts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucun résultat</p>
                ) : pickerParts.map((p) => (
                  <label key={p.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/40">
                    <Checkbox checked={selected.includes(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{p.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {p.is_service ? 'Prestation' : 'Pièce'}
                        </Badge>
                      </div>
                      {p.reference && <p className="text-xs text-muted-foreground truncate">{p.reference}</p>}
                    </div>
                    <span className="text-sm whitespace-nowrap">
                      {p.selling_price != null ? `${Number(p.selling_price).toFixed(2)} €` : '—'}
                    </span>
                  </label>
                ))}
              </div>
            </ScrollArea>

            <p className="text-xs text-muted-foreground">
              {selected.length} sélectionné(s)
              {pickerMode === 'bundle' && selected.length > 0 && ` · total ${bundleTotal.toFixed(2)} €`}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPickerMode(null)}>Annuler</Button>
            <Button onClick={confirmPicker} disabled={busy || selected.length === 0}>
              {pickerMode === 'bundle' ? 'Créer l’article' : 'Publier la sélection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Édition d'une ligne */}
      <Dialog open={lineDialog} onOpenChange={setLineDialog}>
        <DialogContent className="w-[95vw] max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingLine ? 'Modifier l’article' : 'Nouvel article'}</DialogTitle>
            <DialogDescription>
              Prix destiné aux particuliers et prix réservé aux magasins Fixway.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pl_label">Intitulé</Label>
                <Input id="pl_label" value={lineForm.label}
                  onChange={(e) => setLineForm({ ...lineForm, label: e.target.value })}
                  placeholder="ex: Réparation carte mère" />
              </div>
              <div>
                <Label htmlFor="pl_family">Appareil / famille</Label>
                <Input id="pl_family" value={lineForm.device_family}
                  onChange={(e) => setLineForm({ ...lineForm, device_family: e.target.value })}
                  placeholder="ex: iPhone 12 – 15" />
              </div>
              <div>
                <Label htmlFor="pl_pub">Prix public</Label>
                <NumberInput id="pl_pub" min="0" step="0.01" value={lineForm.public_price ?? ''}
                  onChange={(e) => setLineForm({
                    ...lineForm,
                    public_price: e.target.value === '' ? undefined : parseFloat(e.target.value),
                  })} />
              </div>
              <div>
                <Label htmlFor="pl_pro">Prix professionnel</Label>
                <NumberInput id="pl_pro" min="0" step="0.01" value={lineForm.pro_price ?? ''}
                  onChange={(e) => setLineForm({
                    ...lineForm,
                    pro_price: e.target.value === '' ? undefined : parseFloat(e.target.value),
                  })} />
              </div>
              <div>
                <Label htmlFor="pl_delay">Délai (jours)</Label>
                <NumberInput id="pl_delay" min="0" max="365" value={lineForm.delay_days ?? ''}
                  onChange={(e) => setLineForm({
                    ...lineForm,
                    delay_days: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                  })} />
              </div>
              <div>
                <Label htmlFor="pl_note">Note</Label>
                <Input id="pl_note" value={lineForm.note}
                  onChange={(e) => setLineForm({ ...lineForm, note: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm font-normal">Publié dans le catalogue</Label>
              <Switch checked={lineForm.published}
                onCheckedChange={(v) => setLineForm({ ...lineForm, published: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-normal">Visible par les particuliers</Label>
              <Switch checked={lineForm.visible_public}
                onCheckedChange={(v) => setLineForm({ ...lineForm, visible_public: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-normal">Visible par les magasins Fixway</Label>
              <Switch checked={lineForm.visible_pro}
                onCheckedChange={(v) => setLineForm({ ...lineForm, visible_pro: v })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLineDialog(false)}>Annuler</Button>
            <Button onClick={submitLine} disabled={!lineForm.label.trim()}>
              {editingLine ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default WebsiteCatalogSection;
