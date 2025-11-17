import { useState, useEffect } from 'react';
import React from 'react';
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
import { useSubscription } from '@/hooks/useSubscription';
import { Badge } from '@/components/ui/badge';
import { CustomerSearch } from '@/components/customers/CustomerSearch';
import { FileUpload } from '@/components/parts/FileUpload';
import { LimitAlert } from '@/components/subscription/LimitAlert';
import { useLimitDialogContext } from '@/contexts/LimitDialogContext';
import { useToast } from '@/hooks/use-toast';
import { PrintConfirmDialog } from '@/components/dialogs/PrintConfirmDialog';
import { SAVPrintButton, type SAVPrintButtonRef } from '@/components/sav/SAVPrint';
import { PatternLock } from '@/components/sav/PatternLock';
import { Checkbox } from '@/components/ui/checkbox';
import { PartDiscountManager, PartDiscountInfo } from '@/components/ui/part-discount-manager';
import { supabase } from '@/integrations/supabase/client';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AITextReformulator } from '@/components/sav/AITextReformulator';
import { SecurityCodesSection, SecurityCodes } from './SecurityCodesSection';

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
  sku: string;
  problemDescription: string;
  attachments: string[];
}

interface AccessoriesInfo {
  charger: boolean;
  case: boolean;
  screen_protector: boolean;
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
  attachments?: string[]; // Ajout du champ attachments
  discount?: PartDiscountInfo | null; // Remise appliquée à cette pièce
}

interface SAVFormProps {
  onSuccess?: () => void;
}

