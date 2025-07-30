import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useShop } from '@/hooks/useShop';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { 
  Store, 
  Users, 
  Mail, 
  Phone, 
  MapPin,
  UserPlus,
  Trash2,
  Crown,
  Settings as SettingsIcon,
  Copy,
  Key,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: 'admin' | 'technician' | 'super_admin' | 'shop_admin';
  created_at: string;
}

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { shop, updateShop: updateShopData } = useShop();
  const { profile, refetch: refetchProfile } = useProfile();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'technician' | 'super_admin' | 'shop_admin'>('technician');
  const [logoUploading, setLogoUploading] = useState(false);
  
  // Local state for form data
  const [shopForm, setShopForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    logo_url: '',
    max_sav_processing_days_client: 7,
    max_sav_processing_days_internal: 5
  });
  
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone: ''
  });

  useEffect(() => {
    if (user) {
      fetchProfiles();
    }
  }, [user]);

  useEffect(() => {
    if (shop) {
      setShopForm({
        name: shop.name || '',
        email: shop.email || '',
        phone: shop.phone || '',
        address: shop.address || '',
        logo_url: shop.logo_url || '',
        max_sav_processing_days_client: shop.max_sav_processing_days_client || 7,
        max_sav_processing_days_internal: shop.max_sav_processing_days_internal || 5
      });
    }
  }, [shop]);

  useEffect(() => {
    if (profile) {
      setProfileForm({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || ''
      });
    }
  }, [profile]);

  const fetchProfiles = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'super_admin') // Filtrer les super admins
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShop = async () => {
    setSaving(true);
    try {
      await updateShopData(shopForm);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(profileForm)
        .eq('id', profile.id);

      if (error) throw error;

      await refetchProfile();
      toast({
        title: "Succès",
        description: "Profil mis à jour",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);

      if (error) throw error;

      fetchProfiles();
      toast({
        title: "Succès",
        description: "Utilisateur supprimé",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const copyShopCode = () => {
    if (!shop?.invite_code) return;
    
    navigator.clipboard.writeText(shop.invite_code);
    toast({
      title: "Succès",
      description: "Code magasin copié dans le presse-papiers",
    });
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !shop) return;

    setLogoUploading(true);
    try {
      // Créer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${shop.id}/logo.${fileExt}`;

      // Supprimer l'ancien logo s'il existe
      if (shop.logo_url) {
        const oldPath = shop.logo_url.split('/').slice(-2).join('/');
        await supabase.storage.from('shop-logos').remove([oldPath]);
      }

      // Uploader le nouveau logo
      const { error: uploadError } = await supabase.storage
        .from('shop-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Récupérer l'URL publique
      const { data } = supabase.storage.from('shop-logos').getPublicUrl(fileName);
      
      // Mettre à jour la base de données
      await updateShopData({ logo_url: data.publicUrl });
      
      setShopForm(prev => ({ ...prev, logo_url: data.publicUrl }));

      toast({
        title: "Succès",
        description: "Logo mis à jour avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLogoUploading(false);
    }
  };

  const isAdmin = profile?.role === 'admin';

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex h-screen">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center gap-2 mb-6">
                <SettingsIcon className="h-6 w-6" />
                <h1 className="text-2xl font-bold">Paramètres</h1>
              </div>
              <div className="text-center py-8">Chargement...</div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-2 mb-6">
                <SettingsIcon className="h-6 w-6" />
                <h1 className="text-2xl font-bold">Paramètres</h1>
              </div>

          <Tabs defaultValue="shop" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="shop" className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                Magasin
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Mon Profil
              </TabsTrigger>
              <TabsTrigger value="sms" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Crédits SMS
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Utilisateurs
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="shop" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Informations du Magasin
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="shop-name">Nom du magasin</Label>
                    <Input
                      id="shop-name"
                      value={shopForm.name}
                      onChange={(e) => setShopForm({...shopForm, name: e.target.value})}
                      disabled={!isAdmin}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="shop-logo">Logo du magasin</Label>
                    <div className="flex items-center gap-4">
                      {shopForm.logo_url && (
                        <div className="flex items-center gap-2">
                          <img 
                            src={shopForm.logo_url} 
                            alt="Logo du magasin" 
                            className="h-12 w-12 object-contain border rounded"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <Input
                          id="shop-logo"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={!isAdmin || logoUploading}
                          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />
                        {logoUploading && (
                          <p className="text-sm text-muted-foreground mt-1">Upload en cours...</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          Le logo sera utilisé dans les PDF et les liens de suivi client
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="shop-email">Email</Label>
                    <Input
                      id="shop-email"
                      type="email"
                      value={shopForm.email}
                      onChange={(e) => setShopForm({...shopForm, email: e.target.value})}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div>
                    <Label htmlFor="shop-phone">Téléphone</Label>
                    <Input
                      id="shop-phone"
                      value={shopForm.phone}
                      onChange={(e) => setShopForm({...shopForm, phone: e.target.value})}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div>
                    <Label htmlFor="shop-address">Adresse</Label>
                    <Textarea
                      id="shop-address"
                      value={shopForm.address}
                      onChange={(e) => setShopForm({...shopForm, address: e.target.value})}
                      disabled={!isAdmin}
                    />
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-4">Délais de traitement SAV</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="sav-client-delay">SAV Client (jours)</Label>
                        <Input
                          id="sav-client-delay"
                          type="number"
                          min="1"
                          max="30"
                          value={shopForm.max_sav_processing_days_client}
                          onChange={(e) => setShopForm({...shopForm, max_sav_processing_days_client: parseInt(e.target.value) || 7})}
                          disabled={!isAdmin}
                        />
                      </div>
                      <div>
                        <Label htmlFor="sav-internal-delay">SAV Magasin (jours)</Label>
                        <Input
                          id="sav-internal-delay"
                          type="number"
                          min="1"
                          max="30"
                          value={shopForm.max_sav_processing_days_internal}
                          onChange={(e) => setShopForm({...shopForm, max_sav_processing_days_internal: parseInt(e.target.value) || 5})}
                          disabled={!isAdmin}
                        />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Délai maximum pour traiter les dossiers SAV. Les dossiers dépassant ce délai seront mis en surbrillance.
                    </p>
                  </div>

                  {isAdmin && (
                    <Button onClick={handleSaveShop} disabled={saving}>
                      {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Code d'Invitation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Code magasin</h3>
                        <p className="text-sm text-muted-foreground">
                          Partagez ce code pour permettre à d'autres utilisateurs de rejoindre votre magasin
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={copyShopCode}
                        className="flex items-center gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copier
                      </Button>
                    </div>
                    <div className="mt-3 p-3 bg-background border rounded font-mono text-sm text-center text-xl font-bold tracking-wider">
                      {shop?.invite_code || 'Chargement...'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sms">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Gestion des Crédits SMS
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <h3 className="font-medium">Crédits disponibles</h3>
                      <p className="text-sm text-muted-foreground">
                        Nombre de SMS restants pour les notifications clients
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{shop?.sms_credits || 0}</div>
                      <div className="text-sm text-muted-foreground">SMS</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Acheter des crédits SMS</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Cette fonctionnalité sera bientôt disponible. Vous pourrez acheter des crédits SMS pour envoyer des notifications automatiques à vos clients.
                      </p>
                      <Button disabled>
                        Acheter des crédits
                      </Button>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Historique d'utilisation</h4>
                      <p className="text-sm text-muted-foreground">
                        L'historique de vos envois SMS sera affiché ici.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Mon Profil</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first-name">Prénom</Label>
                      <Input
                        id="first-name"
                        value={profileForm.first_name}
                        onChange={(e) => setProfileForm({...profileForm, first_name: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="last-name">Nom</Label>
                      <Input
                        id="last-name"
                        value={profileForm.last_name}
                        onChange={(e) => setProfileForm({...profileForm, last_name: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                    />
                  </div>
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {isAdmin && (
              <TabsContent value="users">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Gestion des Utilisateurs
                      </CardTitle>
                      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4" />
                            Inviter un utilisateur
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Inviter un nouvel utilisateur</DialogTitle>
                            <DialogDescription>
                              Invitez un nouvel utilisateur à rejoindre votre magasin.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="invite-email">Email</Label>
                              <Input
                                id="invite-email"
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="utilisateur@example.com"
                              />
                            </div>
                            <div>
                              <Label htmlFor="invite-role">Rôle</Label>
                              <Select value={inviteRole} onValueChange={(value: 'admin' | 'technician' | 'super_admin' | 'shop_admin') => setInviteRole(value)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="technician">Technicien</SelectItem>
                                  <SelectItem value="admin">Administrateur</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                              Annuler
                            </Button>
                            <Button onClick={async () => {
                              if (!inviteEmail || !shop) return;
                              
                              try {
                                const { data, error } = await supabase.rpc('create_real_user_for_shop', {
                                  p_email: inviteEmail,
                                  p_password: 'motdepasse123', // Mot de passe temporaire
                                  p_first_name: '',
                                  p_last_name: '',
                                  p_phone: '',
                                  p_role: inviteRole,
                                  p_shop_id: shop.id
                                });

                                if (error) throw error;

                                toast({
                                  title: "Succès",
                                  description: "Profil utilisateur créé. L'utilisateur pourra se connecter quand il s'inscrira avec cet email.",
                                });
                                
                                setInviteEmail('');
                                setIsInviteDialogOpen(false);
                                fetchProfiles();
                              } catch (error: any) {
                                toast({
                                  title: "Erreur",
                                  description: error.message,
                                  variant: "destructive",
                                });
                              }
                            }}>
                              Créer le profil
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {profiles.map((profile) => (
                        <div key={profile.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {profile.first_name?.[0]}{profile.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {profile.first_name} {profile.last_name}
                                </span>
                                {profile.role === 'admin' && (
                                  <Crown className="h-4 w-4 text-yellow-500" />
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
                                  {profile.role === 'admin' ? 'Administrateur' : 'Technicien'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {profile.user_id !== user?.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteUser(profile.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}