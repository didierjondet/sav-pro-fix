import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Edit, Plus, Search, User, Mail, Phone, Save, X } from 'lucide-react';
import { useCustomers } from '@/hooks/useCustomers';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { multiWordSearch } from '@/utils/searchUtils';
import { validateFrenchPhoneNumber, formatPhoneInput } from '@/utils/phoneValidation';

interface EditSAVCustomerDialogProps {
  savCaseId: string;
  currentCustomerId?: string;
  currentCustomerName?: string;
  onCustomerUpdated?: () => void;
}

export function EditSAVCustomerDialog({ 
  savCaseId, 
  currentCustomerId, 
  currentCustomerName,
  onCustomerUpdated 
}: EditSAVCustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Nouveau client
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  
  const { customers, createCustomer } = useCustomers();
  const { profile } = useProfile();
  const { toast } = useToast();

  // Filtrer les clients en fonction de la recherche
  const filteredCustomers = customers.filter(customer =>
    searchTerm && (
      multiWordSearch(searchTerm, customer.first_name, customer.last_name, customer.email, customer.phone) ||
      `${customer.first_name} ${customer.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    )
  ).slice(0, 5);

  const handleSelectExistingCustomer = async (customerId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('sav_cases')
        .update({ customer_id: customerId })
        .eq('id', savCaseId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Client modifié avec succès"
      });

      setOpen(false);
      onCustomerUpdated?.();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAndAssignCustomer = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: "Erreur",
        description: "Le prénom et le nom sont requis",
        variant: "destructive"
      });
      return;
    }

    if (!profile?.shop_id) {
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les informations du magasin",
        variant: "destructive"
      });
      return;
    }

    // Validation du téléphone si fourni
    if (phone.trim()) {
      const phoneValidation = validateFrenchPhoneNumber(phone);
      if (!phoneValidation.isValid) {
        toast({
          title: "Erreur",
          description: `Téléphone invalide: ${phoneValidation.message}`,
          variant: "destructive"
        });
        return;
      }
    }

    setSaving(true);
    try {
      // Créer le client
      const { data: newCustomer, error: createError } = await createCustomer({
        shop_id: profile.shop_id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      });

      if (createError) throw createError;
      if (!newCustomer) throw new Error("Erreur lors de la création du client");

      // Assigner le client au SAV
      const { error: updateError } = await supabase
        .from('sav_cases')
        .update({ customer_id: newCustomer.id })
        .eq('id', savCaseId);

      if (updateError) throw updateError;

      toast({
        title: "Succès",
        description: "Client créé et assigné avec succès"
      });

      setOpen(false);
      resetForm();
      onCustomerUpdated?.();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSearchTerm('');
    setShowResults(false);
    setShowNewCustomerForm(false);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setAddress('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-8 w-8 p-0"
          title={currentCustomerId ? "Modifier le client" : "Ajouter un client"}
        >
          {currentCustomerId ? (
            <Edit className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {currentCustomerId ? "Modifier le client" : "Ajouter un client"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!showNewCustomerForm ? (
            <>
              {/* Recherche de client existant */}
              <div className="space-y-4">
                <Label>Rechercher un client existant</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Nom, prénom, email ou téléphone..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowResults(e.target.value.length > 2);
                    }}
                    className="pl-10"
                    autoFocus
                  />
                </div>

                {/* Résultats de recherche */}
                {showResults && filteredCustomers.length > 0 && (
                  <Card className="border shadow-lg">
                    <CardContent className="p-0 max-h-60 overflow-y-auto">
                      {filteredCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          className="p-3 hover:bg-muted/80 cursor-pointer border-b last:border-b-0 transition-colors"
                          onClick={() => handleSelectExistingCustomer(customer.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {customer.first_name} {customer.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1 mt-1">
                                {customer.email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {customer.email}
                                  </div>
                                )}
                                {customer.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {customer.phone}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button size="sm" variant="outline" disabled={saving}>
                              Sélectionner
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {searchTerm && showResults && filteredCustomers.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="p-4 text-center text-muted-foreground">
                      Aucun client trouvé
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Ou
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowNewCustomerForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer un nouveau client
              </Button>
            </>
          ) : (
            <>
              {/* Formulaire nouveau client */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Nouveau client</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewCustomerForm(false)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Annuler
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Prénom *</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Nom *</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                      placeholder="Ex: 06.12.34.56.78"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Adresse</Label>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleCreateAndAssignCustomer}
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Enregistrement..." : "Créer et assigner le client"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
