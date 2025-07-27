import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
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

interface Shop {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

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
  const [shop, setShop] = useState<Shop | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'technician' | 'super_admin' | 'shop_admin'>('technician');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch shop data
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('*')
        .single();

      if (shopError) throw shopError;
      setShop(shopData);

      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Find current user profile
      const currentProfile = profilesData?.find(p => p.user_id === user?.id);
      setCurrentUserProfile(currentProfile || null);

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

  const updateShop = async (updatedShop: Partial<Shop>) => {
    if (!shop) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('shops')
        .update(updatedShop)
        .eq('id', shop.id);

      if (error) throw error;

      setShop({ ...shop, ...updatedShop });
      toast({
        title: "Succès",
        description: "Informations du magasin mises à jour",
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

  const updateProfile = async (updatedProfile: Partial<Profile>) => {
    if (!currentUserProfile) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updatedProfile)
        .eq('id', currentUserProfile.id);

      if (error) throw error;

      setCurrentUserProfile({ ...currentUserProfile, ...updatedProfile });
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

      setProfiles(profiles.filter(p => p.id !== profileId));
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

  const isAdmin = currentUserProfile?.role === 'admin';

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Paramètres</h1>
        </div>
        <div className="text-center py-8">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <SettingsIcon className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Paramètres</h1>
      </div>

      <Tabs defaultValue="shop" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="shop" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Magasin
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Mon Profil
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
                  onChange={(e) => setShop(shop ? { ...shop, name: e.target.value } : null)}
                  disabled={!isAdmin}
                />
              </div>
              <div>
                <Label htmlFor="shop-email">Email</Label>
                <Input
                  id="shop-email"
                  type="email"
                  value={shop?.email || ''}
                  onChange={(e) => setShop(shop ? { ...shop, email: e.target.value } : null)}
                  disabled={!isAdmin}
                />
              </div>
              <div>
                <Label htmlFor="shop-phone">Téléphone</Label>
                <Input
                  id="shop-phone"
                  value={shop?.phone || ''}
                  onChange={(e) => setShop(shop ? { ...shop, phone: e.target.value } : null)}
                  disabled={!isAdmin}
                />
              </div>
              <div>
                <Label htmlFor="shop-address">Adresse</Label>
                <Textarea
                  id="shop-address"
                  value={shop?.address || ''}
                  onChange={(e) => setShop(shop ? { ...shop, address: e.target.value } : null)}
                  disabled={!isAdmin}
                />
              </div>
              {isAdmin && (
                <Button onClick={() => updateShop(shop!)} disabled={saving}>
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
              )}
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
                    value={currentUserProfile?.first_name || ''}
                    onChange={(e) => setCurrentUserProfile(
                      currentUserProfile ? { ...currentUserProfile, first_name: e.target.value } : null
                    )}
                  />
                </div>
                <div>
                  <Label htmlFor="last-name">Nom</Label>
                  <Input
                    id="last-name"
                    value={currentUserProfile?.last_name || ''}
                    onChange={(e) => setCurrentUserProfile(
                      currentUserProfile ? { ...currentUserProfile, last_name: e.target.value } : null
                    )}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={currentUserProfile?.phone || ''}
                  onChange={(e) => setCurrentUserProfile(
                    currentUserProfile ? { ...currentUserProfile, phone: e.target.value } : null
                  )}
                />
              </div>
              <Button onClick={() => updateProfile(currentUserProfile!)} disabled={saving}>
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
  );
}