import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from "@/components/ui/number-input";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Part } from '@/hooks/useParts';
import { usePartCategories } from '@/hooks/usePartCategories';
import { useSuppliersDirectory } from '@/hooks/useSuppliersDirectory';
import { SupplierForm } from '@/components/settings/SupplierForm';
import { SimilarPartsAlert } from './SimilarPartsAlert';
import { PartPhotoUpload } from './PartPhotoUpload';
import { cn } from '@/lib/utils';
import { useBillingConfig } from '@/hooks/useBillingConfig';
import { Plus } from 'lucide-react';

const PART_COLORS = [
  { value: 'black', label: 'Noir', color: '#000000' },
  { value: 'white', label: 'Blanc', color: '#FFFFFF' },
  { value: 'grey', label: 'Gris', color: '#6B7280' },
  { value: 'silver', label: 'Argent', color: '#C0C0C0' },
  { value: 'gold', label: 'Or', color: '#FFD700' },
  { value: 'rose_gold', label: 'Or Rose', color: '#B76E79' },
  { value: 'blue', label: 'Bleu', color: '#3B82F6' },
  { value: 'red', label: 'Rouge', color: '#EF4444' },
  { value: 'green', label: 'Vert', color: '#22C55E' },
  { value: 'pink', label: 'Rose', color: '#EC4899' },
  { value: 'purple', label: 'Violet', color: '#8B5CF6' },
  { value: 'orange', label: 'Orange', color: '#F97316' },
  { value: 'yellow', label: 'Jaune', color: '#EAB308' },
  { value: 'other', label: 'Autre', color: '#9CA3AF' },
];

interface PartFormProps {
  initialData?: Partial<Part>;
  onSubmit: (data: any) => Promise<{ error: any }>;
  onCancel: () => void;
  isEdit?: boolean;
  findSimilarParts?: (name: string, excludeId?: string) => Part[];
  defaultIsService?: boolean;
}

