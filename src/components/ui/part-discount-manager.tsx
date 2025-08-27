import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Percent, Euro, X } from 'lucide-react';

export interface PartDiscountInfo {
  type: 'percentage' | 'fixed';
  value: number;
  amount: number; // Montant de la remise calculée
}

interface PartDiscountManagerProps {
  partName: string;
  unitPrice: number;
  quantity: number;
  discount: PartDiscountInfo | null;
  onDiscountChange: (discount: PartDiscountInfo | null) => void;
  disabled?: boolean;
}

export function PartDiscountManager({ 
  partName,
  unitPrice, 
  quantity,
  discount, 
  onDiscountChange, 
  disabled = false 
}: PartDiscountManagerProps) {
  const [showDiscountForm, setShowDiscountForm] = useState(!!discount);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(discount?.type || 'percentage');
  const [discountValue, setDiscountValue] = useState(discount?.value || 0);

  const lineTotal = unitPrice * quantity;

  const calculateDiscountAmount = (type: 'percentage' | 'fixed', value: number) => {
    if (type === 'percentage') {
      return Math.min((lineTotal * value) / 100, lineTotal);
    } else {
      return Math.min(value, lineTotal);
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
      value = Math.max(0, Math.min(lineTotal, value));
    }
    setDiscountValue(value);
  };

  const previewAmount = calculateDiscountAmount(discountType, discountValue);
  const finalTotal = lineTotal - (discount?.amount || 0);

  if (disabled || lineTotal === 0) {
    return null;
  }

  return (
    <div className="mt-2">
      {!showDiscountForm && !discount && (
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => setShowDiscountForm(true)}
          className="text-primary border-primary hover:bg-primary/10 h-8"
        >
          <Percent className="h-3 w-3 mr-1" />
          Remise
        </Button>
      )}

      {discount && !showDiscountForm && (
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
            {discount.type === 'percentage' ? (
              <>
                <Percent className="h-2 w-2 mr-1" />
                {discount.value}%
              </>
            ) : (
              <>
                <Euro className="h-2 w-2 mr-1" />
                {discount.value}€
              </>
            )}
          </Badge>
          <span className="text-xs text-muted-foreground">
            (-{discount.amount.toFixed(2)}€)
          </span>
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={() => setShowDiscountForm(true)}
            className="h-6 px-2 text-xs"
          >
            Modifier
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            onClick={handleRemoveDiscount}
            className="h-6 px-1"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {showDiscountForm && (
        <Card className="border-primary/20 mt-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Remise - {partName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div>
              <Label className="text-xs font-medium">Type de remise</Label>
              <RadioGroup 
                value={discountType} 
                onValueChange={(value) => {
                  setDiscountType(value as 'percentage' | 'fixed');
                  setDiscountValue(0);
                }}
                className="flex flex-row gap-4 mt-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="percentage" id={`percentage-${partName}`} />
                  <Label htmlFor={`percentage-${partName}`} className="flex items-center gap-1 text-xs">
                    <Percent className="h-3 w-3" />
                    %
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id={`fixed-${partName}`} />
                  <Label htmlFor={`fixed-${partName}`} className="flex items-center gap-1 text-xs">
                    <Euro className="h-3 w-3" />
                    €
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor={`discount-value-${partName}`} className="text-xs font-medium">
                {discountType === 'percentage' ? 'Pourcentage (%)' : 'Montant (€)'}
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id={`discount-value-${partName}`}
                  type="number"
                  min="0"
                  max={discountType === 'percentage' ? 100 : lineTotal}
                  step={discountType === 'percentage' ? '1' : '0.01'}
                  value={discountValue}
                  onChange={(e) => handleDiscountValueChange(parseFloat(e.target.value) || 0)}
                  placeholder={discountType === 'percentage' ? '10' : '5.00'}
                  className="text-xs h-8"
                />
                {discountType === 'percentage' && (
                  <span className="text-xs text-muted-foreground">%</span>
                )}
                {discountType === 'fixed' && (
                  <span className="text-xs text-muted-foreground">€</span>
                )}
              </div>
              {discountType === 'percentage' && discountValue > 100 && (
                <p className="text-xs text-destructive mt-1">
                  Maximum 100%
                </p>
              )}
              {discountType === 'fixed' && discountValue > lineTotal && (
                <p className="text-xs text-destructive mt-1">
                  Maximum {lineTotal.toFixed(2)}€
                </p>
              )}
            </div>

            {discountValue > 0 && (
              <div className="bg-muted/50 p-2 rounded text-xs">
                <div className="flex justify-between">
                  <span>Prix ligne :</span>
                  <span>{lineTotal.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-primary">
                  <span>Remise :</span>
                  <span>-{previewAmount.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1 mt-1">
                  <span>Total :</span>
                  <span>{(lineTotal - previewAmount).toFixed(2)}€</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setShowDiscountForm(false);
                  if (!discount) {
                    setDiscountValue(0);
                  }
                }}
                className="h-7 px-2 text-xs"
              >
                Annuler
              </Button>
              <Button 
                type="button" 
                size="sm"
                onClick={handleApplyDiscount}
                disabled={discountValue <= 0}
                className="h-7 px-2 text-xs"
              >
                Appliquer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}