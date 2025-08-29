import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { validateFrenchPhoneNumber, formatPhoneInput } from '@/utils/phoneValidation';
import { useEffect } from 'react';

interface Customer {
  id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (data: Omit<Customer, 'id'>) => Promise<{ error: any }>;
  onCancel: () => void;
  isEdit?: boolean;
}

export function CustomerForm({ customer, onSubmit, onCancel, isEdit = false }: CustomerFormProps) {
  const [firstName, setFirstName] = useState(customer?.first_name || '');
  const [lastName, setLastName] = useState(customer?.last_name || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [loading, setLoading] = useState(false);
  
  // État pour validation téléphone
  const [phoneValidation, setPhoneValidation] = useState({ isValid: true, message: '' });

  // Validation du numéro de téléphone en temps réel
  useEffect(() => {
    if (phone.trim()) {
      const validation = validateFrenchPhoneNumber(phone);
      setPhoneValidation({
        isValid: validation.isValid,
        message: validation.message
      });
    } else {
      setPhoneValidation({ isValid: true, message: '' });
    }
  }, [phone]);

  // Fonction pour gérer le changement du téléphone avec formatage automatique
  const handlePhoneChange = (value: string) => {
    const formattedPhone = formatPhoneInput(value);
    setPhone(formattedPhone);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim() || !lastName.trim()) {
      alert('Le prénom et le nom sont requis');
      return;
    }

    // Validation du numéro de téléphone si fourni
    if (phone.trim()) {
      const phoneValidationResult = validateFrenchPhoneNumber(phone);
      if (!phoneValidationResult.isValid) {
        alert(`Numéro de téléphone invalide: ${phoneValidationResult.message}`);
        return;
      }
    }

    setLoading(true);
    
    const { error } = await onSubmit({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
    });

    setLoading(false);

    if (!error) {
      onCancel();
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <h1 className="text-2xl font-bold">
          {isEdit ? 'Modifier le client' : 'Nouveau client'}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations du client</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="Ex: 06.12.34.56.78 ou +33 6 12 34 56 78"
                  className={!phoneValidation.isValid ? 'border-red-500' : ''}
                />
                {phoneValidation.message && (
                  <div className={`flex items-center gap-1 mt-1 text-sm ${phoneValidation.isValid ? 'text-green-600' : 'text-red-500'}`}>
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

            <div>
              <Label htmlFor="address">Adresse</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Enregistrement...' : (isEdit ? 'Modifier' : 'Créer')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}