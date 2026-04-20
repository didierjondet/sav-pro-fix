import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { multiWordSearch } from '@/utils/searchUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, ArrowRight, Check, Plus, Trash2, Search, 
  Smartphone, User, Wrench, Shield, Package, ClipboardList, Settings2, Clock
} from 'lucide-react';
import { useSAVCases } from '@/hooks/useSAVCases';
import { useCustomers } from '@/hooks/useCustomers';
import { useParts } from '@/hooks/useParts';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useSubscription } from '@/hooks/useSubscription';
import { CustomerSearch } from '@/components/customers/CustomerSearch';
import { FileUpload } from '@/components/parts/FileUpload';
import { useLimitDialogContext } from '@/contexts/LimitDialogContext';
import { useToast } from '@/hooks/use-toast';
import { PrintConfirmDialog } from '@/components/dialogs/PrintConfirmDialog';
import { SAVPrintButton, type SAVPrintButtonRef } from '@/components/sav/SAVPrint';
import { PatternLock } from '@/components/sav/PatternLock';
import { PartDiscountManager, PartDiscountInfo } from '@/components/ui/part-discount-manager';
import { supabase } from '@/integrations/supabase/client';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';
import { SecurityCodesSection, SecurityCodes } from './SecurityCodesSection';

interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
}

interface SelectedPart {
  id: string;
  part_id?: string;
  name: string;
  reference?: string;
  quantity: number;
  unitPrice: number;
  availableStock?: number;
  isCustom: boolean;
  attachments?: string[];
  discount?: PartDiscountInfo | null;
}

interface SAVWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const STEPS = [
  { key: 'type', label: 'Type', icon: Settings2 },
  { key: 'client', label: 'Client', icon: User },
  { key: 'device', label: 'Appareil', icon: Smartphone },
  { key: 'problem', label: 'Problème', icon: Wrench },
  { key: 'accessories', label: 'Accessoires & Codes', icon: Shield },
  { key: 'parts', label: 'Pièces', icon: Package },
  { key: 'summary', label: 'Récapitulatif', icon: ClipboardList },
];

const COLOR_OPTIONS = [
  { value: 'black', label: 'Noir', color: 'hsl(0 0% 0%)' },
  { value: 'white', label: 'Blanc', color: 'hsl(0 0% 100%)', border: true },
  { value: 'grey', label: 'Gris', color: 'hsl(0 0% 50%)' },
  { value: 'blue', label: 'Bleu', color: 'hsl(217 91% 60%)' },
  { value: 'red', label: 'Rouge', color: 'hsl(0 84% 60%)' },
  { value: 'gold', label: 'Or', color: 'hsl(45 100% 51%)' },
  { value: 'silver', label: 'Argent', color: 'hsl(0 0% 75%)' },
  { value: 'green', label: 'Vert', color: 'hsl(142 71% 45%)' },
  { value: 'pink', label: 'Rose', color: 'hsl(330 81% 60%)' },
  { value: 'purple', label: 'Violet', color: 'hsl(271 91% 65%)' },
  { value: 'other', label: 'Autre', color: 'hsl(0 0% 42%)' },
];

const GRADE_OPTIONS = [
  { value: 'A', label: 'Grade A', description: 'Excellent état', color: 'bg-emerald-500' },
  { value: 'B', label: 'Grade B', description: 'Bon état', color: 'bg-blue-500' },
  { value: 'C', label: 'Grade C', description: 'État moyen', color: 'bg-orange-500' },
  { value: 'D', label: 'Grade D', description: 'Mauvais état', color: 'bg-red-500' },
];

