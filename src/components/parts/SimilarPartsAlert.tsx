import { AlertTriangle, Package, Euro } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Part } from '@/hooks/useParts';

interface SimilarPartsAlertProps {
  similarParts: Part[];
  onProceed: () => void;
  onCancel: () => void;
}

export function SimilarPartsAlert({ similarParts, onProceed, onCancel }: SimilarPartsAlertProps) {
  const formatCurrency = (value: number | undefined) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Pièces similaires détectées</AlertTitle>
        <AlertDescription>
          {similarParts.length} pièce(s) similaire(s) ont été trouvées dans votre inventaire. 
          Vérifiez si vous ne créez pas un doublon.
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        <h4 className="font-medium text-sm text-muted-foreground">Pièces existantes similaires :</h4>
        
        {similarParts.map((part) => (
          <Card key={part.id} className="border-orange-200 bg-orange-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                {part.name}
                {part.reference && (
                  <Badge variant="outline" className="text-xs">
                    {part.reference}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Prix d'achat :</span>
                  <div className="font-medium">{formatCurrency(part.purchase_price)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Prix public :</span>
                  <div className="font-medium">{formatCurrency(part.selling_price)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Stock :</span>
                  <div className="font-medium">
                    {part.quantity} unité(s)
                    {part.quantity <= part.min_stock && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        Stock faible
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Temps :</span>
                  <div className="font-medium">{part.time_minutes || 15} min</div>
                </div>
              </div>
              {part.notes && (
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">Notes :</span>
                  <div className="text-xs text-muted-foreground italic">{part.notes}</div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          <AlertTriangle className="h-4 w-4 mr-2" />
          Annuler la création
        </Button>
        <Button onClick={onProceed} variant="destructive">
          Créer quand même
        </Button>
      </div>
    </div>
  );
}