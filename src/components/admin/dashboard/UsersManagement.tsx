import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Plus,
  Edit,
  Trash2,
  Shield,
  Unlock,
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
  shop_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: 'admin' | 'technician' | 'super_admin' | 'shop_admin';
  created_at: string;
  shop?: {
    name: string;
    email: string;
  };
}

interface Shop {
  id: string;
  name: string;
  email: string;
}

interface UsersManagementProps {
  profiles: Profile[];
  shops: Shop[];
  onUpdate: () => void;
}

export function UsersManagement({ profiles, shops, onUpdate }: UsersManagementProps) {
  const { toast } = useToast();
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'admin' as 'admin' | 'technician' | 'super_admin' | 'shop_admin',
    shop_id: ''
  });

  const createUser = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: {
          action: 'create',
          email: newUser.email,
          password: newUser.password,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          phone: newUser.phone,
          role: newUser.role,
          shop_id: newUser.shop_id
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      onUpdate();
      setIsCreateUserOpen(false);
      setNewUser({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        role: 'admin',
        shop_id: ''
      });
      
      toast({
        title: "Succès",
        description: "Utilisateur créé avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la création de l'utilisateur",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (profileId: string, userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: {
          action: 'delete',
          user_id: userId,
          profile_id: profileId
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      onUpdate();
      
      toast({
        title: "Succès",
        description: "Utilisateur supprimé avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression de l'utilisateur",
        variant: "destructive",
      });
    }
  };

  const changeUserPassword = async () => {
    if (!selectedUserForPassword || !newPassword) return;

    try {
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: {
          action: 'update_password',
          user_id: selectedUserForPassword.user_id,
          new_password: newPassword
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setIsChangePasswordOpen(false);
      setSelectedUserForPassword(null);
      setNewPassword('');
      
      toast({
        title: "Succès",
        description: "Mot de passe modifié avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la modification du mot de passe",
        variant: "destructive",
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Shield className="h-4 w-4 text-red-600" />;
      case 'admin':
      case 'shop_admin':
        return <Shield className="h-4 w-4 text-blue-600" />;
      default:
        return <Users className="h-4 w-4 text-green-600" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'shop_admin':
        return 'Admin Magasin';
      case 'technician':
        return 'Technicien';
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Users className="h-5 w-5" />
              Gestion des Utilisateurs
            </CardTitle>
            <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un utilisateur
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700 text-white">
                <DialogHeader>
                  <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
                  <DialogDescription className="text-slate-300">
                    Créez un compte utilisateur pour un magasin.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="user-first-name" className="text-white">Prénom</Label>
                      <Input
                        id="user-first-name"
                        value={newUser.first_name}
                        onChange={(e) => setNewUser({...newUser, first_name: e.target.value})}
                        className="bg-slate-800 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="user-last-name" className="text-white">Nom</Label>
                      <Input
                        id="user-last-name"
                        value={newUser.last_name}
                        onChange={(e) => setNewUser({...newUser, last_name: e.target.value})}
                        className="bg-slate-800 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="user-email" className="text-white">Email</Label>
                    <Input
                      id="user-email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="user-password" className="text-white">Mot de passe</Label>
                    <Input
                      id="user-password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="user-phone" className="text-white">Téléphone</Label>
                    <Input
                      id="user-phone"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="user-role" className="text-white">Rôle</Label>
                    <Select value={newUser.role} onValueChange={(value: any) => setNewUser({...newUser, role: value})}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="technician">Technicien</SelectItem>
                        <SelectItem value="shop_admin">Admin Magasin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="user-shop" className="text-white">Magasin</Label>
                    <Select value={newUser.shop_id} onValueChange={(value) => setNewUser({...newUser, shop_id: value})}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                        <SelectValue placeholder="Sélectionner un magasin" />
                      </SelectTrigger>
                      <SelectContent>
                        {shops.map((shop) => (
                          <SelectItem key={shop.id} value={shop.id}>
                            {shop.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateUserOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={createUser} className="bg-emerald-600 hover:bg-emerald-700">
                    Créer l'utilisateur
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialog pour changer le mot de passe */}
            <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
              <DialogContent className="bg-slate-900 border-slate-700 text-white">
                <DialogHeader>
                  <DialogTitle>Changer le mot de passe</DialogTitle>
                  <DialogDescription className="text-slate-300">
                    Modifiez le mot de passe de {selectedUserForPassword?.first_name} {selectedUserForPassword?.last_name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="new-password" className="text-white">Nouveau mot de passe</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-slate-800 border-slate-600 text-white"
                      placeholder="Minimum 6 caractères"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsChangePasswordOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={changeUserPassword} className="bg-emerald-600 hover:bg-emerald-700">
                    Changer le mot de passe
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {profiles.map((profile) => (
              <Card key={profile.id} className="bg-white border-slate-200 hover:shadow-md transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(profile.role)}
                          <h3 className="font-semibold text-lg text-slate-900">
                            {profile.first_name} {profile.last_name}
                          </h3>
                        </div>
                        <Badge variant="outline" className="border-blue-600 text-blue-700">
                          {getRoleLabel(profile.role)}
                        </Badge>
                        {profile.shop && (
                          <Badge variant="outline" className="border-emerald-600 text-emerald-700">
                            {profile.shop.name}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="text-slate-700">
                          <span className="font-medium">Email magasin: </span>
                          <span>{profile.shop?.email || 'N/A'}</span>
                        </div>
                        <div className="text-slate-700">
                          <span className="font-medium">Téléphone: </span>
                          <span>{profile.phone || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-slate-300 text-slate-700 hover:bg-slate-100"
                        onClick={() => {
                          setSelectedUserForPassword(profile);
                          setIsChangePasswordOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Mot de passe
                      </Button>
                      {profile.role !== 'super_admin' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => deleteUser(profile.id, profile.user_id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Supprimer
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}