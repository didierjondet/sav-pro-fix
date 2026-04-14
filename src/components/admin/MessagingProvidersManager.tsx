import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, MessageSquare, Check, X, Loader2, Eye, EyeOff, Zap, Trash2, Power, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SMS_PROVIDERS = [
  { id: 'twilio_gateway', name: 'Twilio (Gateway Lovable)', description: 'Utilise la passerelle Lovable existante. Aucune config supplémentaire.', fields: [] },
  { id: 'twilio_direct', name: 'Twilio Direct', description: 'Appel direct API Twilio avec vos propres identifiants.', fields: ['account_sid', 'auth_token', 'phone_number'] },
  { id: 'brevo_sms', name: 'Brevo SMS', description: 'API transactionnelle SMS de Brevo (ex-Sendinblue).', fields: ['api_key', 'sender_name'] },
];

const EMAIL_PROVIDERS = [
  { id: 'resend', name: 'Resend', description: 'Service Resend (configuration existante).', fields: ['api_key', 'from_email'] },
  { id: 'brevo_email', name: 'Brevo Email', description: 'API transactionnelle Email de Brevo.', fields: ['api_key', 'from_email', 'from_name'] },
  { id: 'smtp', name: 'SMTP Générique', description: 'Serveur SMTP personnalisé.', fields: ['host', 'port', 'username', 'password', 'from_email'] },
];

const FIELD_LABELS: Record<string, string> = {
  account_sid: 'Account SID',
  auth_token: 'Auth Token',
  phone_number: 'Numéro expéditeur',
  api_key: 'Clé API',
  sender_name: 'Nom expéditeur SMS',
  from_email: 'Email expéditeur',
  from_name: 'Nom expéditeur',
  host: 'Serveur SMTP',
  port: 'Port',
  username: 'Utilisateur',
  password: 'Mot de passe',
};

const FIELD_PLACEHOLDERS: Record<string, string> = {
  account_sid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  auth_token: 'Votre Auth Token Twilio',
  phone_number: '+33xxxxxxxxx',
  api_key: 'xkeysib-xxxxxxxxxxxxxxxx',
  sender_name: 'MonEntreprise',
  from_email: 'noreply@mondomaine.fr',
  from_name: 'Mon Entreprise',
  host: 'smtp.example.com',
  port: '587',
  username: 'user@example.com',
  password: 'Mot de passe SMTP',
};

const SECRET_FIELDS = ['auth_token', 'api_key', 'password'];

interface MessagingProvider {
  id: string;
  type: string;
  provider: string;
  name: string;
  is_active: boolean;
  from_address: string | null;
  created_at: string;
}

