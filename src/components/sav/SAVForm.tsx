import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2 } from 'lucide-react';
import { useSAVCases } from '@/hooks/useSAVCases';
import { useCustomers } from '@/hooks/useCustomers';
import { useParts } from '@/hooks/useParts';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

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
  name: string;
  timeMinutes: number;
  quantity: number;
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
  
  const { user } = useAuth();
  const { profile } = useProfile();
  const { createCase } = useSAVCases();
  const { createCustomer } = useCustomers();
  const { parts } = useParts();

  const addPart = () => {
    setSelectedParts([
      ...selectedParts,
      {
        id: Date.now().toString(),
        name: '',
        timeMinutes: 0,
        quantity: 1,
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
      const totalTimeMinutes = selectedParts.reduce((acc, part) => acc + part.timeMinutes, 0);
      const totalCost = selectedParts.reduce((acc, part) => {
        const partData = parts.find(p => p.name === part.name);
        return acc + (partData?.selling_price || 0) * part.quantity;
      }, 0);
      
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
            <Button type="button" onClick={addPart} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une pièce
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {selectedParts.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aucune pièce ajoutée. Cliquez sur "Ajouter une pièce" pour commencer.
            </p>
          ) : (
            <div className="space-y-4">
              {selectedParts.map((part, index) => (
                <div key={part.id}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                      <Label htmlFor={`part-name-${part.id}`}>Nom de la pièce</Label>
                      <Input
                        id={`part-name-${part.id}`}
                        value={part.name}
                        onChange={(e) => updatePart(part.id, 'name', e.target.value)}
                        placeholder="Ex: Écran LCD"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`part-time-${part.id}`}>Temps (minutes)</Label>
                      <Input
                        id={`part-time-${part.id}`}
                        type="number"
                        min="0"
                        value={part.timeMinutes}
                        onChange={(e) => updatePart(part.id, 'timeMinutes', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="flex items-end space-x-2">
                      <div className="flex-1">
                        <Label htmlFor={`part-qty-${part.id}`}>Quantité</Label>
                        <Input
                          id={`part-qty-${part.id}`}
                          type="number"
                          min="1"
                          value={part.quantity}
                          onChange={(e) => updatePart(part.id, 'quantity', parseInt(e.target.value) || 1)}
                        />
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
                  </div>
                </div>
              ))}
            </div>
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