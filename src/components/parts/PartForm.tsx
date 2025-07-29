import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Part } from '@/hooks/useParts';

interface PartFormProps {
  initialData?: Partial<Part>;
  onSubmit: (data: any) => Promise<{ error: any }>;
  onCancel: () => void;
  isEdit?: boolean;
}

export function PartForm({ initialData, onSubmit, onCancel, isEdit = false }: PartFormProps) {
  const [loading, setLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: {
      name: initialData?.name || '',
      reference: initialData?.reference || '',
      purchase_price: initialData?.purchase_price || 0,
      selling_price: initialData?.selling_price || 0,
      quantity: initialData?.quantity || 0,
      min_stock: initialData?.min_stock || 5,
      notes: initialData?.notes || '',
    }
  });

  const onFormSubmit = async (data: any) => {
    setLoading(true);
    try {
      const { error } = await onSubmit(data);
      if (!error) {
        onCancel();
      }
    } finally {
      setLoading(false);
    }
  };

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
              <Label htmlFor="purchase_price">Prix d'achat (€)</Label>
              <Input
                id="purchase_price"
                type="number"
                step="0.01"
                min="0"
                {...register('purchase_price', { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="selling_price">Prix de vente (€)</Label>
              <Input
                id="selling_price"
                type="number"
                step="0.01"
                min="0"
                {...register('selling_price', { valueAsNumber: true })}
                placeholder="0.00"
              />
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
                placeholder="5"
              />
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