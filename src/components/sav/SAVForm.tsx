import { useState } from 'react';
import { multiWordSearch } from '@/utils/searchUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Search } from 'lucide-react';
import { useSAVCases } from '@/hooks/useSAVCases';
import { useCustomers } from '@/hooks/useCustomers';
import { useParts } from '@/hooks/useParts';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Badge } from '@/components/ui/badge';

interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
}

interface DeviceInfo {
  brand: string;
  model: string;
  imei: string;
  problemDescription: string;
}

interface SelectedPart {
  id: string;
  part_id?: string; // ID de la pièce du stock, null pour champ libre
  name: string;
  reference?: string;
  quantity: number;
  unitPrice: number;
  availableStock?: number;
  isCustom: boolean; // true pour les champs libres
}

interface SAVFormProps {
  onSuccess?: () => void;
}

export function SAVForm({ onSuccess }: SAVFormProps) {
  const [savType, setSavType] = useState<'client' | 'internal'>('client');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
  });
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    brand: '',
    model: '',
    imei: '',
    problemDescription: '',
  });
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { user } = useAuth();
  const { profile } = useProfile();
  const { createCase } = useSAVCases();
  const { createCustomer } = useCustomers();
  const { parts } = useParts();

  // Filtrer les pièces en fonction de la recherche
  const filteredParts = parts.filter(part =>
    multiWordSearch(searchTerm, part.name, part.reference)
  );

  // Ajouter une pièce du stock
  const addPartFromStock = (part: any) => {
    const existingPart = selectedParts.find(p => p.part_id === part.id);
    
    if (existingPart && !existingPart.isCustom) {
      // Incrémenter la quantité si la pièce existe déjà
      setSelectedParts(selectedParts.map(p =>
        p.part_id === part.id ? { ...p, quantity: p.quantity + 1 } : p
      ));
    } else {
      // Ajouter nouvelle pièce du stock
      setSelectedParts([
        ...selectedParts,
        {
          id: Date.now().toString(),
          part_id: part.id,
          name: part.name,
          reference: part.reference,
          quantity: 1,
          unitPrice: part.selling_price || 0,
          availableStock: part.quantity,
          isCustom: false,
        },
      ]);
    }
    setSearchTerm('');
  };

  // Ajouter une pièce libre (champ libre)
  const addCustomPart = () => {
    setSelectedParts([
      ...selectedParts,
      {
        id: Date.now().toString(),
        name: '',
        quantity: 1,
        unitPrice: 0,
        isCustom: true,
      },
    ]);
  };

  const removePart = (id: string) => {
    setSelectedParts(selectedParts.filter((part) => part.id !== id));
  };

  const updatePart = (id: string, field: keyof SelectedPart, value: string | number) => {
    setSelectedParts(
      selectedParts.map((part) =>
        part.id === id ? { ...part, [field]: value } : part
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    
    try {
      let customerId = null;
      
      // Create customer if SAV client
      if (savType === 'client') {
        const { data: customer, error: customerError } = await createCustomer({
          first_name: customerInfo.firstName,
          last_name: customerInfo.lastName,
          email: customerInfo.email,
          phone: customerInfo.phone,
          address: customerInfo.address,
          shop_id: profile?.shop_id,
        });
        if (customerError) throw customerError;
        customerId = customer.id;
      }
      
      // Calculate totals
      const totalTimeMinutes = 0; // Suppression du calcul du temps
      // Pour les SAV internes, ne pas compter les prix TTC dans le chiffre d'affaires
      const totalCost = savType === 'internal' ? 0 : selectedParts.reduce((acc, part) => acc + part.unitPrice * part.quantity, 0);
      
      // Create SAV case
      const { error: caseError } = await createCase({
        sav_type: savType,
        customer_id: customerId,
        device_brand: deviceInfo.brand,
        device_model: deviceInfo.model,
        device_imei: deviceInfo.imei || null,
        problem_description: deviceInfo.problemDescription,
        total_time_minutes: totalTimeMinutes,
        total_cost: totalCost,
        status: 'pending',
        shop_id: profile?.shop_id,
      });
      
      if (caseError) throw caseError;
      
      // Reset form
      setSavType('client');
      setCustomerInfo({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
      });
      setDeviceInfo({
        brand: '',
        model: '',
        imei: '',
        problemDescription: '',
      });
      setSelectedParts([]);
      
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating SAV case:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Type de SAV</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={savType} onValueChange={(value) => setSavType(value as 'client' | 'internal')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="client" id="client" />
              <Label htmlFor="client">SAV Client</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="internal" id="internal" />
              <Label htmlFor="internal">SAV Interne Magasin</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {savType === 'client' && (
        <Card>
          <CardHeader>
            <CardTitle>Informations Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  value={customerInfo.firstName}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, firstName: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  id="lastName"
                  value={customerInfo.lastName}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, lastName: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, email: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={customerInfo.phone}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, phone: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="address">Adresse</Label>
              <Textarea
                id="address"
                value={customerInfo.address}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, address: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informations Appareil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="brand">Marque *</Label>
              <Input
                id="brand"
                value={deviceInfo.brand}
                onChange={(e) =>
                  setDeviceInfo({ ...deviceInfo, brand: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="model">Modèle *</Label>
              <Input
                id="model"
                value={deviceInfo.model}
                onChange={(e) =>
                  setDeviceInfo({ ...deviceInfo, model: e.target.value })
                }
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="imei">IMEI</Label>
            <Input
              id="imei"
              value={deviceInfo.imei}
              onChange={(e) =>
                setDeviceInfo({ ...deviceInfo, imei: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="problemDescription">Description du problème *</Label>
            <Textarea
              id="problemDescription"
              value={deviceInfo.problemDescription}
              onChange={(e) =>
                setDeviceInfo({ ...deviceInfo, problemDescription: e.target.value })
              }
              placeholder="Décrivez le problème rencontré..."
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pièces détachées</CardTitle>
            <Button type="button" onClick={addCustomPart} size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter pièce libre
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recherche de pièces en stock */}
          <div>
            <Label htmlFor="part-search">Rechercher une pièce en stock</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="part-search"
                placeholder="Nom ou référence de la pièce..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Résultats de recherche */}
            {searchTerm && (
              <div className="mt-2 max-h-40 overflow-y-auto border rounded-md">
                {filteredParts.length === 0 ? (
                  <div className="p-3">
                    <p className="text-sm text-muted-foreground mb-2">Aucune pièce trouvée en stock</p>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline"
                      onClick={addCustomPart}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-3 w-3" />
                      Ajouter "{searchTerm}" comme pièce libre
                    </Button>
                  </div>
                ) : (
                  filteredParts.slice(0, 10).map((part) => (
                    <div
                      key={part.id}
                      className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                      onClick={() => addPartFromStock(part)}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{part.name}</div>
                        {part.reference && (
                          <div className="text-sm text-muted-foreground">Réf: {part.reference}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={part.quantity === 0 ? 'destructive' : part.quantity <= 5 ? 'default' : 'secondary'}>
                          Stock: {part.quantity}
                        </Badge>
                        <Button size="sm" variant="outline">
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Pièces sélectionnées */}
          <div>
            <h4 className="font-medium mb-3">Pièces sélectionnées</h4>
            {selectedParts.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Aucune pièce ajoutée. Utilisez la recherche ci-dessus ou ajoutez une pièce libre.
              </p>
            ) : (
              <div className="space-y-4">
                {selectedParts.map((part, index) => (
                  <div key={part.id}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {part.isCustom ? (
                              <Badge variant="outline">Pièce libre</Badge>
                            ) : (
                              <Badge variant="secondary">En stock</Badge>
                            )}
                            {!part.isCustom && part.availableStock !== undefined && (
                              <Badge variant={part.availableStock === 0 ? 'destructive' : part.availableStock <= 5 ? 'default' : 'secondary'}>
                                Stock: {part.availableStock}
                              </Badge>
                            )}
                          </div>
                          {part.reference && (
                            <div className="text-sm text-muted-foreground mt-1">Réf: {part.reference}</div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removePart(part.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor={`part-name-${part.id}`}>Nom de la pièce</Label>
                          <Input
                            id={`part-name-${part.id}`}
                            value={part.name}
                            onChange={(e) => updatePart(part.id, 'name', e.target.value)}
                            placeholder="Ex: Écran LCD"
                            disabled={!part.isCustom}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`part-qty-${part.id}`}>Quantité</Label>
                          <Input
                            id={`part-qty-${part.id}`}
                            type="number"
                            min="1"
                            value={part.quantity}
                            onChange={(e) => updatePart(part.id, 'quantity', parseInt(e.target.value) || 1)}
                          />
                          {!part.isCustom && part.availableStock !== undefined && part.quantity > part.availableStock && (
                            <div className="text-xs text-destructive mt-1">
                              Quantité demandée supérieure au stock
                            </div>
                          )}
                        </div>
                        <div>
                          <Label htmlFor={`part-price-${part.id}`}>Prix unitaire (€)</Label>
                          <Input
                            id={`part-price-${part.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={part.unitPrice}
                            onChange={(e) => updatePart(part.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            disabled={!part.isCustom}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Résumé */}
          {selectedParts.length > 0 && (
            <>
              <Separator />
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total pièces: </span>
                    <span>{selectedParts.reduce((acc, part) => acc + part.quantity, 0)}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-medium">Coût total: </span>
                    <span className="font-bold">
                      {selectedParts.reduce((acc, part) => acc + (part.quantity * part.unitPrice), 0).toFixed(2)}€
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline">
          Annuler
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Création...' : 'Créer le dossier SAV'}
        </Button>
      </div>
    </form>
  );
}