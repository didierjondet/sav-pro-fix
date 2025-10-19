import { useState } from 'react';
import { multiWordSearch } from '@/utils/searchUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useParts } from '@/hooks/useParts';
import { Search, Plus, Trash2, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { QuoteItem, Quote } from '@/hooks/useQuotes';
import { CustomerSearch } from '@/components/customers/CustomerSearch';
import { FileUpload } from '@/components/parts/FileUpload';
import { AITextReformulator } from '@/components/sav/AITextReformulator';
import { PartDiscountManager, PartDiscountInfo } from '@/components/ui/part-discount-manager';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { validateFrenchPhoneNumber, formatPhoneInput } from '@/utils/phoneValidation';
import { useCustomers } from '@/hooks/useCustomers';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface QuoteFormProps {
  onSubmit: (data: any) => Promise<{ data: any; error: any }>;
  onCancel: () => void;
  initialQuote?: Quote;
  submitLabel?: string;
  title?: string;
}

export function QuoteForm({ onSubmit, onCancel, initialQuote, submitLabel, title }: QuoteFormProps) {
  const { parts } = useParts();
  const { customers, createCustomer } = useCustomers();
  const { profile } = useProfile();
  const { toast } = useToast();
  
  const [customerInfo, setCustomerInfo] = useState({ firstName: '', lastName: '', email: '', phone: '', address: '' });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<QuoteItem[]>([]);
  const [deviceInfo, setDeviceInfo] = useState({ brand: '', model: '', imei: '', sku: '', problemDescription: '', attachments: [] as string[] });
  const [depositAmount, setDepositAmount] = useState<number>(0);
  
  // États pour validation téléphone et détection doublons
  const [phoneValidation, setPhoneValidation] = useState({ isValid: true, message: '' });
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

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
        attachments: (initialQuote as any).attachments || [],
      });
      // Customer id is optional in quotes schema
      setSelectedCustomerId(null);
    }
  }, [initialQuote]);
  
  // Validation du numéro de téléphone en temps réel
  useEffect(() => {
    if (customerInfo.phone.trim()) {
      const validation = validateFrenchPhoneNumber(customerInfo.phone);
      setPhoneValidation({
        isValid: validation.isValid,
        message: validation.message
      });
    } else {
      setPhoneValidation({ isValid: true, message: '' });
    }
  }, [customerInfo.phone]);

  // Détection de doublons en temps réel
  useEffect(() => {
    const checkDuplicates = async () => {
      if (!customerInfo.firstName.trim() || !customerInfo.lastName.trim()) {
        setDuplicateWarning(null);
        return;
      }

      // Ne pas vérifier si un client est déjà sélectionné
      if (selectedCustomerId) {
        setDuplicateWarning(null);
        return;
      }

      const nameMatch = customers.find(customer => 
        customer.first_name.toLowerCase().trim() === customerInfo.firstName.toLowerCase().trim() &&
        customer.last_name.toLowerCase().trim() === customerInfo.lastName.toLowerCase().trim()
      );

      if (nameMatch) {
        setDuplicateWarning(`Un client avec le nom "${customerInfo.firstName} ${customerInfo.lastName}" existe déjà.`);
      } else if (customerInfo.email.trim()) {
        const emailMatch = customers.find(customer => 
          customer.email && customer.email.toLowerCase().trim() === customerInfo.email.toLowerCase().trim()
        );
        
        if (emailMatch) {
          setDuplicateWarning(`Un client avec l'email "${customerInfo.email}" existe déjà.`);
        } else {
          setDuplicateWarning(null);
        }
      } else {
        setDuplicateWarning(null);
      }
    };

    // Debounce la vérification pour éviter trop d'appels
    const timer = setTimeout(checkDuplicates, 500);
    return () => clearTimeout(timer);
  }, [customerInfo.firstName, customerInfo.lastName, customerInfo.email, customers, selectedCustomerId]);

  // Fonction pour créer automatiquement le client lors de l'acceptation du devis
  const createCustomerFromQuote = async (quoteData: any) => {
    if (!profile?.shop_id) {
      toast({
        title: "Erreur",
        description: "Impossible de déterminer la boutique",
        variant: "destructive",
      });
      return null;
    }

    // Vérifier si le client existe déjà
    const existingCustomer = customers.find(customer => 
      customer.first_name.toLowerCase().trim() === customerInfo.firstName.toLowerCase().trim() &&
      customer.last_name.toLowerCase().trim() === customerInfo.lastName.toLowerCase().trim()
    );

    if (existingCustomer) {
      // Le client existe déjà, ne pas le recréer
      return existingCustomer;
    }

    // Créer le nouveau client
    const customerData = {
      first_name: customerInfo.firstName.trim(),
      last_name: customerInfo.lastName.trim(),
      email: customerInfo.email.trim() || undefined,
      phone: customerInfo.phone.trim() || undefined,
      address: customerInfo.address.trim() || undefined,
      shop_id: profile.shop_id
    };

    const { data: newCustomer, error } = await createCustomer(customerData);
    
    if (error) {
      console.error('Erreur lors de la création du client:', error);
      return null;
    }

    return newCustomer;
  };

  // Fonction pour gérer le changement du téléphone avec formatage automatique
  const handlePhoneChange = (value: string) => {
    const formattedPhone = formatPhoneInput(value);
    setCustomerInfo({ ...customerInfo, phone: formattedPhone });
  };
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
    items.map(item => {
      if (item.part_id === partId) {
        const newTotalPrice = quantity * item.unit_public_price;
        const discountAmount = item.discount?.amount || 0;
        return { 
          ...item, 
          quantity, 
          total_price: Math.max(0, newTotalPrice - discountAmount)
        };
      }
      return item;
    })
  );
};

