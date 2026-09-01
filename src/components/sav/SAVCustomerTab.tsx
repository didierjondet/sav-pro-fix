import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { User, Mail, Phone, MapPin, Search, Plus, X, Save, Link2Off, AlertCircle, History } from 'lucide-react';
import { useAllCustomers } from '@/hooks/useAllCustomers';
import { useCustomers } from '@/hooks/useCustomers';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { multiWordSearch } from '@/utils/searchUtils';
import { validateFrenchPhoneNumber, formatPhoneInput } from '@/utils/phoneValidation';
import { logSAVChange, getCurrentUserName } from '@/hooks/useSAVAuditLog';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SAVCustomerTabProps {
  savCaseId: string;
  shopId?: string;
  customerId?: string | null;
  customer?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address?: string;
  } | null;
  onCustomerUpdated?: () => void;
  requiresCustomer?: boolean;
}

interface HistoryRow {
  id: string;
  case_number: string;
  device_brand: string | null;
  device_model: string | null;
  status: string;
  created_at: string;
  total_cost: number | null;
}

export function SAVCustomerTab({ savCaseId, shopId, customerId, customer, onCustomerUpdated, requiresCustomer = true }: SAVCustomerTabProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { customers } = useAllCustomers();
  const { createCustomer } = useCustomers();
  const { profile } = useProfile();
  const { getStatusInfo } = useShopSAVStatuses();

  const [searchOpen, setSearchOpen] = useState(!customerId);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const currentName = customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : '';

  useEffect(() => {
    const fetchHistory = async () => {
      if (!customerId) {
        setHistory([]);
        return;
      }
      setLoadingHistory(true);
      const { data } = await supabase
        .from('sav_cases')
        .select('id, case_number, device_brand, device_model, status, created_at, total_cost')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(50);
      setHistory((data as HistoryRow[]) || []);
      setLoadingHistory(false);
    };
    fetchHistory();
  }, [customerId, savCaseId]);

  const filteredCustomers = customers.filter((c) =>
    searchTerm && (
      multiWordSearch(searchTerm, c.first_name, c.last_name, c.email, c.phone) ||
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    )
  ).slice(0, 8);

  const resetForms = () => {
    setSearchTerm('');
    setShowNewForm(false);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setAddress('');
  };

  const applyCustomer = async (newCustomerId: string | null, newName: string | null) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('sav_cases')
        .update({ customer_id: newCustomerId })
        .eq('id', savCaseId);
      if (error) throw error;

      if (shopId) {
        const userName = await getCurrentUserName();
        await logSAVChange(savCaseId, shopId, 'sav_cases', 'update', 'customer_id', currentName || null, newName, userName);
      }

      toast({
        title: 'Succès',
        description: newCustomerId ? 'Client lié au dossier SAV' : 'Client délié du dossier SAV',
      });
      resetForms();
      setSearchOpen(!newCustomerId);
      onCustomerUpdated?.();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAndAssign = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast({ title: 'Erreur', description: 'Le prénom et le nom sont requis', variant: 'destructive' });
      return;
    }
    const targetShopId = shopId || profile?.shop_id;
    if (!targetShopId) {
      toast({ title: 'Erreur', description: 'Impossible de récupérer les informations du magasin', variant: 'destructive' });
      return;
    }
    if (phone.trim()) {
      const v = validateFrenchPhoneNumber(phone);
      if (!v.isValid) {
        toast({ title: 'Erreur', description: `Téléphone invalide: ${v.message}`, variant: 'destructive' });
        return;
      }
    }

    setSaving(true);
    try {
      const { data: newCustomer, error: createError } = await createCustomer({
        shop_id: targetShopId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      });
      if (createError) throw createError;
      if (!newCustomer) throw new Error('Erreur lors de la création du client');

      await applyCustomer(newCustomer.id, `${newCustomer.first_name} ${newCustomer.last_name}`);
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Client actuel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Client rattaché
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {customerId && customer ? (
            <>
              <div className="rounded-lg border p-3 space-y-2">
                <div className="font-semibold">{currentName || 'Client sans nom'}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                  {customer.phone && (
                    <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{customer.phone}</div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-2 truncate"><Mail className="h-3.5 w-3.5" />{customer.email}</div>
                  )}
                  {customer.address && (
                    <div className="flex items-center gap-2 md:col-span-2"><MapPin className="h-3.5 w-3.5" />{customer.address}</div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => { setSearchOpen((v) => !v); setShowNewForm(false); }}>
                  <Search className="h-4 w-4 mr-2" /> Changer de client
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={saving}
                  onClick={() => applyCustomer(null, null)}
                >
                  <Link2Off className="h-4 w-4 mr-2" /> Délier
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Aucun client rattaché à ce dossier</p>
                <p className="text-muted-foreground">Recherchez un client existant ou créez-en un nouveau ci-dessous.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recherche / création */}
      {searchOpen && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {customerId ? 'Lier un autre client' : 'Lier un client'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showNewForm ? (
              <>
                <div className="space-y-2">
                  <Label>Rechercher un client existant</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nom, prénom, email ou téléphone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {searchTerm.length > 1 && (
                  filteredCustomers.length > 0 ? (
                    <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
                      {filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          disabled={saving}
                          className="w-full text-left p-3 hover:bg-muted/70 transition-colors"
                          onClick={() => applyCustomer(c.id, `${c.first_name} ${c.last_name}`)}
                        >
                          <div className="font-medium flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {c.first_name} {c.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-3">
                            {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                            {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed rounded-lg p-4 text-center text-muted-foreground text-sm">
                      Aucun client trouvé
                    </div>
                  )
                )}

                <Button variant="outline" className="w-full" onClick={() => setShowNewForm(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Créer un nouveau client
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Nouveau client</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowNewForm(false)}>
                    <X className="h-4 w-4 mr-2" /> Annuler
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sav-cust-first">Prénom *</Label>
                    <Input id="sav-cust-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="sav-cust-last">Nom *</Label>
                    <Input id="sav-cust-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sav-cust-email">Email</Label>
                    <Input id="sav-cust-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="sav-cust-phone">Téléphone</Label>
                    <Input
                      id="sav-cust-phone"
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                      placeholder="Ex: 06.12.34.56.78"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="sav-cust-address">Adresse</Label>
                  <Textarea id="sav-cust-address" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <Button className="w-full" disabled={saving} onClick={handleCreateAndAssign}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Enregistrement...' : 'Créer et lier au dossier'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Historique client */}
      {customerId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              Historique de {currentName || 'ce client'}
              <Badge variant="secondary" className="ml-2">{history.length} SAV</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun dossier pour ce client.</p>
            ) : (
              <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                {history.map((row) => {
                  const info = getStatusInfo(row.status);
                  const isCurrent = row.id === savCaseId;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => { if (!isCurrent) navigate(`/sav/${row.id}`); }}
                      className={`w-full text-left p-3 transition-colors ${isCurrent ? 'bg-primary/10' : 'hover:bg-muted/70'}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium">
                          {row.case_number}
                          {isCurrent && <span className="ml-2 text-xs text-primary">(dossier actuel)</span>}
                        </div>
                        <Badge style={{ backgroundColor: info?.color, color: 'white' }}>
                          {info?.label || row.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-3">
                        <span>{[row.device_brand, row.device_model].filter(Boolean).join(' ') || 'Appareil non renseigné'}</span>
                        <span>{format(new Date(row.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
                        {row.total_cost != null && <span>{Number(row.total_cost).toFixed(2)} €</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