export function SAVForm({ onSuccess }: SAVFormProps) {
  // Utiliser le premier type et statut disponible comme défaut
  const { getAllStatuses, getStatusInfo } = useShopSAVStatuses();
  const { getAllTypes, getTypeInfo } = useShopSAVTypes();
  const defaultType = getAllTypes()[0]?.value || 'internal';
  const defaultStatus = getAllStatuses()[0]?.value || 'pending';
  
  const [savType, setSavType] = useState<string>(defaultType);
  
  // Obtenir les paramètres du type SAV sélectionné
  const currentTypeInfo = getTypeInfo(savType);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedStatus, setSelectedStatus] = useState(defaultStatus);
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
    sku: '',
    problemDescription: '',
    attachments: [],
  });
  const [accessories, setAccessories] = useState<AccessoriesInfo>({
    charger: false,
    case: false,
    screen_protector: false,
  });
  const [unlockPattern, setUnlockPattern] = useState<number[]>([]);
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [createdSAVCase, setCreatedSAVCase] = useState<any>(null);
  const [securityCodes, setSecurityCodes] = useState<SecurityCodes>({
    unlock_code: '',
    icloud_id: '',
    icloud_password: '',
    sim_pin: '',
  });
  const [savLimits, setSavLimits] = useState<{ allowed: boolean; reason: string; action: string | null }>({ allowed: true, reason: '', action: null });
  const printButtonRef = React.useRef<SAVPrintButtonRef>(null);
  
  const { user } = useAuth();
  const { profile } = useProfile();
  const { createCase } = useSAVCases();
  const { createCustomer } = useCustomers();
  const { parts } = useParts();
  const { checkLimits } = useSubscription();
  const { checkAndShowLimitDialog } = useLimitDialogContext();
  const { toast } = useToast();
  // Les hooks sont déjà importés plus haut


  // Charger les limites SAV au montage et quand l'utilisateur change
  useEffect(() => {
    if (user) {
      const limits = checkLimits('sav');
      setSavLimits(limits);
    }
  }, [user, checkLimits]);

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

  const updatePart = (id: string, field: keyof SelectedPart, value: string | number | PartDiscountInfo | null) => {
    setSelectedParts(
      selectedParts.map((part) =>
        part.id === id ? { ...part, [field]: value } : part
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Validation des coordonnées client basée sur les paramètres du type SAV
    if (currentTypeInfo.show_customer_info) {
      if (!selectedCustomer && (!customerInfo.firstName.trim() || !customerInfo.lastName.trim())) {
        toast({
          title: "Informations manquantes",
          description: "Le prénom et le nom du client sont obligatoires pour ce type de SAV.",
          variant: "destructive",
        });
        return;
      }
      
      if (!selectedCustomer && !customerInfo.phone.trim() && !customerInfo.email.trim()) {
        toast({
          title: "Contact manquant",
          description: "Au moins un moyen de contact (téléphone ou email) est requis.",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Vérifier les limites SAV avant création avec popup
    if (!checkAndShowLimitDialog('sav')) {
      return; // Les limites sont atteintes, la popup s'affiche
    }
    
    setLoading(true);
    
    try {
      let customerId = selectedCustomer?.id || null;
      
      // Create customer if type requires customer info and no customer selected
      if (currentTypeInfo.show_customer_info && !selectedCustomer) {
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
      
      // Calculate totals with individual part discounts
      const totalTimeMinutes = 0; // Suppression du calcul du temps
      // Pour les SAV internes, ne pas compter les prix TTC dans le chiffre d'affaires
      const totalCost = savType === 'internal' ? 0 : selectedParts.reduce((acc, part) => {
        const lineTotal = part.unitPrice * part.quantity;
        const discountAmount = part.discount?.amount || 0;
        return acc + Math.max(0, lineTotal - discountAmount);
      }, 0);
      
      // Create SAV case
      const { data: newCase, error: caseError } = await createCase({
        sav_type: savType,
        customer_id: customerId,
        device_brand: deviceInfo.brand ? deviceInfo.brand.toUpperCase().trim() : null,
        device_model: deviceInfo.model ? deviceInfo.model.toUpperCase().trim() : null,
        device_imei: deviceInfo.imei || null,
        sku: deviceInfo.sku || null,
        problem_description: deviceInfo.problemDescription,
        total_time_minutes: totalTimeMinutes,
        total_cost: totalCost,
        deposit_amount: depositAmount,
        status: selectedStatus as any,
        shop_id: profile?.shop_id,
        attachments: deviceInfo.attachments || [], // Ajouter les attachments ici
        accessories,
        unlock_pattern: unlockPattern.length > 0 ? unlockPattern : null,
        security_codes: (securityCodes.unlock_code || securityCodes.icloud_id || securityCodes.icloud_password || securityCodes.sim_pin) ? {
          unlock_code: securityCodes.unlock_code || null,
          icloud_id: securityCodes.icloud_id || null,
          icloud_password: securityCodes.icloud_password || null,
          sim_pin: securityCodes.sim_pin || null,
        } : null,
      });
      
      if (caseError) throw caseError;

      // Enrichir les données du SAV avec les informations du client pour le SMS
      const enrichedCase = {
        ...newCase,
        customer: customerId ? {
          first_name: selectedCustomer?.first_name || customerInfo.firstName,
          last_name: selectedCustomer?.last_name || customerInfo.lastName,
          phone: selectedCustomer?.phone || customerInfo.phone,
          email: selectedCustomer?.email || customerInfo.email,
        } : null
      };
      
        // Sauvegarder les pièces sélectionnées avec leurs remises
        if (selectedParts.length > 0) {
          // Identifier les pièces avec stock insuffisant
          const partsWithInsufficientStock = selectedParts
            .filter(part => !part.isCustom && part.part_id)
            .map(part => {
              const stockPart = parts.find(p => p.id === part.part_id);
              const availableStock = stockPart ? Math.max(0, (stockPart.quantity || 0) - (stockPart.reserved_quantity || 0)) : 0;
              return {
                ...part,
                availableStock,
                missingQuantity: Math.max(0, part.quantity - availableStock)
              };
            })
            .filter(part => part.missingQuantity > 0);

          const partsToInsert = selectedParts.map(part => ({
            sav_case_id: newCase.id,
            part_id: part.isCustom ? null : part.part_id,
            quantity: part.quantity,
            unit_price: part.unitPrice,
            time_minutes: 0,
            purchase_price: part.isCustom ? 0 : (parts.find(p => p.id === part.part_id)?.purchase_price || 0),
            discount_info: part.discount ? JSON.stringify(part.discount) : null,
          }));

        const { error: partsError } = await supabase
          .from('sav_parts')
          .insert(partsToInsert);

        if (partsError) {
          console.error('Error saving parts:', partsError);
          // Ne pas faire échouer toute la création pour des erreurs de pièces
          toast({
            title: "Attention",
            description: "Le SAV a été créé mais certaines pièces n'ont pas été sauvegardées",
            variant: "destructive",
          });
        } else {
          // Créer automatiquement des commandes pour les pièces avec stock insuffisant
          if (partsWithInsufficientStock.length > 0) {
            const ordersToInsert = partsWithInsufficientStock.map(part => ({
              shop_id: profile?.shop_id,
              sav_case_id: newCase.id,
              part_id: part.part_id,
              part_name: part.name,
              part_reference: part.reference,
              quantity_needed: part.missingQuantity,
              reason: 'sav_stock_insufficient',
              priority: 'high'
            }));

            const { error: ordersError } = await supabase
              .from('order_items')
              .insert(ordersToInsert);

            if (ordersError) {
              console.error('Error creating orders:', ordersError);
            }

            // Changer le statut du SAV à "parts_ordered"
            await supabase
              .from('sav_cases')
              .update({ status: 'parts_ordered' })
              .eq('id', newCase.id);

            toast({
              title: "Pièces à commander détectées",
              description: `${partsWithInsufficientStock.length} pièce(s) ajoutée(s) aux commandes. Statut changé en "Pièces commandées".`,
            });
          }
        }
      }
      
      // Stocker le SAV créé et afficher le popup d'impression
      setCreatedSAVCase(enrichedCase);
      setShowPrintDialog(true);
      
      // Reset form
      setSavType(defaultType);
      setSelectedStatus(defaultStatus);
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
        sku: '',
        problemDescription: '',
        attachments: [],
      });
      setAccessories({
        charger: false,
        case: false,
        screen_protector: false,
      });
      setUnlockPattern([]);
      setSelectedParts([]);
      setDepositAmount(0);
    } catch (error: any) {
      console.error('Error creating SAV case:', error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la création du SAV",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintConfirm = () => {
    // Lancer l'impression via la méthode exposée
    if (printButtonRef.current) {
      printButtonRef.current.print();
    }
    onSuccess?.();
  };

  const handlePrintCancel = () => {
    // Redirection sans impression
    onSuccess?.();
  };


  return (
    <div className="space-y-6">
      {/* Alerte de limite SAV */}
      {!savLimits.allowed && savLimits.action && (
        <LimitAlert 
          action={savLimits.action as 'upgrade_plan' | 'buy_sms_package'}
          reason={savLimits.reason}
        />
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="bg-blue-50/30 border-blue-200">
        <CardHeader>
          <CardTitle>Type de SAV</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Type de SAV</Label>
              <Select value={savType} onValueChange={setSavType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAllTypes().map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: type.color }}
                        />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status" className="text-sm font-medium">Statut initial</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAllStatuses().map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: status.color }}
                        />
                        {status.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {currentTypeInfo.show_customer_info && (
        <Card className="bg-blue-50/30 border-blue-200">
          <CardHeader>
            <CardTitle>
              Informations Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CustomerSearch
              customerInfo={customerInfo}
              setCustomerInfo={setCustomerInfo}
              onCustomerSelected={setSelectedCustomer}
            />
            
            {/* Champs supplémentaires visibles seulement si pas de client sélectionné */}
            {!selectedCustomer && (
              <>
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
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-blue-50/30 border-blue-200">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={deviceInfo.sku}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 13);
                  setDeviceInfo({ ...deviceInfo, sku: value });
                }}
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
                onReformulated={(reformulatedText) =>
                  setDeviceInfo({ ...deviceInfo, problemDescription: reformulatedText })
                }
              />
            </div>
            <Textarea
              id="problemDescription"
              value={deviceInfo.problemDescription}
              onChange={(e) =>
                setDeviceInfo({ ...deviceInfo, problemDescription: e.target.value })
              }
              placeholder="Décrivez le problème rencontré..."
              required
              rows={4}
            />
          </div>
          
          <FileUpload
            files={deviceInfo.attachments}
            onFilesChange={(files) => setDeviceInfo({ ...deviceInfo, attachments: files })}
            partId="device-info"
            label="Photos de l'appareil ou documents"
          />
        </CardContent>
      </Card>

      {/* Accessoires présents */}
      <Card className="bg-blue-50/30 border-blue-200">
        <CardHeader>
          <CardTitle>Accessoires présents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="charger"
                checked={accessories.charger}
                onCheckedChange={(checked) => 
                  setAccessories({ ...accessories, charger: !!checked })
                }
              />
              <Label htmlFor="charger" className="text-sm font-normal">
                Chargeur
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="case"
                checked={accessories.case}
                onCheckedChange={(checked) => 
                  setAccessories({ ...accessories, case: !!checked })
                }
              />
              <Label htmlFor="case" className="text-sm font-normal">
                Coque
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="screen_protector"
                checked={accessories.screen_protector}
                onCheckedChange={(checked) => 
                  setAccessories({ ...accessories, screen_protector: !!checked })
                }
              />
              <Label htmlFor="screen_protector" className="text-sm font-normal">
                Protection d'écran
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Codes de sécurité */}
      <SecurityCodesSection 
        codes={securityCodes}
        onChange={setSecurityCodes}
      />

      {/* Schéma de verrouillage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PatternLock
          pattern={unlockPattern}
          onChange={setUnlockPattern}
        />
        <Card className="lg:col-span-1 bg-blue-50/30 border-blue-200">
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Dessinez le schéma de verrouillage en reliant les points</li>
              <li>• Maintenez le bouton de la souris enfoncé et déplacez sur les points</li>
              <li>• Le schéma sera visible dans les détails du SAV</li>
              <li>• Vous pouvez effacer et recommencer à tout moment</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-blue-50/30 border-blue-200">
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
            <div className="relative border-2 border-blue-200 rounded-lg shadow-sm bg-blue-50/30 dark:bg-blue-950/30 dark:border-blue-800 transition-all duration-200 focus-within:border-blue-400 focus-within:shadow-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 h-4 w-4" />
              <Input
                id="part-search"
                placeholder="Nom ou référence de la pièce..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
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
                      <div className="flex-1 flex items-center gap-3">
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
                          <div className="font-medium">{part.name}</div>
                          {part.reference && (
                            <div className="text-sm text-muted-foreground">Réf: {part.reference}</div>
                          )}
                        </div>
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
                        <div className="flex-1 flex items-center gap-3">
                           {!part.isCustom && part.part_id && (() => {
                             const stockPart = parts.find(p => p.id === part.part_id);
                             return stockPart?.photo_url && (
                               <img 
                                 src={`${supabase.storage.from('part-photos').getPublicUrl(stockPart.photo_url).data.publicUrl}`} 
                                 alt={part.name}
                                 className="w-8 h-8 object-cover rounded"
                                 onError={(e) => {
                                   (e.target as HTMLImageElement).style.display = 'none';
                                 }}
                               />
                             );
                           })()}
                          <div>
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
                        
                        {/* Gestionnaire de remise pour cette pièce */}
                        <PartDiscountManager
                          partName={part.name}
                          unitPrice={part.unitPrice}
                          quantity={part.quantity}
                          discount={part.discount || null}
                          onDiscountChange={(discount) => updatePart(part.id, 'discount', discount)}
                          disabled={savType === 'internal'}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Résumé final */}
          {selectedParts.length > 0 && (
            <>
              <Separator />

              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="grid grid-cols-1 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Total pièces: </span>
                    <span>{selectedParts.reduce((acc, part) => acc + part.quantity, 0)}</span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="font-medium">Sous-total: </span>
                      <span>{selectedParts.reduce((acc, part) => acc + (part.quantity * part.unitPrice), 0).toFixed(2)}€</span>
                    </div>
                    
                    {selectedParts.some(part => part.discount) && (
                      <div className="flex justify-between text-primary">
                        <span className="font-medium">Total remises: </span>
                        <span>-{selectedParts.reduce((acc, part) => acc + (part.discount?.amount || 0), 0).toFixed(2)}€</span>
                      </div>
                    )}
                    
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total: </span>
                        <span>
                          {selectedParts.reduce((acc, part) => {
                            const lineTotal = part.quantity * part.unitPrice;
                            const discountAmount = part.discount?.amount || 0;
                            return acc + Math.max(0, lineTotal - discountAmount);
                          }, 0).toFixed(2)}€
                        </span>
                      </div>
                    </div>
                    
                    {/* Acompte client */}
                    <div className="border-t pt-2 mt-2">
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
                          <div className="flex justify-between text-sm text-muted-foreground pt-1">
                            <span>Reste à payer:</span>
                            <span className="font-medium">
                              {Math.max(0, selectedParts.reduce((acc, part) => {
                                const lineTotal = part.quantity * part.unitPrice;
                                const discountAmount = part.discount?.amount || 0;
                                return acc + Math.max(0, lineTotal - discountAmount);
                              }, 0) - depositAmount).toFixed(2)}€
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
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
          <Button type="submit" disabled={loading || !savLimits.allowed}>
            {loading ? 'Création...' : 'Créer le dossier SAV'}
          </Button>
        </div>
      </form>

      {/* Bouton d'impression masqué pour référence */}
      {createdSAVCase && (
        <div style={{ display: 'none' }}>
          <SAVPrintButton 
            savCase={createdSAVCase}
            ref={printButtonRef}
          />
        </div>
      )}

      {/* Dialog de confirmation d'impression */}
      <PrintConfirmDialog 
        isOpen={showPrintDialog}
        onClose={() => setShowPrintDialog(false)}
        onConfirm={handlePrintConfirm}
        onCancel={handlePrintCancel}
        savCaseNumber={createdSAVCase?.case_number || ''}
        savCase={createdSAVCase}
        requireUnlockPattern={currentTypeInfo.require_unlock_pattern}
        hasUnlockPattern={unlockPattern.length > 0}
      />
    </div>
  );
}