import { useState } from 'react';
import { multiWordSearch } from '@/utils/searchUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useParts } from '@/hooks/useParts';
import { Search, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { QuoteItem, Quote } from '@/hooks/useQuotes';
import { CustomerSearch } from '@/components/customers/CustomerSearch';
import { useEffect } from 'react';

interface QuoteFormProps {
  onSubmit: (data: any) => Promise<{ data: any; error: any }>;
  onCancel: () => void;
  initialQuote?: Quote;
  submitLabel?: string;
  title?: string;
}

export function QuoteForm({ onSubmit, onCancel, initialQuote, submitLabel, title }: QuoteFormProps) {
  const { parts } = useParts();
  const [customerInfo, setCustomerInfo] = useState({ firstName: '', lastName: '', email: '', phone: '', address: '' });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<QuoteItem[]>([]);
  const [deviceInfo, setDeviceInfo] = useState({ brand: '', model: '', imei: '', sku: '', problemDescription: '' });

  useEffect(() => {
    if (initialQuote) {
      const [firstName, ...rest] = (initialQuote.customer_name || '').split(' ');
      setCustomerInfo({
        firstName: firstName || '',
        lastName: rest.join(' ') || '',
        email: initialQuote.customer_email || '',
        phone: initialQuote.customer_phone || '',
        address: '',
      });
      setSelectedItems(initialQuote.items || []);
      // Pré-remplir infos appareil si présentes
      setDeviceInfo({
        brand: (initialQuote as any).device_brand || '',
        model: (initialQuote as any).device_model || '',
        imei: (initialQuote as any).device_imei || '',
        sku: (initialQuote as any).sku || '',
        problemDescription: (initialQuote as any).problem_description || '',
      });
      // Customer id is optional in quotes schema
      setSelectedCustomerId(null);
    }
  }, [initialQuote]);
  const filteredParts = parts.filter(part =>
    multiWordSearch(searchTerm, part.name, part.reference)
  );

const addPartToQuote = (partId: string) => {
  const part = parts.find(p => p.id === partId);
  if (!part) return;

  const existingItem = selectedItems.find(item => item.part_id === partId);
  if (existingItem) {
    setSelectedItems(items =>
      items.map(item =>
        item.part_id === partId
          ? { ...item, quantity: item.quantity + 1, total_price: (item.quantity + 1) * item.unit_public_price }
          : item
      )
    );
  } else {
    const newItem: QuoteItem = {
      part_id: part.id,
      part_name: part.name,
      part_reference: part.reference,
      quantity: 1,
      unit_public_price: part.selling_price || 0,
      unit_purchase_price: part.purchase_price || 0,
      total_price: (part.selling_price || 0),
    } as QuoteItem;
    setSelectedItems(items => [...items, newItem]);
  }
  setSearchTerm('');
};

const addCustomItem = () => {
  const newItem: QuoteItem = {
    part_id: `custom-${Date.now()}`,
    part_name: '',
    part_reference: '',
    quantity: 1,
    unit_public_price: 0,
    unit_purchase_price: 0,
    total_price: 0,
  } as QuoteItem;
  setSelectedItems(items => [...items, newItem]);
};

const updateQuantity = (partId: string, quantity: number) => {
  if (quantity <= 0) {
    removePartFromQuote(partId);
    return;
  }

  setSelectedItems(items =>
    items.map(item =>
      item.part_id === partId
        ? { ...item, quantity, total_price: quantity * item.unit_public_price }
        : item
    )
  );
};

const updateUnitPublicPrice = (partId: string, unitPrice: number) => {
  setSelectedItems(items =>
    items.map(item =>
      item.part_id === partId
        ? { ...item, unit_public_price: unitPrice, total_price: item.quantity * unitPrice }
        : item
    )
  );
};

const updateUnitPurchasePrice = (partId: string, unitPrice: number) => {
  setSelectedItems(items =>
    items.map(item =>
      item.part_id === partId
        ? { ...item, unit_purchase_price: unitPrice }
        : item
    )
  );
};

  const updateItemName = (partId: string, name: string) => {
    setSelectedItems(items =>
      items.map(item =>
        item.part_id === partId
          ? { ...item, part_name: name }
          : item
      )
    );
  };

  const updateItemReference = (partId: string, reference: string) => {
    setSelectedItems(items =>
      items.map(item =>
        item.part_id === partId
          ? { ...item, part_reference: reference }
          : item
      )
    );
  };

  const removePartFromQuote = (partId: string) => {
    setSelectedItems(items => items.filter(item => item.part_id !== partId));
  };

  const totalAmount = selectedItems.reduce((sum, item) => sum + item.total_price, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerInfo.firstName.trim() || !customerInfo.lastName.trim()) {
      alert('Le nom et prénom du client sont requis');
      return;
    }

    if (selectedItems.length === 0) {
      alert('Veuillez ajouter au moins une pièce au devis');
      return;
    }

    const { error } = await onSubmit({
      customer_name: `${customerInfo.firstName} ${customerInfo.lastName}`.trim(),
      customer_email: customerInfo.email || null,
      customer_phone: customerInfo.phone || null,
      // Informations appareil
      device_brand: deviceInfo.brand ? deviceInfo.brand.toUpperCase().trim() : null,
      device_model: deviceInfo.model ? deviceInfo.model.toUpperCase().trim() : null,
      device_imei: deviceInfo.imei || null,
      sku: deviceInfo.sku || null,
      problem_description: deviceInfo.problemDescription || null,
      notes: notes || null,
      items: selectedItems,
      total_amount: totalAmount,
      status: initialQuote?.status ?? 'draft'
    });

    if (!error) {
      onCancel();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <h1 className="text-2xl font-bold">{title ?? (initialQuote ? 'Modifier le devis' : 'Nouveau devis')}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations client */}
        <Card>
          <CardHeader>
            <CardTitle>Informations client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CustomerSearch
              customerInfo={customerInfo}
              setCustomerInfo={setCustomerInfo}
              onCustomerSelected={(customer) => setSelectedCustomerId(customer.id)}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerFirstName">Prénom *</Label>
                <Input
                  id="customerFirstName"
                  value={customerInfo.firstName}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="customerLastName">Nom *</Label>
                <Input
                  id="customerLastName"
                  value={customerInfo.lastName}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, lastName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Téléphone</Label>
                <Input
                  id="customerPhone"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes additionnelles pour le devis..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Informations Appareil */}
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
                  onChange={(e) => setDeviceInfo({ ...deviceInfo, brand: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="model">Modèle *</Label>
                <Input
                  id="model"
                  value={deviceInfo.model}
                  onChange={(e) => setDeviceInfo({ ...deviceInfo, model: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="imei">IMEI</Label>
                <Input
                  id="imei"
                  value={deviceInfo.imei}
                  onChange={(e) => setDeviceInfo({ ...deviceInfo, imei: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={deviceInfo.sku}
                  onChange={(e) => setDeviceInfo({ ...deviceInfo, sku: e.target.value.replace(/[^0-9]/g, '').slice(0, 13) })}
                  placeholder="Numérique uniquement (13 caractères max)"
                  maxLength={13}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="problemDescription">Description du problème *</Label>
              <Textarea
                id="problemDescription"
                value={deviceInfo.problemDescription}
                onChange={(e) => setDeviceInfo({ ...deviceInfo, problemDescription: e.target.value })}
                placeholder="Décrivez le problème rencontré..."
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Recherche de pièces */}
        <Card>
          <CardHeader>
            <CardTitle>Ajouter des pièces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Rechercher une pièce par nom ou référence..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {searchTerm && (
              <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                {filteredParts.map((part) => (
                  <div
                    key={part.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => addPartToQuote(part.id)}
                  >
                    <div>
                      <p className="font-medium">{part.name}</p>
                      {part.reference && (
                        <p className="text-sm text-muted-foreground">Réf: {part.reference}</p>
                      )}
<p className="text-sm text-muted-foreground">
  Public: {(part.selling_price || 0).toFixed(2)}€ • Achat: {(part.purchase_price || 0).toFixed(2)}€
</p>
                    </div>
                    <Button type="button" size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {filteredParts.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    Aucune pièce trouvée
                  </p>
                )}
              </div>
            )}

            <div className="mt-4">
              <Button type="button" onClick={addCustomItem} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une ligne personnalisée
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pièces sélectionnées */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Pièces du devis</span>
              <Button type="button" variant="ghost" size="icon" onClick={addCustomItem} aria-label="Ajouter une pièce">
                <Plus className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Aucune pièce ajoutée au devis
              </p>
            ) : (
              <div className="space-y-4">
                {selectedItems.map((item) => {
                  const isCustomItem = item.part_id.toString().startsWith('custom-');
                  
                  return (
                    <div key={item.part_id} className="flex flex-col gap-4 p-4 border rounded-lg">
                      {isCustomItem && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Nom du produit/service:</Label>
                            <Input
                              value={item.part_name}
                              onChange={(e) => updateItemName(item.part_id, e.target.value)}
                              placeholder="Ex: Main d'œuvre, Diagnostic..."
                            />
                          </div>
                          <div>
                            <Label>Référence (optionnel):</Label>
                            <Input
                              value={item.part_reference || ''}
                              onChange={(e) => updateItemReference(item.part_id, e.target.value)}
                              placeholder="Référence ou code"
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          {!isCustomItem && (
                            <>
                              <p className="font-medium">{item.part_name}</p>
                              {item.part_reference && (
                                <Badge variant="outline">Réf: {item.part_reference}</Badge>
                              )}
                            </>
                          )}
                          {isCustomItem && item.part_name && (
                            <>
                              <p className="font-medium">{item.part_name}</p>
                              {item.part_reference && (
                                <Badge variant="outline">Réf: {item.part_reference}</Badge>
                              )}
                            </>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Label>Qté:</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.part_id, parseInt(e.target.value) || 0)}
                            className="w-20"
                          />
                        </div>
                        
<div className="flex items-center gap-2">
  <Label>Prix public:</Label>
  <Input
    type="number"
    step="0.01"
    min="0"
    value={item.unit_public_price}
    onChange={(e) => updateUnitPublicPrice(item.part_id, parseFloat(e.target.value) || 0)}
    className="w-24"
  />
  <span>€</span>
</div>

<div className="flex items-center gap-2">
  <Label>Prix d'achat:</Label>
  <Input
    type="number"
    step="0.01"
    min="0"
    value={item.unit_purchase_price}
    onChange={(e) => updateUnitPurchasePrice(item.part_id, parseFloat(e.target.value) || 0)}
    className="w-24"
  />
  <span>€</span>
</div>
                        
                        <div className="text-right">
                          <p className="font-medium">{item.total_price.toFixed(2)}€</p>
                        </div>
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removePartFromQuote(item.part_id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span>{totalAmount.toFixed(2)}€</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit">
            {submitLabel ?? (initialQuote ? 'Mettre à jour le devis' : 'Créer le devis')}
          </Button>
        </div>
      </form>
    </div>
  );
}