export function MessagingProvidersManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<MessagingProvider[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formType, setFormType] = useState<'sms' | 'email'>('sms');
  const [formProvider, setFormProvider] = useState('');
  const [formName, setFormName] = useState('');
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('messaging_providers')
        .select('id, type, provider, name, is_active, from_address, created_at')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setProviders((data || []) as MessagingProvider[]);
    } catch (error: any) {
      console.error('Error fetching messaging providers:', error);
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getProviderDef = (type: string, providerId: string) => {
    const list = type === 'sms' ? SMS_PROVIDERS : EMAIL_PROVIDERS;
    return list.find(p => p.id === providerId);
  };

  const openAddDialog = (type: 'sms' | 'email') => {
    const list = type === 'sms' ? SMS_PROVIDERS : EMAIL_PROVIDERS;
    setFormType(type);
    setFormProvider(list[0].id);
    setFormName(list[0].name);
    setFormFields({});
    setShowSecrets({});
    setDialogOpen(true);
  };

  const handleProviderSelect = (providerId: string) => {
    const list = formType === 'sms' ? SMS_PROVIDERS : EMAIL_PROVIDERS;
    const def = list.find(p => p.id === providerId);
    setFormProvider(providerId);
    setFormName(def?.name || '');
    setFormFields({});
    setShowSecrets({});
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const list = formType === 'sms' ? SMS_PROVIDERS : EMAIL_PROVIDERS;
      const def = list.find(p => p.id === formProvider);
      if (!def) throw new Error('Fournisseur inconnu');

      // Validate required fields
      for (const field of def.fields) {
        if (!formFields[field]) {
          toast({ title: 'Erreur', description: `Le champ "${FIELD_LABELS[field]}" est requis.`, variant: 'destructive' });
          setSaving(false);
          return;
        }
      }

      const fromAddress = formFields['phone_number'] || formFields['from_email'] || formFields['sender_name'] || null;

      const { data, error } = await supabase.functions.invoke('save-messaging-provider', {
        body: {
          type: formType,
          provider: formProvider,
          name: formName,
          config: formFields,
          from_address: fromAddress,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Fournisseur ajouté', description: `${formName} a été configuré avec succès.` });
      setDialogOpen(false);
      fetchProviders();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (provider: MessagingProvider) => {
    setActivatingId(provider.id);
    try {
      // Deactivate all of same type, then activate this one
      const sameType = providers.filter(p => p.type === provider.type && p.id !== provider.id);
      for (const p of sameType) {
        await supabase.from('messaging_providers').update({ is_active: false }).eq('id', p.id);
      }
      await supabase.from('messaging_providers').update({ is_active: true }).eq('id', provider.id);

      toast({ title: 'Fournisseur activé', description: `${provider.name} est maintenant le fournisseur ${provider.type === 'sms' ? 'SMS' : 'Email'} actif.` });
      fetchProviders();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setActivatingId(null);
    }
  };

  const handleDeactivate = async (provider: MessagingProvider) => {
    setActivatingId(provider.id);
    try {
      await supabase.from('messaging_providers').update({ is_active: false }).eq('id', provider.id);
      toast({ title: 'Fournisseur désactivé', description: `${provider.name} a été désactivé.` });
      fetchProviders();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setActivatingId(null);
    }
  };

  const handleDelete = async (provider: MessagingProvider) => {
    if (!confirm(`Supprimer le fournisseur "${provider.name}" ?`)) return;
    setDeletingId(provider.id);
    try {
      const { error } = await supabase.from('messaging_providers').delete().eq('id', provider.id);
      if (error) throw error;
      toast({ title: 'Supprimé', description: `${provider.name} a été supprimé.` });
      fetchProviders();
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const renderProviderCard = (provider: MessagingProvider) => {
    const def = getProviderDef(provider.type, provider.provider);
    return (
      <Card key={provider.id} className={`transition-all ${provider.is_active ? 'ring-2 ring-primary border-primary' : 'border-slate-200'}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{provider.name}</CardTitle>
            <div className="flex items-center gap-2">
              {provider.is_active && <Badge className="bg-green-100 text-green-700 border-green-200">Actif</Badge>}
              <Badge variant="outline" className="text-xs">{provider.provider}</Badge>
            </div>
          </div>
          <CardDescription>{def?.description}</CardDescription>
          {provider.from_address && (
            <p className="text-xs text-slate-500 mt-1">Expéditeur : {provider.from_address}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {provider.is_active ? (
              <Button size="sm" variant="outline" onClick={() => handleDeactivate(provider)} disabled={activatingId === provider.id}>
                {activatingId === provider.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <X className="h-3 w-3 mr-1" />}
                Désactiver
              </Button>
            ) : (
              <Button size="sm" onClick={() => handleActivate(provider)} disabled={activatingId === provider.id}>
                {activatingId === provider.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Power className="h-3 w-3 mr-1" />}
                Activer
              </Button>
            )}
            <Button size="sm" variant="destructive" onClick={() => handleDelete(provider)} disabled={deletingId === provider.id}>
              {deletingId === provider.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderProviderList = (type: 'sms' | 'email') => {
    const filtered = providers.filter(p => p.type === type);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            {filtered.length === 0 
              ? `Aucun fournisseur ${type === 'sms' ? 'SMS' : 'Email'} configuré.`
              : `${filtered.length} fournisseur${filtered.length > 1 ? 's' : ''} configuré${filtered.length > 1 ? 's' : ''}`}
          </p>
          <Button size="sm" onClick={() => openAddDialog(type)}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
        </div>
        <div className="grid gap-4">
          {filtered.map(renderProviderCard)}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentFormDef = (formType === 'sms' ? SMS_PROVIDERS : EMAIL_PROVIDERS).find(p => p.id === formProvider);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Mail className="h-7 w-7 text-primary" />
          Fournisseurs SMS / Email
        </h2>
        <p className="text-slate-600 mt-1">
          Configurez et activez vos fournisseurs SMS et Email. Changez de fournisseur à la volée sans modifier le code.
        </p>
      </div>

      <Tabs defaultValue="sms">
        <TabsList>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> SMS
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" /> Email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sms" className="mt-4">
          {renderProviderList('sms')}
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          {renderProviderList('email')}
        </TabsContent>
      </Tabs>

      {/* Add Provider Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Ajouter un fournisseur {formType === 'sms' ? 'SMS' : 'Email'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fournisseur</Label>
              <Select value={formProvider} onValueChange={handleProviderSelect}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(formType === 'sms' ? SMS_PROVIDERS : EMAIL_PROVIDERS).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentFormDef && (
                <p className="text-xs text-slate-500">{currentFormDef.description}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Nom personnalisé</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nom du fournisseur" />
            </div>

            {currentFormDef?.fields.map(field => (
              <div key={field} className="space-y-2">
                <Label>{FIELD_LABELS[field] || field}</Label>
                <div className="relative">
                  <Input
                    type={SECRET_FIELDS.includes(field) && !showSecrets[field] ? 'password' : 'text'}
                    placeholder={FIELD_PLACEHOLDERS[field] || ''}
                    value={formFields[field] || ''}
                    onChange={e => setFormFields(prev => ({ ...prev, [field]: e.target.value }))}
                  />
                  {SECRET_FIELDS.includes(field) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                      onClick={() => setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }))}
                    >
                      {showSecrets[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {currentFormDef?.fields.length === 0 && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">Aucune configuration nécessaire, utilise les secrets existants du projet.</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                Sauvegarder
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Info Card */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-6">
          <h4 className="font-medium text-slate-900 mb-2">ℹ️ Comment ça marche</h4>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>• Un seul fournisseur SMS et un seul fournisseur Email peuvent être actifs à la fois.</li>
            <li>• Le changement est instantané : toutes les fonctions du site utiliseront le fournisseur actif.</li>
            <li>• Les clés API sont chiffrées en base de données (AES-256-GCM).</li>
            <li>• Si aucun fournisseur n'est actif, les envois échoueront avec un message explicite.</li>
            <li>• Fournisseurs SMS : Twilio Gateway, Twilio Direct, Brevo SMS</li>
            <li>• Fournisseurs Email : Resend, Brevo Email, SMTP générique</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
