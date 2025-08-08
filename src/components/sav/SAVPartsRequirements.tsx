import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Package, ShoppingCart, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SAVPartsEditor } from '@/components/sav/SAVPartsEditor';

interface SAVPartRequirement {
  id: string;
  part_id: string | null;
  part_name: string;
  part_reference?: string;
  quantity: number;
  unit_price: number;
  available_stock?: number;
  min_stock?: number;
  needs_ordering: boolean;
  missing_quantity: number;
}

interface SAVPartsRequirementsProps {
  savCaseId: string;
}

export function SAVPartsRequirements({ savCaseId }: SAVPartsRequirementsProps) {
  const [requirements, setRequirements] = useState<SAVPartRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPartsRequirements = async () => {
    try {
      setLoading(true);
      
      // Récupérer les pièces du dossier SAV avec les informations de stock
      const { data: savParts, error: savError } = await supabase
        .from('sav_parts')
        .select(`
          id,
          part_id,
          quantity,
          unit_price,
          parts (
            name,
            reference,
            quantity,
            min_stock
          )
        `)
        .eq('sav_case_id', savCaseId);

      if (savError) throw savError;

      if (savParts) {
        const partsRequirements = savParts.map(savPart => {
          const part = savPart.parts as any;
          const availableStock = part?.quantity || 0;
          const neededQuantity = savPart.quantity;
          const missingQuantity = Math.max(0, neededQuantity - availableStock);
          const needsOrdering = missingQuantity > 0;

          return {
            id: savPart.id,
            part_id: savPart.part_id,
            part_name: part?.name || `Pièce personnalisée`,
            part_reference: part?.reference,
            quantity: neededQuantity,
            unit_price: savPart.unit_price,
            available_stock: availableStock,
            min_stock: part?.min_stock || 0,
            needs_ordering: needsOrdering,
            missing_quantity: missingQuantity
          };
        });

        setRequirements(partsRequirements);
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les exigences de pièces",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createOrderItem = async (requirement: SAVPartRequirement) => {
    try {
      // Get current user's shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.shop_id) {
        throw new Error('Shop non trouvé pour cet utilisateur');
      }

      const { error } = await supabase
        .from('order_items')
        .insert({
          part_id: requirement.part_id!,
          part_name: requirement.part_name,
          part_reference: requirement.part_reference,
          quantity_needed: requirement.missing_quantity,
          sav_case_id: savCaseId,
          reason: `Pièce nécessaire pour SAV`,
          priority: 'high',
          shop_id: profile.shop_id
        });

      if (error) throw error;

      toast({
        title: "Commande créée",
        description: `${requirement.missing_quantity} ${requirement.part_name} ajouté aux commandes`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchPartsRequirements();
  }, [savCaseId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Pièces nécessaires
            </div>
            <SAVPartsEditor
              savCaseId={savCaseId}
              onPartsUpdated={fetchPartsRequirements}
              trigger={
                <Button variant="ghost" size="icon" aria-label="Ajouter une pièce">
                  <Plus className="h-4 w-4" />
                </Button>
              }
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  if (requirements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Pièces nécessaires
            </div>
            <SAVPartsEditor
              savCaseId={savCaseId}
              onPartsUpdated={fetchPartsRequirements}
              trigger={
                <Button variant="ghost" size="icon" aria-label="Ajouter une pièce">
                  <Plus className="h-4 w-4" />
                </Button>
              }
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            Aucune pièce nécessaire pour ce dossier
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPartsToOrder = requirements.filter(r => r.needs_ordering).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pièces nécessaires
          </div>
          {totalPartsToOrder > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {totalPartsToOrder} à commander
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {requirements.map((requirement) => (
          <div
            key={requirement.id}
            className="border rounded-lg p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium">{requirement.part_name}</h3>
                  {requirement.part_reference && (
                    <Badge variant="outline" className="text-xs">
                      Réf: {requirement.part_reference}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Prix unitaire: {requirement.unit_price.toFixed(2)}€
                </div>
              </div>
              
              <div className="text-right">
                {requirement.needs_ordering ? (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    À commander
                  </Badge>
                ) : (
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Disponible
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Nécessaire: </span>
                <span>{requirement.quantity}</span>
              </div>
              <div>
                <span className="font-medium">En stock: </span>
                <span className={requirement.available_stock <= requirement.min_stock ? 'text-orange-600' : ''}>
                  {requirement.available_stock}
                </span>
              </div>
              {requirement.needs_ordering && (
                <div>
                  <span className="font-medium text-red-600">Manquant: </span>
                  <span className="text-red-600 font-medium">{requirement.missing_quantity}</span>
                </div>
              )}
            </div>

            {requirement.needs_ordering && (
              <div className="pt-2 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => createOrderItem(requirement)}
                  className="w-full"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Commander {requirement.missing_quantity} pièce(s)
                </Button>
              </div>
            )}
          </div>
        ))}

        {totalPartsToOrder > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Action requise</span>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              {totalPartsToOrder} pièce(s) doivent être commandées avant de pouvoir terminer la réparation.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}