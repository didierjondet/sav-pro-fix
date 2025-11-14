import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAllCustomers } from '@/hooks/useAllCustomers';
import { Customer } from '@/hooks/useCustomers';
import { Search, User, Plus, Mail, Phone } from 'lucide-react';
import { multiWordSearch } from '@/utils/searchUtils';

interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
}

interface CustomerSearchProps {
  customerInfo: CustomerInfo;
  setCustomerInfo: (info: CustomerInfo) => void;
  onCustomerSelected?: (customer: Customer) => void;
}

export function CustomerSearch({ customerInfo, setCustomerInfo, onCustomerSelected }: CustomerSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  const { customers } = useAllCustomers();

  // Filtrer les clients en fonction de la recherche
  const filteredCustomers = customers.filter(customer =>
    searchTerm && (
      multiWordSearch(searchTerm, customer.first_name, customer.last_name, customer.email, customer.phone) ||
      `${customer.first_name} ${customer.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    )
  ).slice(0, 5); // Limiter à 5 résultats

  useEffect(() => {
    setShowResults(searchTerm.length > 2 && filteredCustomers.length > 0);
  }, [searchTerm, filteredCustomers.length]);

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerInfo({
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
    });
    setSearchTerm(`${customer.first_name} ${customer.last_name}`);
    setShowResults(false);
    onCustomerSelected?.(customer);
  };

  const clearSelection = () => {
    setSelectedCustomer(null);
    setCustomerInfo({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
    });
    setSearchTerm('');
  };

  const createNewCustomer = () => {
    setSelectedCustomer(null);
    const names = searchTerm.split(' ');
    setCustomerInfo({
      firstName: names[0] || '',
      lastName: names.slice(1).join(' ') || '',
      email: '',
      phone: '',
      address: '',
    });
    setShowResults(false);
  };

  const handleInputFocus = () => {
    if (searchTerm.length > 2 && filteredCustomers.length > 0) {
      setShowResults(true);
    }
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    // Délai pour permettre le clic sur les résultats
    setTimeout(() => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setShowResults(false);
      }
    }, 200);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Label htmlFor="customer-search">Rechercher un client existant</Label>
        <div className="relative border-2 border-blue-200 rounded-lg shadow-sm bg-blue-50/30 dark:bg-blue-950/30 dark:border-blue-800 transition-all duration-200 focus-within:border-blue-400 focus-within:shadow-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 h-4 w-4" />
          <Input
            id="customer-search"
            placeholder="Nom, prénom, email ou téléphone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            className="pl-10 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoComplete="off"
          />
        </div>
        
        {/* Affichage du client sélectionné */}
        {selectedCustomer && (
          <Card className="mt-2 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800 dark:text-green-200">
                    Client sélectionné: {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                >
                  Changer
                </Button>
              </div>
              {selectedCustomer.email && (
                <div className="flex items-center gap-1 text-sm text-green-700 dark:text-green-300 mt-1">
                  <Mail className="h-3 w-3" />
                  {selectedCustomer.email}
                </div>
              )}
              {selectedCustomer.phone && (
                <div className="flex items-center gap-1 text-sm text-green-700 dark:text-green-300">
                  <Phone className="h-3 w-3" />
                  {selectedCustomer.phone}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Résultats de recherche */}
        {showResults && !selectedCustomer && (
          <Card className="mt-2 absolute z-50 w-full border shadow-lg bg-background">
            <CardContent className="p-0 max-h-60 overflow-y-auto">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="p-3 hover:bg-muted/80 cursor-pointer border-b last:border-b-0 transition-colors"
                  onClick={() => selectCustomer(customer)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-foreground">
                        {customer.first_name} {customer.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
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
                    <div className="text-xs text-muted-foreground ml-2">
                      Cliquer pour sélectionner
                    </div>
                  </div>
                </div>
              ))}
              {/* Option pour créer un nouveau client */}
              {searchTerm && filteredCustomers.length < 5 && (
                <div
                  className="flex items-center gap-2 p-3 hover:bg-primary/10 cursor-pointer border-t transition-colors"
                  onClick={createNewCustomer}
                >
                  <Plus className="h-4 w-4 text-primary" />
                  <span className="text-primary font-medium">
                    Créer un nouveau client "{searchTerm}"
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}