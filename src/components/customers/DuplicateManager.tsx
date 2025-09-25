import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Users, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import { useCustomerDuplicates } from '@/hooks/useCustomerDuplicates';
import { Customer } from '@/hooks/useCustomers';

interface DuplicateManagerProps {
  customers: Customer[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMergeComplete: () => void;
}

export function DuplicateManager({ customers, open, onOpenChange, onMergeComplete }: DuplicateManagerProps) {
  const { duplicates, loading, detectDuplicates, mergeCustomers } = useCustomerDuplicates();
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(null);
  const [keepCustomerId, setKeepCustomerId] = useState<string>('');
  const [mergeIds, setMergeIds] = useState<string[]>([]);

  const handleDetectDuplicates = () => {
    detectDuplicates(customers);
  };

  const handleSelectGroup = (groupIndex: number) => {
    setSelectedGroupIndex(groupIndex);
    const group = duplicates[groupIndex];
    setKeepCustomerId(group.customers[0].id);
    setMergeIds([]);
  };

  const handleMergeCustomers = async () => {
    if (!keepCustomerId || mergeIds.length === 0) return;

    const result = await mergeCustomers(keepCustomerId, mergeIds);
    if (result.success) {
      onMergeComplete();
      onOpenChange(false);
    }
  };

  const toggleMergeId = (customerId: string) => {
    setMergeIds(prev => 
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const selectedGroup = selectedGroupIndex !== null ? duplicates[selectedGroupIndex] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestionnaire de doublons
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Bouton de détection */}
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">
              Recherchez et fusionnez les clients en doublon pour nettoyer votre base de données.
            </p>
            <Button onClick={handleDetectDuplicates} disabled={loading}>
              {loading ? 'Analyse...' : 'Détecter les doublons'}
            </Button>
          </div>

          {/* Liste des groupes de doublons */}
          {duplicates.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                {duplicates.length} groupe(s) de doublons détecté(s)
              </h3>

              <div className="grid gap-3">
                {duplicates.map((group, index) => (
                  <Card 
                    key={index} 
                    className={`cursor-pointer transition-colors ${
                      selectedGroupIndex === index ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleSelectGroup(index)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          {group.reason}
                        </CardTitle>
                        <Badge variant={
                          group.similarity === 'name' ? 'destructive' :
                          group.similarity === 'email' ? 'default' : 'secondary'
                        }>
                          {group.customers.length} clients
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-sm text-muted-foreground">
                        {group.customers.map(c => `${c.first_name} ${c.last_name}`).join(' • ')}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Interface de fusion */}
          {selectedGroup && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-lg">
                  Fusion des clients - {selectedGroup.reason}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Sélectionnez le client à conserver et cochez ceux à fusionner.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Client à conserver :</Label>
                  <RadioGroup value={keepCustomerId} onValueChange={setKeepCustomerId}>
                    {selectedGroup.customers.map((customer) => (
                      <div key={customer.id} className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value={customer.id} id={`keep-${customer.id}`} />
                          <Label htmlFor={`keep-${customer.id}`} className="font-medium">
                            {customer.first_name} {customer.last_name}
                          </Label>
                        </div>
                        <Card className="ml-6 bg-muted/30">
                          <CardContent className="p-3 space-y-2">
                            {customer.email && (
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-3 w-3" />
                                <span>{customer.email}</span>
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-3 w-3" />
                                <span>{customer.phone}</span>
                              </div>
                            )}
                            {customer.address && (
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-3 w-3" />
                                <span className="line-clamp-1">{customer.address}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>Créé le {new Date(customer.created_at).toLocaleDateString()}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-sm font-medium">Clients à fusionner :</Label>
                  <div className="space-y-2 mt-2">
                    {selectedGroup.customers
                      .filter(c => c.id !== keepCustomerId)
                      .map((customer) => (
                        <div key={customer.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`merge-${customer.id}`}
                            checked={mergeIds.includes(customer.id)}
                            onCheckedChange={() => toggleMergeId(customer.id)}
                          />
                          <Label htmlFor={`merge-${customer.id}`} className="font-medium">
                            {customer.first_name} {customer.last_name}
                          </Label>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setSelectedGroupIndex(null)}>
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleMergeCustomers}
                    disabled={!keepCustomerId || mergeIds.length === 0}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Fusionner {mergeIds.length} client(s)
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}