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
  Settings as SettingsIcon 
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

  useEffect(() => {
    if (user) {
      fetchProfiles();
    }
  }, [user]);

  const fetchProfiles = async () => {
    try {
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
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

  const updateShop = async (updatedShop: Partial<any>) => {
    setSaving(true);
    try {
      await updateShopData(updatedShop);
    } finally {
      setSaving(false);
    }
  };

  const updateProfile = async (updatedProfile: Partial<Profile>) => {
    if (!profile) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updatedProfile)
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

  const isAdmin = profile?.role === 'admin';

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="md:ml-64 px-6 pb-6">
          <div className="flex items-center gap-2 mb-6">
            <SettingsIcon className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Paramètres</h1>
          </div>
          <div className="text-center py-8">Chargement...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="md:ml-64 px-6 pb-6">
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

        <TabsContent value="shop">
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
                  value={shop?.name || ''}
                  disabled={!isAdmin}
                />
              </div>
              <div>
                <Label htmlFor="shop-email">Email</Label>
                <Input
                  id="shop-email"
                  type="email"
                  value={shop?.email || ''}
                  disabled={!isAdmin}
                />
              </div>
              <div>
                <Label htmlFor="shop-phone">Téléphone</Label>
                <Input
                  id="shop-phone"
                  value={shop?.phone || ''}
                  disabled={!isAdmin}
                />
              </div>
              <div>
                <Label htmlFor="shop-address">Adresse</Label>
                <Textarea
                  id="shop-address"
                  value={shop?.address || ''}
                  disabled={!isAdmin}
                />
              </div>
              {isAdmin && (
                <Button 
                  onClick={async () => {
                    setSaving(true);
                    try {
                      const formData = new FormData();
                      const form = document.querySelector('form') as HTMLFormElement;
                      const inputs = form?.querySelectorAll('input, textarea');
                      const shopData: any = {};
                      
                      inputs?.forEach((input: any) => {
                        if (input.id === 'shop-name') shopData.name = input.value;
                        if (input.id === 'shop-email') shopData.email = input.value;
                        if (input.id === 'shop-phone') shopData.phone = input.value;
                        if (input.id === 'shop-address') shopData.address = input.value;
                      });
                      
                      await updateShop(shopData);
                    } finally {
                      setSaving(false);
                    }
                  }} 
                  disabled={saving}
                >
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
              )}
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
                    value={profile?.first_name || ''}
                    onChange={(e) => profile && updateProfile({ first_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="last-name">Nom</Label>
                  <Input
                    id="last-name"
                    value={profile?.last_name || ''}
                    onChange={(e) => profile && updateProfile({ last_name: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={profile?.phone || ''}
                  onChange={(e) => profile && updateProfile({ phone: e.target.value })}
                />
              </div>
              <Button onClick={() => profile && updateProfile(profile)} disabled={saving}>
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
                        <Button onClick={() => {
                          // TODO: Implement user invitation logic
                          toast({
                            title: "Fonctionnalité à venir",
                            description: "L'invitation d'utilisateurs sera bientôt disponible",
                          });
                          setIsInviteDialogOpen(false);
                        }}>
                          Envoyer l'invitation
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
  );
}