import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProfileSetupProps {
  onComplete: () => void;
}

export function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    shopName: '',
    shopEmail: '',
    shopPhone: '',
    shopAddress: '',
    inviteCode: ''
  });

  const handleCreateShop = async () => {
    if (!user || !formData.firstName || !formData.lastName || !formData.shopName) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Créer le magasin
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .insert({
          name: formData.shopName,
          email: formData.shopEmail || user.email,
          phone: formData.shopPhone,
          address: formData.shopAddress,
        })
        .select()
        .single();

      if (shopError) throw shopError;

      // Créer le profil avec le rôle admin
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          shop_id: shop.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          role: 'admin'
        });

      if (profileError) throw profileError;

      toast({
        title: "Succès",
        description: "Votre magasin et profil ont été créés avec succès !",
      });

      onComplete();
    } catch (error: any) {
      console.error('Error creating shop and profile:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le magasin",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinShop = async () => {
    if (!user || !formData.firstName || !formData.lastName || !formData.inviteCode) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Chercher le magasin par son code d'invitation OU par son slug
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .select('id')
        .or(`invite_code.ilike.${formData.inviteCode},slug.ilike.${formData.inviteCode}`)
        .maybeSingle();

      if (shopError || !shop) {
        throw new Error("Code d'invitation invalide");
      }

      // Créer le profil
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          shop_id: shop.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          role: 'technician'
        });

      if (profileError) throw profileError;

      toast({
        title: "Succès",
        description: "Vous avez rejoint le magasin avec succès !",
      });

      onComplete();
    } catch (error: any) {
      console.error('Error joining shop:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de rejoindre le magasin",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Configuration du profil</CardTitle>
          <CardDescription>
            Complétez votre profil pour accéder à la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Votre prénom"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Votre nom"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Votre numéro de téléphone"
              />
            </div>
          </div>

          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Créer un magasin</TabsTrigger>
              <TabsTrigger value="join">Rejoindre un magasin</TabsTrigger>
            </TabsList>
            
            <TabsContent value="create" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shopName">Nom du magasin *</Label>
                <Input
                  id="shopName"
                  value={formData.shopName}
                  onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                  placeholder="Nom de votre magasin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shopEmail">Email du magasin</Label>
                <Input
                  id="shopEmail"
                  type="email"
                  value={formData.shopEmail}
                  onChange={(e) => setFormData({ ...formData, shopEmail: e.target.value })}
                  placeholder="contact@monmagasin.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shopPhone">Téléphone du magasin</Label>
                <Input
                  id="shopPhone"
                  value={formData.shopPhone}
                  onChange={(e) => setFormData({ ...formData, shopPhone: e.target.value })}
                  placeholder="01 23 45 67 89"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shopAddress">Adresse du magasin</Label>
                <Input
                  id="shopAddress"
                  value={formData.shopAddress}
                  onChange={(e) => setFormData({ ...formData, shopAddress: e.target.value })}
                  placeholder="123 Rue de la République, 75001 Paris"
                />
              </div>
              <Button 
                onClick={handleCreateShop} 
                className="w-full" 
                disabled={loading}
              >
                {loading ? "Création..." : "Créer mon magasin"}
              </Button>
            </TabsContent>
            
            <TabsContent value="join" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Code d'invitation *</Label>
                <Input
                  id="inviteCode"
                  value={formData.inviteCode}
                  onChange={(e) => setFormData({ ...formData, inviteCode: e.target.value })}
                  placeholder="Code fourni par votre responsable"
                />
              </div>
              <Button 
                onClick={handleJoinShop} 
                className="w-full" 
                disabled={loading}
              >
                {loading ? "Connexion..." : "Rejoindre le magasin"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}