export function PartForm({ initialData, onSubmit, onCancel, isEdit = false, findSimilarParts, defaultIsService = false }: PartFormProps) {
  const [loading, setLoading] = useState(false);
  const [showSimilarAlert, setShowSimilarAlert] = useState(false);
  const [similarParts, setSimilarParts] = useState<Part[]>([]);
  const [pendingData, setPendingData] = useState<any>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialData?.photo_url || null);
  const [selectedColor, setSelectedColor] = useState<string | null>((initialData as any)?.color || null);
  const [categoryId, setCategoryId] = useState<string | null>((initialData as any)?.category_id || null);
  const [isService, setIsService] = useState<boolean>((initialData as any)?.is_service ?? defaultIsService);
  const [supplierId, setSupplierId] = useState<string | null>((initialData as any)?.supplier_id ?? null);
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const { categories } = usePartCategories();
  const { activeSuppliers } = useSuppliersDirectory();
  const { config: billing } = useBillingConfig();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    control,
  } = useForm({
    defaultValues: {
      name: initialData?.name || '',
      reference: initialData?.reference || '',
      sku: initialData?.sku || '',
      supplier: initialData?.supplier || '',
      purchase_price: initialData?.purchase_price || 0,
      selling_price: initialData?.selling_price || 0,
      quantity: initialData?.quantity || 0,
      min_stock: initialData?.min_stock || 1,
      time_minutes: initialData?.time_minutes ?? 15,
      labor_cost: (initialData as any)?.labor_cost ?? null,
      notes: initialData?.notes || '',
      photo_url: initialData?.photo_url || '',
    }
  });

  const [useMargin, setUseMargin] = useState(false);
  const [marginPercent, setMarginPercent] = useState<number>(30);

  const purchasePrice = watch('purchase_price');

  useEffect(() => {
    if (useMargin && typeof purchasePrice === 'number') {
      const computed = purchasePrice * (1 + (marginPercent || 0) / 100);
      const rounded = Math.round(computed * 100) / 100;
      setValue('selling_price', isFinite(rounded) ? rounded : 0);
    }
  }, [useMargin, marginPercent, purchasePrice, setValue]);

  const checkForSimilarParts = (data: any) => {
    // Seulement pour les nouvelles pièces (pas en édition)
    if (!isEdit && findSimilarParts && data.name) {
      const similar = findSimilarParts(data.name, initialData?.id);
      if (similar.length > 0) {
        setSimilarParts(similar);
        setPendingData(data);
        setShowSimilarAlert(true);
        return true;
      }
    }
    return false;
  };

  const onFormSubmit = async (data: any) => {
    // Vérifier les doublons avant la soumission
    if (checkForSimilarParts(data)) {
      return;
    }

    await submitPart(data);
  };

  const submitPart = async (data: any) => {
    setLoading(true);
    try {
      // Ajouter l'URL de la photo et la couleur aux données
      const partData = {
        ...data,
        photo_url: photoUrl,
        color: selectedColor,
        category_id: categoryId,
        supplier_id: supplierId,
        is_service: isService,
      };

      const { error } = await onSubmit(partData);
      if (!error) {
        onCancel();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProceedAnyway = () => {
    setShowSimilarAlert(false);
    if (pendingData) {
      submitPart(pendingData);
    }
  };

  const handleCancelDuplicate = () => {
    setShowSimilarAlert(false);
    setPendingData(null);
    setSimilarParts([]);
  };

  // Si on affiche l'alerte des doublons
  if (showSimilarAlert) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pièces similaires détectées</CardTitle>
        </CardHeader>
        <CardContent>
          <SimilarPartsAlert
            similarParts={similarParts}
            onProceed={handleProceedAnyway}
            onCancel={handleCancelDuplicate}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEdit
            ? (isService ? 'Modifier la prestation' : 'Modifier la pièce')
            : (isService ? 'Ajouter une nouvelle prestation' : 'Ajouter une nouvelle pièce')}
        </CardTitle>
        <div className="flex items-center gap-3 pt-2">
          <Switch id="is_service" checked={isService} onCheckedChange={setIsService} />
          <Label htmlFor="is_service">
            {isService ? 'Prestation (main d\'œuvre / service sans stock)' : 'Pièce physique avec stock'}
          </Label>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nom de la pièce *</Label>
              <Input
                id="name"
                {...register('name', { required: 'Le nom est requis' })}
                placeholder="Ex: Écran iPhone 13"
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="reference">Référence</Label>
              <Input
                id="reference"
                {...register('reference')}
                placeholder="Ex: REF-001"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                {...register('sku')}
                placeholder="Ex: SKU-001"
              />
            </div>

            <div>
              <Label htmlFor="supplier">Fournisseur</Label>
              <div className="flex gap-2">
                <Select value={supplierId ?? 'none'} onValueChange={(v) => setSupplierId(v === 'none' ? null : v)}>
                  <SelectTrigger id="supplier" className="flex-1">
                    <SelectValue placeholder="Sélectionner un fournisseur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun fournisseur</SelectItem>
                    {activeSuppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setSupplierFormOpen(true)} title="Nouveau fournisseur">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {activeSuppliers.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Aucun fournisseur enregistré. Créez-en un via le bouton +.
                </p>
              )}
            </div>
          </div>

          {/* Catégorie */}
          <div>
            <Label htmlFor="category">Catégorie</Label>
            <Select value={categoryId ?? 'none'} onValueChange={(v) => setCategoryId(v === 'none' ? null : v)}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sans catégorie</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categories.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Aucune catégorie créée. Créez-en dans Réglages → Catégories de pièces.
              </p>
            )}
          </div>

          {/* Sélecteur de couleur */}
          {!isService && (
          <div>
            <Label className="mb-2 block">Couleur de la pièce</Label>
            <div className="flex flex-wrap gap-2">
              {PART_COLORS.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => setSelectedColor(selectedColor === colorOption.value ? null : colorOption.value)}
                  className={cn(
                    "w-8 h-8 rounded-md border-2 transition-all duration-200 hover:scale-110",
                    selectedColor === colorOption.value
                      ? "border-primary ring-2 ring-primary ring-offset-2"
                      : "border-muted-foreground/30 hover:border-muted-foreground/50"
                  )}
                  style={{ backgroundColor: colorOption.color }}
                  title={colorOption.label}
                />
              ))}
            </div>
            {selectedColor && (
              <p className="text-sm text-muted-foreground mt-2">
                Couleur sélectionnée : {PART_COLORS.find(c => c.value === selectedColor)?.label}
              </p>
            )}
          </div>
          )}

          <div className="flex items-center gap-3">
            <Switch id="use_margin" checked={useMargin} onCheckedChange={setUseMargin} />
            <Label htmlFor="use_margin">Définir le prix public via une marge (%)</Label>
          </div>
          {useMargin && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="margin">Marge (%)</Label>
                <NumberInput
                  id="margin"
                  
                  step="0.1"
                  min="0"
                  value={marginPercent}
                  onChange={(e) => setMarginPercent(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label>Prix public TTC calculé</Label>
                <Input value={watch('selling_price') || 0} readOnly />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="purchase_price">Prix d'achat HT (€)</Label>
              <Controller
                name="purchase_price"
                control={control}
                render={({ field }) => (
                  <NumberInput
                    id="purchase_price"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={field.value ?? 0}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />
              {initialData?.price_last_updated && (
                <p className="text-xs text-muted-foreground mt-1">
                  Dernière modification des prix : {new Date(initialData.price_last_updated).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="selling_price">Prix public TTC (€)</Label>
              <Controller
                name="selling_price"
                control={control}
                render={({ field }) => (
                  <NumberInput
                    id="selling_price"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    readOnly={useMargin}
                    value={field.value ?? 0}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />
              {initialData?.price_last_updated && (
                <p className="text-xs text-muted-foreground mt-1">
                  Dernière modification des prix : {new Date(initialData.price_last_updated).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </div>
          </div>

          {!isService && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantité en stock</Label>
              <NumberInput
                id="quantity"
                min="0"
                {...register('quantity', { valueAsNumber: true })}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="min_stock">Stock minimum</Label>
              <NumberInput
                id="min_stock"
                min="0"
                {...register('min_stock', { valueAsNumber: true })}
                placeholder="1"
              />
            </div>
          </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="time_minutes">Temps (minutes)</Label>
              <NumberInput
                id="time_minutes"
                min="0"
                {...register('time_minutes', { valueAsNumber: true })}
                placeholder="15"
              />
              <p className="text-xs text-muted-foreground mt-1">Par défaut: 15 minutes</p>
            </div>

            {billing.labor_billing_enabled && (
              <div>
                <Label htmlFor="labor_cost">
                  {billing.labor_mode === 'flat'
                    ? "Coût main d'œuvre (€ HT)"
                    : "Surcharge MO (€ HT, optionnel)"}
                </Label>
                <NumberInput
                  id="labor_cost"
                  min="0"
                  step="0.01"
                  {...register('labor_cost', { setValueAs: (v) => v === '' || v === null ? null : parseFloat(v) })}
                  placeholder={billing.labor_mode === 'hourly'
                    ? `Auto: ${(((watch('time_minutes') || 0) / 60) * (billing.labor_hourly_rate || 0)).toFixed(2)} €`
                    : '0.00'}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {billing.labor_mode === 'hourly'
                    ? `Calcul auto = temps × ${billing.labor_hourly_rate} €/h. Laissez vide pour utiliser ce calcul.`
                    : 'Montant ajouté automatiquement sur les devis et factures.'}
                </p>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Notes ou commentaires sur cette pièce..."
              rows={3}
            />
          </div>

          {/* Upload de photo */}
          {!isService && (
          <PartPhotoUpload
            photoUrl={photoUrl}
            onPhotoChange={setPhotoUrl}
            partName={watch('name') || 'cette pièce'}
            disabled={loading}
          />
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Sauvegarde...' : (isEdit ? 'Modifier' : 'Ajouter')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}