export function SAVWizardDialog({ open, onOpenChange, onSuccess }: SAVWizardDialogProps) {
  const { getAllStatuses } = useShopSAVStatuses();
  const { getAllTypes, getTypeInfo } = useShopSAVTypes();
  const defaultType = getAllTypes()[0]?.value || 'internal';
  const defaultStatus = getAllStatuses()[0]?.value || 'pending';

  const [currentStep, setCurrentStep] = useState(0);
  const [savType, setSavType] = useState(defaultType);
  const [selectedStatus, setSelectedStatus] = useState(defaultStatus);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    firstName: '', lastName: '', email: '', phone: '', address: '',
  });
  const [deviceInfo, setDeviceInfo] = useState({
    brand: '', model: '', imei: '', sku: '', color: '', grade: '',
    problemDescription: '', attachments: [] as string[],
  });
  const [accessories, setAccessories] = useState({
    charger: false, case: false, screen_protector: false,
  });
  const [unlockPattern, setUnlockPattern] = useState<number[]>([]);
  const [securityCodes, setSecurityCodes] = useState<SecurityCodes>({
    unlock_code: '', icloud_id: '', icloud_password: '', sim_pin: '',
  });
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
  const [depositAmount, setDepositAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentlyAddedParts, setRecentlyAddedParts] = useState<string[]>([]);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [createdSAVCase, setCreatedSAVCase] = useState<any>(null);

  const printButtonRef = useRef<SAVPrintButtonRef>(null);
  const { user } = useAuth();
  const { profile } = useProfile();
  const { createCase } = useSAVCases();
  const { createCustomer } = useCustomers();
  const { parts } = useParts();
  const { checkLimits } = useSubscription();
  const { checkAndShowLimitDialog } = useLimitDialogContext();
  const { toast } = useToast();

  const currentTypeInfo = getTypeInfo(savType);

  // Build actual steps based on type config
  const activeSteps = STEPS.filter(s => {
    if (s.key === 'client') return currentTypeInfo.show_customer_info;
    return true;
  });

  const totalSteps = activeSteps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const currentStepKey = activeSteps[currentStep]?.key;
  const StepIcon = activeSteps[currentStep]?.icon || Settings2;

  const filteredParts = parts.filter(part =>
    multiWordSearch(searchTerm, part.name, part.reference)
  );

  const addPartFromStock = (part: any) => {
    const existing = selectedParts.find(p => p.part_id === part.id);
    if (existing && !existing.isCustom) {
      setSelectedParts(selectedParts.map(p =>
        p.part_id === part.id ? { ...p, quantity: p.quantity + 1 } : p
      ));
    } else {
      setSelectedParts([...selectedParts, {
        id: Date.now().toString(), part_id: part.id, name: part.name,
        reference: part.reference, quantity: 1, unitPrice: part.selling_price || 0,
        availableStock: part.quantity, isCustom: false,
      }]);
    }
    setRecentlyAddedParts(prev => [...prev, part.id]);
    setTimeout(() => setRecentlyAddedParts(prev => prev.filter(id => id !== part.id)), 1000);
  };

  const addCustomPart = () => {
    setSelectedParts([...selectedParts, {
      id: Date.now().toString(), name: '', quantity: 1, unitPrice: 0, isCustom: true,
    }]);
  };

  const removePart = (id: string) => setSelectedParts(selectedParts.filter(p => p.id !== id));

  const updatePart = (id: string, field: keyof SelectedPart, value: any) => {
    setSelectedParts(selectedParts.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const totalCost = selectedParts.reduce((acc, part) => {
    const lineTotal = part.unitPrice * part.quantity;
    const discountAmount = part.discount?.amount || 0;
    return acc + Math.max(0, lineTotal - discountAmount);
  }, 0);

  const handleSubmit = async () => {
    if (!user) return;
    if (!checkAndShowLimitDialog('sav')) return;

    if (currentTypeInfo.show_customer_info) {
      if (!selectedCustomer && (!customerInfo.firstName.trim() || !customerInfo.lastName.trim())) {
        toast({ title: "Informations manquantes", description: "Le prénom et le nom du client sont obligatoires.", variant: "destructive" });
        return;
      }
      if (!selectedCustomer && !customerInfo.phone.trim() && !customerInfo.email.trim()) {
        toast({ title: "Contact manquant", description: "Au moins un moyen de contact est requis.", variant: "destructive" });
        return;
      }
    }

    setLoading(true);
    try {
      let customerId = selectedCustomer?.id || null;
      if (currentTypeInfo.show_customer_info && !selectedCustomer) {
        const { data: customer, error: customerError } = await createCustomer({
          first_name: customerInfo.firstName, last_name: customerInfo.lastName,
          email: customerInfo.email, phone: customerInfo.phone,
          address: customerInfo.address, shop_id: profile?.shop_id,
        });
        if (customerError) throw customerError;
        customerId = customer.id;
      }

      const finalCost = savType === 'internal' ? 0 : totalCost;

      const { data: newCase, error: caseError } = await createCase({
        sav_type: savType, customer_id: customerId,
        device_brand: deviceInfo.brand ? deviceInfo.brand.toUpperCase().trim() : null,
        device_model: deviceInfo.model ? deviceInfo.model.toUpperCase().trim() : null,
        device_imei: deviceInfo.imei || null, device_color: deviceInfo.color || null,
        device_grade: deviceInfo.grade || null, sku: deviceInfo.sku || null,
        problem_description: deviceInfo.problemDescription,
        total_time_minutes: 0, total_cost: finalCost, deposit_amount: depositAmount,
        status: selectedStatus as any, shop_id: profile?.shop_id,
        attachments: deviceInfo.attachments || [], accessories,
        unlock_pattern: unlockPattern.length > 0 ? unlockPattern : null,
        security_codes: (securityCodes.unlock_code || securityCodes.icloud_id || securityCodes.icloud_password || securityCodes.sim_pin)
          ? { unlock_code: securityCodes.unlock_code || null, icloud_id: securityCodes.icloud_id || null, icloud_password: securityCodes.icloud_password || null, sim_pin: securityCodes.sim_pin || null }
          : null,
      });

      if (caseError) throw caseError;

      const enrichedCase = {
        ...newCase,
        customer: customerId ? {
          first_name: selectedCustomer?.first_name || customerInfo.firstName,
          last_name: selectedCustomer?.last_name || customerInfo.lastName,
          phone: selectedCustomer?.phone || customerInfo.phone,
          email: selectedCustomer?.email || customerInfo.email,
        } : null,
      };

      if (selectedParts.length > 0) {
        const partsWithInsufficientStock = selectedParts
          .filter(part => !part.isCustom && part.part_id)
          .map(part => {
            const stockPart = parts.find(p => p.id === part.part_id);
            const availableStock = stockPart ? Math.max(0, (stockPart.quantity || 0) - (stockPart.reserved_quantity || 0)) : 0;
            return { ...part, availableStock, missingQuantity: Math.max(0, part.quantity - availableStock) };
          })
          .filter(part => part.missingQuantity > 0);

        const partsToInsert = selectedParts.map(part => ({
          sav_case_id: newCase.id, part_id: part.isCustom ? null : part.part_id,
          custom_part_name: part.isCustom ? part.name : null, quantity: part.quantity,
          unit_price: part.unitPrice, time_minutes: 0,
          purchase_price: part.isCustom ? 0 : (parts.find(p => p.id === part.part_id)?.purchase_price || 0),
          discount_info: part.discount ? JSON.stringify(part.discount) : null,
        }));

        const { error: partsError } = await supabase.from('sav_parts').insert(partsToInsert);
        if (partsError) {
          console.error('Error saving parts:', partsError);
        } else if (partsWithInsufficientStock.length > 0) {
          const ordersToInsert = partsWithInsufficientStock.map(part => ({
            shop_id: profile?.shop_id, sav_case_id: newCase.id, part_id: part.part_id,
            part_name: part.name, part_reference: part.reference,
            quantity_needed: part.missingQuantity, reason: 'sav_stock_insufficient', priority: 'high',
          }));
          await supabase.from('order_items').insert(ordersToInsert);
          await supabase.from('sav_cases').update({ status: 'parts_to_order' }).eq('id', newCase.id);
        }
      }

      setCreatedSAVCase(enrichedCase);
      setShowPrintDialog(true);
    } catch (error: any) {
      console.error('Error creating SAV case:', error);
      toast({ title: "Erreur", description: error.message || "Une erreur est survenue", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintConfirm = () => {
    if (printButtonRef.current) printButtonRef.current.print();
    resetAndClose();
  };

  const handlePrintCancel = () => resetAndClose();

  const resetAndClose = () => {
    setCurrentStep(0);
    setSavType(defaultType);
    setSelectedStatus(defaultStatus);
    setSelectedCustomer(null);
    setCustomerInfo({ firstName: '', lastName: '', email: '', phone: '', address: '' });
    setDeviceInfo({ brand: '', model: '', imei: '', sku: '', color: '', grade: '', problemDescription: '', attachments: [] });
    setAccessories({ charger: false, case: false, screen_protector: false });
    setUnlockPattern([]);
    setSecurityCodes({ unlock_code: '', icloud_id: '', icloud_password: '', sim_pin: '' });
    setSelectedParts([]);
    setDepositAmount(0);
    setShowPrintDialog(false);
    setCreatedSAVCase(null);
    onOpenChange(false);
    onSuccess?.();
  };

  const [validationError, setValidationError] = useState('');

  const canProceed = (): boolean => {
    switch (currentStepKey) {
      case 'client':
        if (!selectedCustomer) {
          if (!customerInfo.firstName.trim() || !customerInfo.lastName.trim()) return false;
          if (!customerInfo.phone.trim() && !customerInfo.email.trim()) return false;
        }
        return true;
      case 'device':
        return !!(deviceInfo.brand.trim() && deviceInfo.model.trim());
      case 'problem':
        return !!deviceInfo.problemDescription.trim();
      default:
        return true;
    }
  };

  const getValidationMessage = (): string => {
    switch (currentStepKey) {
      case 'client':
        if (!selectedCustomer) {
          if (!customerInfo.firstName.trim() || !customerInfo.lastName.trim())
            return 'Le prénom et le nom du client sont obligatoires.';
          if (!customerInfo.phone.trim() && !customerInfo.email.trim())
            return 'Au moins un moyen de contact (téléphone ou email) est requis.';
        }
        return '';
      case 'device':
        if (!deviceInfo.brand.trim()) return 'La marque de l\'appareil est obligatoire.';
        if (!deviceInfo.model.trim()) return 'Le modèle de l\'appareil est obligatoire.';
        return '';
      case 'problem':
        if (!deviceInfo.problemDescription.trim()) return 'La description du problème est obligatoire.';
        return '';
      default:
        return '';
    }
  };

  const goNext = () => {
    if (!canProceed()) {
      setValidationError(getValidationMessage());
      return;
    }
    setValidationError('');
    if (currentStep < totalSteps - 1) setCurrentStep(currentStep + 1);
  };
  const goBack = () => {
    setValidationError('');
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStepKey) {
      case 'type':
        return (
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
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Statut initial</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAllStatuses().map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                        {status.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'client':
        return (
          <div className="space-y-4">
            <CustomerSearch
              customerInfo={customerInfo}
              setCustomerInfo={setCustomerInfo}
              onCustomerSelected={setSelectedCustomer}
            />
            {!selectedCustomer && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Prénom *</Label>
                    <Input value={customerInfo.firstName} onChange={(e) => setCustomerInfo({ ...customerInfo, firstName: e.target.value })} />
                  </div>
                  <div>
                    <Label>Nom *</Label>
                    <Input value={customerInfo.lastName} onChange={(e) => setCustomerInfo({ ...customerInfo, lastName: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={customerInfo.email} onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })} />
                  </div>
                  <div>
                    <Label>Téléphone</Label>
                    <Input value={customerInfo.phone} onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })} />
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case 'device':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Marque *</Label>
                <Input value={deviceInfo.brand} onChange={(e) => setDeviceInfo({ ...deviceInfo, brand: e.target.value })} />
              </div>
              <div>
                <Label>Modèle *</Label>
                <Input value={deviceInfo.model} onChange={(e) => setDeviceInfo({ ...deviceInfo, model: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>IMEI</Label>
                <Input value={deviceInfo.imei} onChange={(e) => setDeviceInfo({ ...deviceInfo, imei: e.target.value })} />
              </div>
              <div>
                <Label>SKU</Label>
                <Input value={deviceInfo.sku} onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 13);
                  setDeviceInfo({ ...deviceInfo, sku: value });
                }} maxLength={13} placeholder="Numérique (13 max)" />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Couleur</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button key={c.value} type="button" onClick={() => setDeviceInfo({ ...deviceInfo, color: c.value })}
                    className={`flex flex-col items-center gap-1 transition-all ${deviceInfo.color === c.value ? 'scale-110' : 'hover:scale-105'}`}>
                    <div className={`w-8 h-8 rounded-lg shadow-sm ${deviceInfo.color === c.value ? 'ring-3 ring-primary ring-offset-2' : ''} ${c.border ? 'border border-border' : ''}`}
                      style={{ backgroundColor: c.color }} />
                    <span className="text-[10px] text-muted-foreground">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Grade</Label>
              <div className="grid grid-cols-4 gap-2">
                {GRADE_OPTIONS.map((g) => (
                  <button key={g.value} type="button" onClick={() => setDeviceInfo({ ...deviceInfo, grade: g.value })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                      deviceInfo.grade === g.value ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/50'
                    }`}>
                    <div className={`w-8 h-8 rounded-full ${g.color} text-white flex items-center justify-center text-sm font-bold`}>{g.value}</div>
                    <p className="text-xs font-medium">{g.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'problem':
        return (
          <div className="space-y-4">
            <div>
              <Label>Description du problème *</Label>
              <Textarea value={deviceInfo.problemDescription}
                onChange={(e) => setDeviceInfo({ ...deviceInfo, problemDescription: e.target.value })}
                placeholder="Décrivez le problème rencontré..." rows={5} />
            </div>
            <FileUpload files={deviceInfo.attachments}
              onFilesChange={(files) => setDeviceInfo({ ...deviceInfo, attachments: files })}
              partId="wizard-device" label="Photos de l'appareil" />
          </div>
        );

      case 'accessories':
        return (
          <div className="space-y-6">
            <div>
              <Label className="mb-3 block font-medium">Accessoires présents</Label>
              <div className="space-y-3">
                {[
                  { key: 'charger', label: 'Chargeur' },
                  { key: 'case', label: 'Coque' },
                  { key: 'screen_protector', label: "Protection d'écran" },
                ].map((acc) => (
                  <div key={acc.key} className="flex items-center space-x-2">
                    <Checkbox id={`wiz-${acc.key}`}
                      checked={accessories[acc.key as keyof typeof accessories]}
                      onCheckedChange={(checked) => setAccessories({ ...accessories, [acc.key]: !!checked })} />
                    <Label htmlFor={`wiz-${acc.key}`} className="text-sm font-normal">{acc.label}</Label>
                  </div>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <Label className="mb-3 block font-medium">Codes de sécurité</Label>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Code de déverrouillage (max 8 car.)</Label>
                  <Input maxLength={8} value={securityCodes.unlock_code}
                    onChange={(e) => setSecurityCodes({ ...securityCodes, unlock_code: e.target.value.replace(/[^a-zA-Z0-9]/g, '') })}
                    placeholder="Ex: ABC12345" />
                </div>
                <div>
                  <Label className="text-sm">Identifiant iCloud</Label>
                  <Input type="email" value={securityCodes.icloud_id}
                    onChange={(e) => setSecurityCodes({ ...securityCodes, icloud_id: e.target.value })}
                    placeholder="email@icloud.com" />
                </div>
                <div>
                  <Label className="text-sm">Mot de passe iCloud</Label>
                  <Input type="password" value={securityCodes.icloud_password}
                    onChange={(e) => setSecurityCodes({ ...securityCodes, icloud_password: e.target.value })} />
                </div>
                <div>
                  <Label className="text-sm">Code PIN SIM (4 chiffres)</Label>
                  <Input maxLength={4} value={securityCodes.sim_pin}
                    onChange={(e) => setSecurityCodes({ ...securityCodes, sim_pin: e.target.value.replace(/\D/g, '') })}
                    placeholder="1234" />
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <Label className="mb-3 block font-medium">Schéma de verrouillage</Label>
              <PatternLock pattern={unlockPattern} onChange={setUnlockPattern} />
            </div>
          </div>
        );

      case 'parts':
        return (
          <div className="space-y-4">
            <div>
              <Label>Rechercher une pièce en stock</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input placeholder="Nom ou référence..." value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              {searchTerm && (
                <div className="mt-2 max-h-40 overflow-y-auto border rounded-md">
                  {filteredParts.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">Aucune pièce trouvée</div>
                  ) : (
                    filteredParts.slice(0, 8).map((part) => (
                      <div key={part.id} className="flex items-center justify-between p-2 hover:bg-muted/50 border-b last:border-0">
                        <div>
                          <div className="text-sm font-medium">{part.name}</div>
                          {part.reference && <div className="text-xs text-muted-foreground">Réf: {part.reference}</div>}
                          {part.time_minutes > 0 && (
                            <div className={`text-xs flex items-center gap-1 mt-0.5 ${part.time_minutes > 45 ? 'text-destructive font-medium' : 'text-foreground'}`}>
                              <Clock className="h-3 w-3" />
                              {part.time_minutes} min
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={part.quantity === 0 ? 'destructive' : 'secondary'} className="text-xs">
                            Stock: {part.quantity}
                          </Badge>
                          <Button type="button" size="sm" variant={recentlyAddedParts.includes(part.id) ? "default" : "outline"}
                            className={recentlyAddedParts.includes(part.id) ? "bg-emerald-500 text-white" : ""}
                            onClick={() => addPartFromStock(part)}>
                            {recentlyAddedParts.includes(part.id) ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addCustomPart}>
              <Plus className="mr-1 h-3 w-3" /> Pièce libre
            </Button>
            {selectedParts.length > 0 && (
              <div className="space-y-3">
                <Separator />
                {selectedParts.map((part) => (
                  <div key={part.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <Badge variant={part.isCustom ? "outline" : "secondary"} className="text-xs">
                        {part.isCustom ? 'Libre' : 'Stock'}
                      </Badge>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removePart(part.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Nom</Label>
                        <Input value={part.name} disabled={!part.isCustom} className="text-sm h-8"
                          onChange={(e) => updatePart(part.id, 'name', e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Qté</Label>
                        <Input type="number" min="1" value={part.quantity} className="text-sm h-8"
                          onChange={(e) => updatePart(part.id, 'quantity', parseInt(e.target.value) || 1)} />
                      </div>
                      <div>
                        <Label className="text-xs">Prix (€)</Label>
                        <Input type="number" min="0" step="0.01" value={part.unitPrice} className="text-sm h-8"
                          disabled={!part.isCustom}
                          onChange={(e) => updatePart(part.id, 'unitPrice', parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'summary':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">Type</p>
                <p className="font-medium">{getAllTypes().find(t => t.value === savType)?.label || savType}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">Statut</p>
                <p className="font-medium">{getAllStatuses().find(s => s.value === selectedStatus)?.label || selectedStatus}</p>
              </div>
              {currentTypeInfo.show_customer_info && (
                <div className="bg-muted/50 rounded-lg p-3 col-span-2">
                  <p className="text-muted-foreground text-xs">Client</p>
                  <p className="font-medium">
                    {selectedCustomer
                      ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
                      : `${customerInfo.firstName} ${customerInfo.lastName}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{selectedCustomer?.phone || customerInfo.phone}</p>
                </div>
              )}
              <div className="bg-muted/50 rounded-lg p-3 col-span-2">
                <p className="text-muted-foreground text-xs">Appareil</p>
                <p className="font-medium">{deviceInfo.brand} {deviceInfo.model}</p>
                {deviceInfo.imei && <p className="text-xs text-muted-foreground">IMEI: {deviceInfo.imei}</p>}
              </div>
              {deviceInfo.problemDescription && (
                <div className="bg-muted/50 rounded-lg p-3 col-span-2">
                  <p className="text-muted-foreground text-xs">Problème</p>
                  <p className="text-sm">{deviceInfo.problemDescription}</p>
                </div>
              )}
            </div>
            {selectedParts.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground text-xs mb-2">Pièces ({selectedParts.length})</p>
                {selectedParts.map(p => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span>{p.name} x{p.quantity}</span>
                    <span>{(p.unitPrice * p.quantity).toFixed(2)}€</span>
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{totalCost.toFixed(2)}€</span>
                </div>
              </div>
            )}
            <div>
              <Label className="text-sm">Acompte réglé par le client (€)</Label>
              <Input type="number" min="0" step="0.01" value={depositAmount}
                onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00" className="text-right" />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isLastStep = currentStep === totalSteps - 1;

  return (
    <>
      <Dialog open={open && !showPrintDialog} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-h-[85vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <StepIcon className="h-5 w-5 text-primary" />
                {activeSteps[currentStep]?.label}
              </DialogTitle>
              <span className="text-sm text-muted-foreground">
                Étape {currentStep + 1}/{totalSteps}
              </span>
            </div>
            <Progress value={progress} className="h-2 mt-2" />
            {/* Step indicators */}
            <div className="flex justify-between mt-2">
              {activeSteps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.key} className={`flex flex-col items-center gap-1 ${
                    i === currentStep ? 'text-primary' : i < currentStep ? 'text-primary/60' : 'text-muted-foreground/40'
                  }`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${
                      i === currentStep ? 'bg-primary text-primary-foreground shadow-md' 
                      : i < currentStep ? 'bg-primary/20 text-primary' 
                      : 'bg-muted text-muted-foreground'
                    }`}>
                      {i < currentStep ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogHeader>

          <div className="py-4 min-h-[200px]">
            {renderStepContent()}
          </div>

          {validationError && (
            <p className="text-sm text-destructive font-medium text-center">{validationError}</p>
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button type="button" variant="outline" onClick={goBack} disabled={currentStep === 0}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Retour
            </Button>
            {isLastStep ? (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Création...' : 'Créer le dossier SAV'}
              </Button>
            ) : (
              <Button onClick={goNext}>
                Suivant <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {createdSAVCase && (
        <div style={{ display: 'none' }}>
          <SAVPrintButton savCase={createdSAVCase} ref={printButtonRef} />
        </div>
      )}

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
    </>
  );
}
