import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Part } from '@/hooks/useParts';
import { SimilarPartsAlert } from './SimilarPartsAlert';
import { PartPhotoUpload } from './PartPhotoUpload';

interface PartFormProps {
  initialData?: Partial<Part>;
  onSubmit: (data: any) => Promise<{ error: any }>;
  onCancel: () => void;
  isEdit?: boolean;
  findSimilarParts?: (name: string, excludeId?: string) => Part[];
}

export function PartForm({ initialData, onSubmit, onCancel, isEdit = false, findSimilarParts }: PartFormProps) {
  const [loading, setLoading] = useState(false);
  const [showSimilarAlert, setShowSimilarAlert] = useState(false);
  const [similarParts, setSimilarParts] = useState<Part[]>([]);
  const [pendingData, setPendingData] = useState<any>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialData?.photo_url || null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
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
      // Ajouter l'URL de la photo aux données
      const partData = {
        ...data,
        photo_url: photoUrl
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
          {isEdit ? 'Modifier la pièce' : 'Ajouter une nouvelle pièce'}
        </CardTitle>
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
              <Input
                id="supplier"
                {...register('supplier')}
                placeholder="Ex: Fournisseur ABC"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch id="use_margin" checked={useMargin} onCheckedChange={setUseMargin} />
            <Label htmlFor="use_margin">Définir le prix public via une marge (%)</Label>
          </div>
          {useMargin && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="margin">Marge (%)</Label>
                <Input
                  id="margin"
                  type="number"
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
              <Input
                id="purchase_price"
                type="number"
                step="0.01"
                min="0"
                {...register('purchase_price', { valueAsNumber: true })}
                placeholder="0.00"
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
              <Input
                id="selling_price"
                type="number"
                step="0.01"
                min="0"
                {...register('selling_price', { valueAsNumber: true })}
                placeholder="0.00"
                readOnly={useMargin}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantité en stock</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                {...register('quantity', { valueAsNumber: true })}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="min_stock">Stock minimum</Label>
              <Input
                id="min_stock"
                type="number"
                min="0"
                {...register('min_stock', { valueAsNumber: true })}
                placeholder="1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="time_minutes">Temps (minutes)</Label>
              <Input
                id="time_minutes"
                type="number"
                min="0"
                {...register('time_minutes', { valueAsNumber: true })}
                placeholder="15"
              />
              <p className="text-xs text-muted-foreground mt-1">Par défaut: 15 minutes</p>
            </div>
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
          <PartPhotoUpload
            photoUrl={photoUrl}
            onPhotoChange={setPhotoUrl}
            partName={watch('name') || 'cette pièce'}
            disabled={loading}
          />

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