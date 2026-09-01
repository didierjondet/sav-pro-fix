import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Edit, Trash2, Plus, Info, Clock, Mail, Phone, User, MapPin, Wrench, Sidebar, Power,
  Link2, Unlink, Search, ShieldCheck,
} from 'lucide-react';
import { SAVProvider, useSAVProviders } from '@/hooks/useSAVProviders';
import { useShopSettings } from '@/hooks/useShopSettings';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PartnerDirectoryDialog } from '@/components/partners/PartnerDirectoryDialog';
import { usePartnerLink } from '@/hooks/usePartnerDirectory';

const emptyForm = {
  name: '',
  contact_name: '',
  phone: '',
  email: '',
  address: '',
  specialties: '',
  avg_delay_days: undefined as number | undefined,
  color: '#8b5cf6',
  notes: '',
  is_active: true,
  show_in_sidebar: true,
  partner_code: '',
};

export function SAVProvidersManager() {
  const { providers, isLoading, createProvider, updateProvider, deleteProvider, refetch } = useSAVProviders();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SAVProvider | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const { settings, refetch: refetchSettings } = useShopSettings();
  const { profile } = useProfile();
  const { toast } = useToast();
  const { linkProvider, unlinkProvider } = usePartnerLink();


  const handleToggleHideEmpty = async (checked: boolean) => {
    if (!profile?.shop_id) return;
    try {
      const { error } = await supabase
        .from('shops')
        .update({ hide_empty_sav_providers: checked } as any)
        .eq('id', profile.shop_id);
      if (error) throw error;
      toast({
        title: 'Paramètre mis à jour',
        description: checked
          ? 'Les prestataires sans dossier en cours seront masqués dans la barre latérale'
          : 'Tous les prestataires seront affichés dans la barre latérale',
      });
      refetchSettings();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le paramètre',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setEditing(null);
  };

  const openEditDialog = (p: SAVProvider) => {
    setEditing(p);
    setFormData({
      name: p.name,
      contact_name: p.contact_name || '',
      phone: p.phone || '',
      email: p.email || '',
      address: p.address || '',
      specialties: p.specialties || '',
      avg_delay_days: p.avg_delay_days ?? undefined,
      color: p.color || '#8b5cf6',
      notes: p.notes || '',
      is_active: p.is_active,
      show_in_sidebar: p.show_in_sidebar,
      partner_code: '',
    });
    setDialogOpen(true);
  };

  /** Ajoute un prestataire directement depuis l'annuaire professionnel Fixway. */
  const addFromDirectory = async (partner: any) => {
    if (!profile?.shop_id) return;
    try {
      const { error } = await supabase.from('shop_sav_providers').insert({
        shop_id: profile.shop_id,
        name: partner.public_name,
        phone: partner.public_phone || null,
        email: partner.public_email || null,
        address: [partner.postal_code, partner.city].filter(Boolean).join(' ') || null,
        specialties: partner.specialties || null,
        avg_delay_days: partner.avg_delay_days ?? null,
        color: '#8b5cf6',
        is_active: true,
        show_in_sidebar: true,
        display_order: providers.length,
        linked_shop_id: partner.shop_id,
        linked_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
      toast({
        title: 'Partenaire ajouté',
        description: `${partner.public_name} est connecté à son compte Fixway`,
      });
      setDirectoryOpen(false);
      refetch();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const save = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        contact_name: formData.contact_name || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        specialties: formData.specialties || null,
        avg_delay_days: formData.avg_delay_days ?? null,
        color: formData.color || '#8b5cf6',
        notes: formData.notes || null,
        is_active: formData.is_active,
        show_in_sidebar: formData.show_in_sidebar,
      };
      let providerId = editing?.id;
      if (editing) {
        await updateProvider(editing.id, payload);
      } else {
        await createProvider({ ...payload, display_order: providers.length });
        const { data } = await supabase
          .from('shop_sav_providers')
          .select('id')
          .eq('shop_id', profile?.shop_id ?? '')
          .eq('name', formData.name)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        providerId = (data as any)?.id;
      }
      if (formData.partner_code.trim() && providerId) {
        await linkProvider(providerId, formData.partner_code.trim().toUpperCase());
        refetch();
      }
      setDialogOpen(false);
      resetForm();
    } finally {
      setSaving(false);
    }

  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prestataires techniques</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Chargement des prestataires…</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
          Prestataires techniques
          <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setDirectoryOpen(true)}>
            <Search className="w-4 h-4 mr-2" />
            Rechercher un partenaire
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>

            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau prestataire
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>
                  {editing ? 'Modifier le prestataire' : 'Nouveau prestataire'}
                </DialogTitle>
                <DialogDescription>
                  Configurez l'identité, l'activité et les spécialités du prestataire. Ces informations restent internes.
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                <div>
                  <Label htmlFor="provider_name">Nom</Label>
                  <Input
                    id="provider_name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ex: Atelier Micro-Soudure Pro"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="provider_contact">Contact</Label>
                    <Input
                      id="provider_contact"
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      placeholder="ex: Jean Dupont"
                    />
                  </div>
                  <div>
                    <Label htmlFor="provider_phone">Téléphone</Label>
                    <Input
                      id="provider_phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="ex: 06 12 34 56 78"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="provider_email">Email</Label>
                  <Input
                    id="provider_email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ex: contact@prestataire.fr"
                  />
                </div>

                <div>
                  <Label htmlFor="provider_address">Adresse</Label>
                  <Input
                    id="provider_address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="ex: 12 rue des Ateliers, 75011 Paris"
                  />
                </div>

                <div>
                  <Label htmlFor="provider_specialties">Spécialités</Label>
                  <Input
                    id="provider_specialties"
                    value={formData.specialties}
                    onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                    placeholder="ex: Micro-soudure, récupération de données"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Activités confiées à ce prestataire, séparées par des virgules
                  </p>
                </div>

                <div>
                  <Label htmlFor="provider_delay" className="text-sm font-normal flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Délai moyen de traitement (jours)
                  </Label>
                  <NumberInput
                    id="provider_delay"
                    min="0"
                    max="365"
                    value={formData.avg_delay_days ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      avg_delay_days: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                    })}
                    placeholder="5"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Nombre de jours habituellement nécessaires à ce prestataire
                  </p>
                </div>

                <div>
                  <Label htmlFor="provider_color">Couleur</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="provider_color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-16 h-10"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="#8b5cf6"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="provider_notes">Notes internes</Label>
                  <Textarea
                    id="provider_notes"
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Conditions tarifaires, modalités d'envoi…"
                  />
                </div>

                {!editing?.linked_shop_id && (
                  <div className="p-3 border rounded-lg bg-muted/20 space-y-2">
                    <Label htmlFor="provider_partner_code" className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      Code partenaire Fixway (optionnel)
                    </Label>
                    <Input
                      id="provider_partner_code"
                      value={formData.partner_code}
                      onChange={(e) => setFormData({ ...formData, partner_code: e.target.value.toUpperCase() })}
                      placeholder="FW-XXXX-XXXX"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Si ce prestataire utilise Fixway, saisissez le code qu'il vous a communiqué : les dossiers
                      que vous lui confiez apparaîtront automatiquement dans son logiciel.
                    </p>
                  </div>
                )}



                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Options avancées</h4>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-normal flex items-center gap-2">
                        <Sidebar className="w-4 h-4" />
                        Afficher dans la barre latérale
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Ce prestataire apparaît avec le compteur des dossiers en cours chez lui
                      </p>
                    </div>
                    <Switch
                      checked={formData.show_in_sidebar}
                      onCheckedChange={(checked) => setFormData({ ...formData, show_in_sidebar: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-normal flex items-center gap-2">
                        <Power className="w-4 h-4" />
                        Prestataire actif
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Un prestataire inactif ne peut plus être choisi lors de l'attribution d'un SAV
                      </p>
                    </div>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-shrink-0 pt-4 border-t">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={save} disabled={saving || !formData.name.trim()}>
                  {editing ? 'Modifier' : 'Créer'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </CardTitle>

        <CardDescription>
          Gérez les entreprises tierces (micro-soudure, broker…) auxquelles vous pouvez confier un dossier SAV
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="mb-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Sidebar className="w-4 h-4" />
                Masquer les prestataires vides
              </Label>
              <p className="text-xs text-muted-foreground">
                N'afficher dans la barre latérale que les prestataires ayant au moins 1 SAV en cours
              </p>
            </div>
            <Switch
              checked={settings?.hide_empty_sav_providers ?? false}
              onCheckedChange={handleToggleHideEmpty}
            />
          </div>
        </div>

        <div className="space-y-4">
          {providers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Aucun prestataire configuré</p>
            </div>
          ) : (
            providers.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3 flex-1">
                  <div
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: p.color }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{p.name}</span>
                      {!p.is_active && (
                        <Badge variant="secondary" className="text-xs">Inactif</Badge>
                      )}
                    </div>
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2">
                      {p.contact_name && (
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span>{p.contact_name}</span>
                        </div>
                      )}
                      {p.phone && (
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span>{p.phone}</span>
                        </div>
                      )}
                      {p.email && (
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          <span>{p.email}</span>
                        </div>
                      )}
                      {p.address && (
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span>{p.address}</span>
                        </div>
                      )}
                      {p.specialties && (
                        <div className="flex items-center space-x-1 text-xs">
                          <Wrench className="w-3 h-3" />
                          <span className="text-green-600">{p.specialties}</span>
                        </div>
                      )}
                      {p.avg_delay_days != null && (
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{p.avg_delay_days}j moyen</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1 text-xs">
                        <Sidebar className="w-3 h-3" />
                        <span className={p.show_in_sidebar ? 'text-green-600' : 'text-muted-foreground'}>
                          {p.show_in_sidebar ? 'Visible sidebar' : 'Masqué sidebar'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs">
                        <Power className="w-3 h-3" />
                        <span className={p.is_active ? 'text-green-600' : 'text-red-600'}>
                          {p.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(p)}>
                    <Edit className="w-4 h-4" />
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer le prestataire</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir supprimer « {p.name} » ? Si des dossiers SAV lui sont
                          encore rattachés, la suppression sera refusée : désactivez-le à la place.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            try { await deleteProvider(p.id); } catch {}
                          }}
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 mt-0.5 text-muted-foreground" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Prestataires techniques :</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Cette information reste interne : elle n'est jamais visible par le client</li>
                <li>Un prestataire rattaché à des dossiers ne peut pas être supprimé : désactivez-le</li>
                <li>Les couleurs sont utilisées dans l'interface pour identifier visuellement les prestataires</li>
                <li>Les prestataires visibles en barre latérale affichent le nombre de dossiers en cours chez eux</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