const updateUnitPublicPrice = (partId: string, unitPrice: number) => {
  setSelectedItems(items =>
    items.map(item => {
      if (item.part_id === partId) {
        const newTotalPrice = item.quantity * unitPrice;
        const discountAmount = item.discount?.amount || 0;
        return { 
          ...item, 
          unit_public_price: unitPrice, 
          total_price: Math.max(0, newTotalPrice - discountAmount)
        };
      }
      return item;
    })
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

  const updateItemDiscount = (partId: string, discount: PartDiscountInfo | null) => {
    setSelectedItems(items =>
      items.map(item => {
        if (item.part_id === partId) {
          const lineTotal = item.quantity * item.unit_public_price;
          const discountAmount = discount?.amount || 0;
          return { 
            ...item, 
            discount,
            total_price: Math.max(0, lineTotal - discountAmount)
          };
        }
        return item;
      })
    );
  };

  const subtotal = selectedItems.reduce((sum, item) => {
    const lineTotal = item.quantity * item.unit_public_price;
    const discountAmount = item.discount?.amount || 0;
    return sum + Math.max(0, lineTotal - discountAmount);
  }, 0);
  const totalAmount = subtotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerInfo.firstName.trim() || !customerInfo.lastName.trim()) {
      toast({
        title: "Informations manquantes",
        description: "Le nom et prénom du client sont requis",
        variant: "destructive",
      });
      return;
    }

    if (selectedItems.length === 0) {
      toast({
        title: "Devis incomplet",
        description: "Veuillez ajouter au moins une pièce au devis",
        variant: "destructive",
      });
      return;
    }

    // Validation du numéro de téléphone si fourni
    if (customerInfo.phone.trim()) {
      const phoneValidationResult = validateFrenchPhoneNumber(customerInfo.phone);
      if (!phoneValidationResult.isValid) {
        toast({
          title: "Numéro de téléphone invalide",
          description: phoneValidationResult.message,
          variant: "destructive",
        });
        return;
      }
    }

    // Avertissement si un doublon est détecté mais permettre la soumission
    if (duplicateWarning) {
      const userConfirmed = confirm(`⚠️ ${duplicateWarning}\n\nVoulez-vous continuer malgré tout ?`);
      if (!userConfirmed) {
        return;
      }
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
      deposit_amount: depositAmount,
      status: initialQuote?.status ?? 'draft'
    });

    if (!error) {
      // Si le devis est accepté, le client sera automatiquement créé par le trigger de la DB
      toast({
        title: "Succès",
        description: initialQuote ? "Devis mis à jour avec succès" : "Devis créé avec succès",
      });
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
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="Ex: 06.12.34.56.78 ou +33 6 12 34 56 78"
                  className={!phoneValidation.isValid ? 'border-destructive' : ''}
                />
                {phoneValidation.message && (
                  <div className={`flex items-center gap-1 mt-1 text-sm ${phoneValidation.isValid ? 'text-green-600' : 'text-destructive'}`}>
                    {phoneValidation.isValid ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {phoneValidation.message}
                  </div>
                )}
              </div>
            </div>
            
            {/* Alerte de doublons */}
            {duplicateWarning && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {duplicateWarning}
                </AlertDescription>
              </Alert>
            )}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="notes">Notes (optionnel)</Label>
                <AITextReformulator
                  text={notes}
                  context="repair_notes"
                  onReformulated={(reformulatedText) => setNotes(reformulatedText)}
                />
              </div>
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
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="problemDescription">Description du problème *</Label>
                <AITextReformulator
                  text={deviceInfo.problemDescription}
                  context="problem_description"
                  onReformulated={(reformulatedText) => setDeviceInfo({ ...deviceInfo, problemDescription: reformulatedText })}
                />
              </div>
              <Textarea
                id="problemDescription"
                value={deviceInfo.problemDescription}
                onChange={(e) => setDeviceInfo({ ...deviceInfo, problemDescription: e.target.value })}
                placeholder="Décrivez le problème rencontré..."
                required
              />
            </div>
            
            <FileUpload
              files={deviceInfo.attachments}
              onFilesChange={(files) => setDeviceInfo({ ...deviceInfo, attachments: files })}
              partId="quote-device-info"
              label="Photos de l'appareil ou documents"
            />
          </CardContent>
        </Card>

        {/* Recherche de pièces */}
        <Card>
          <CardHeader>
            <CardTitle>Ajouter des pièces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4 border-2 border-blue-200 rounded-lg shadow-sm bg-blue-50/30 dark:bg-blue-950/30 dark:border-blue-800 transition-all duration-200 focus-within:border-blue-400 focus-within:shadow-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 h-4 w-4" />
              <Input
                placeholder="Rechercher une pièce par nom ou référence..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
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
                    <div className="flex items-center gap-3">
                      {part.photo_url && (
                        <img 
                          src={`${supabase.storage.from('part-photos').getPublicUrl(part.photo_url).data.publicUrl}`}
                          alt={part.name}
                          className="w-12 h-12 object-cover rounded border"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <div>
                        <p className="font-medium">{part.name}</p>
                        {part.reference && (
                          <p className="text-sm text-muted-foreground">Réf: {part.reference}</p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Prix: {(part.selling_price || 0).toFixed(2)}€
                        </p>
                      </div>
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
                          <div className="flex items-center gap-3">
                             {!isCustomItem && (() => {
                               const stockPart = parts.find(p => p.id === item.part_id);
                               return stockPart?.photo_url && (
                                 <img 
                                   src={`${supabase.storage.from('part-photos').getPublicUrl(stockPart.photo_url).data.publicUrl}`} 
                                   alt={item.part_name}
                                   className="w-8 h-8 object-cover rounded"
                                   onError={(e) => {
                                     (e.target as HTMLImageElement).style.display = 'none';
                                   }}
                                 />
                               );
                             })()}
                            <div>
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
                          </div>
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

                      {/* Gestionnaire de remise pour cette pièce */}
                      <PartDiscountManager
                        partName={item.part_name}
                        unitPrice={item.unit_public_price}
                        quantity={item.quantity}
                        discount={item.discount || null}
                        onDiscountChange={(discount) => updateItemDiscount(item.part_id, discount)}
                      />
                    </div>
                  );
                })}
                
                <div className="border-t pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Sous-total brut:</span>
                      <span>{selectedItems.reduce((sum, item) => sum + (item.quantity * item.unit_public_price), 0).toFixed(2)}€</span>
                    </div>
                    
                    {selectedItems.some(item => item.discount) && (
                      <div className="flex justify-between text-primary">
                        <span>Total remises:</span>
                        <span>-{selectedItems.reduce((sum, item) => sum + (item.discount?.amount || 0), 0).toFixed(2)}€</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                      <span>Total:</span>
                      <span>{totalAmount.toFixed(2)}€</span>
                    </div>
                    
                    {/* Acompte client */}
                    <div className="border-t pt-3 mt-3">
                      <div className="space-y-2">
                        <Label htmlFor="depositAmount" className="text-sm font-medium">
                          Acompte réglé par le client
                        </Label>
                        <Input
                          id="depositAmount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="text-right"
                        />
                        {depositAmount > 0 && (
                          <div className="flex justify-between text-sm text-muted-foreground pt-1 font-medium">
                            <span>Reste à payer:</span>
                            <span className="text-foreground">
                              {Math.max(0, totalAmount - depositAmount).toFixed(2)}€
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
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