import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Percent, Euro, X } from 'lucide-react';

interface DiscountManagerProps {
  subtotal: number;
  discount: DiscountInfo | null;
  onDiscountChange: (discount: DiscountInfo | null) => void;
  disabled?: boolean;
}

export interface DiscountInfo {
  type: 'percentage' | 'fixed';
  value: number;
  amount: number; // Montant de la remise calculée
}

export function DiscountManager({ 
  subtotal, 
  discount, 
  onDiscountChange, 
  disabled = false 
}: DiscountManagerProps) {
  const [showDiscountForm, setShowDiscountForm] = useState(!!discount);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(discount?.type || 'percentage');
  const [discountValue, setDiscountValue] = useState(discount?.value || 0);

  const calculateDiscountAmount = (type: 'percentage' | 'fixed', value: number) => {
    if (type === 'percentage') {
      return Math.min((subtotal * value) / 100, subtotal);
    } else {
      return Math.min(value, subtotal);
    }
  };

  const handleApplyDiscount = () => {
    if (discountValue > 0) {
      const amount = calculateDiscountAmount(discountType, discountValue);
      onDiscountChange({
        type: discountType,
        value: discountValue,
        amount
      });
    }
    setShowDiscountForm(false);
  };

  const handleRemoveDiscount = () => {
    onDiscountChange(null);
    setShowDiscountForm(false);
    setDiscountValue(0);
  };

  const handleDiscountValueChange = (value: number) => {
    // Valider les limites selon le type
    if (discountType === 'percentage') {
      value = Math.max(0, Math.min(100, value));
    } else {
      value = Math.max(0, Math.min(subtotal, value));
    }
    setDiscountValue(value);
  };

  const previewAmount = calculateDiscountAmount(discountType, discountValue);
  const finalTotal = subtotal - (discount?.amount || 0);

  if (disabled || subtotal === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {!showDiscountForm && !discount && (
        <div className="flex justify-end">
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={() => setShowDiscountForm(true)}
            className="text-primary border-primary hover:bg-primary/10"
          >
            <Percent className="h-4 w-4 mr-2" />
            Faire une remise
          </Button>
        </div>
      )}

      {discount && !showDiscountForm && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Remise appliquée
                </Badge>
                <span className="text-sm">
                  {discount.type === 'percentage' ? (
                    <>
                      <Percent className="h-3 w-3 inline mr-1" />
                      {discount.value}% (-{discount.amount.toFixed(2)}€)
                    </>
                  ) : (
                    <>
                      <Euro className="h-3 w-3 inline mr-1" />
                      -{discount.amount.toFixed(2)}€
                    </>
                  )}
                </span>
              </div>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDiscountForm(true)}
                >
                  Modifier
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleRemoveDiscount}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showDiscountForm && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Configuration de la remise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Type de remise</Label>
              <RadioGroup 
                value={discountType} 
                onValueChange={(value) => {
                  setDiscountType(value as 'percentage' | 'fixed');
                  setDiscountValue(0);
                }}
                className="flex flex-row gap-6 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="percentage" id="percentage" />
                  <Label htmlFor="percentage" className="flex items-center gap-1">
                    <Percent className="h-4 w-4" />
                    Pourcentage
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id="fixed" />
                  <Label htmlFor="fixed" className="flex items-center gap-1">
                    <Euro className="h-4 w-4" />
                    Montant fixe
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="discount-value" className="text-sm font-medium">
                {discountType === 'percentage' ? 'Pourcentage (%)' : 'Montant (€)'}
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="discount-value"
                  type="number"
                  min="0"
                  max={discountType === 'percentage' ? 100 : subtotal}
                  step={discountType === 'percentage' ? '1' : '0.01'}
                  value={discountValue}
                  onChange={(e) => handleDiscountValueChange(parseFloat(e.target.value) || 0)}
                  placeholder={discountType === 'percentage' ? '10' : '50.00'}
                  className="flex-1"
                />
                {discountType === 'percentage' && (
                  <span className="text-sm text-muted-foreground">%</span>
                )}
                {discountType === 'fixed' && (
                  <span className="text-sm text-muted-foreground">€</span>
                )}
              </div>
              {discountType === 'percentage' && discountValue > 100 && (
                <p className="text-xs text-destructive mt-1">
                  Le pourcentage ne peut pas dépasser 100%
                </p>
              )}
              {discountType === 'fixed' && discountValue > subtotal && (
                <p className="text-xs text-destructive mt-1">
                  La remise ne peut pas dépasser le sous-total
                </p>
              )}
            </div>

            {discountValue > 0 && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Sous-total :</span>
                  <span>{subtotal.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-sm text-primary">
                  <span>Remise :</span>
                  <span>-{previewAmount.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-2 mt-2">
                  <span>Total final :</span>
                  <span>{(subtotal - previewAmount).toFixed(2)}€</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowDiscountForm(false);
                  if (!discount) {
                    setDiscountValue(0);
                  }
                }}
              >
                Annuler
              </Button>
              <Button 
                type="button" 
                onClick={handleApplyDiscount}
                disabled={discountValue <= 0}
              >
                Appliquer la remise
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}