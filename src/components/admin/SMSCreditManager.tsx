import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageSquare, Plus, RotateCcw, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Shop {
  id: string;
  name: string;
  sms_credits_allocated: number;
  sms_credits_used: number;
  subscription_tier: string;
  purchased_sms: number;
}

interface SMSCreditManagerProps {
  shops: Shop[];
  onUpdate: () => void;
}

export function SMSCreditManager({ shops, onUpdate }: SMSCreditManagerProps) {
  const [creditsToAdd, setCreditsToAdd] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  const handleAddCredits = async (shopId: string) => {
    const credits = creditsToAdd[shopId];
    if (!credits || credits <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un nombre de crédits valide",
        variant: "destructive",
      });
      return;
    }

    setLoading(prev => ({ ...prev, [shopId]: true }));

    try {
      // Récupérer les crédits actuels
      const { data: currentShop, error: fetchError } = await supabase
        .from('shops')
        .select('admin_added_sms_credits')
        .eq('id', shopId)
        .single();

      if (fetchError) throw fetchError;

      // Ajouter aux crédits ajoutés par admin (épuisables)
      const { error } = await supabase
        .from('shops')
        .update({
          admin_added_sms_credits: (currentShop.admin_added_sms_credits || 0) + credits
        })
        .eq('id', shopId);

      if (error) throw error;

      toast({
        title: "Crédits ajoutés",
        description: `${credits} crédits SMS épuisables ajoutés avec succès`,
      });

      setCreditsToAdd(prev => ({ ...prev, [shopId]: 0 }));
      onUpdate();
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout des crédits:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter les crédits SMS",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, [shopId]: false }));
    }
  };

  const handleResetUsage = async (shopId: string) => {
    setLoading(prev => ({ ...prev, [shopId]: true }));

    try {
      const { error } = await supabase
        .from('shops')
        .update({ 
          sms_credits_used: 0,
          monthly_sms_used: 0,
          purchased_sms_credits: 0
        })
        .eq('id', shopId);

      if (error) throw error;

      toast({
        title: "Utilisation réinitialisée",
        description: "L'utilisation des crédits SMS a été remise à zéro",
      });

      onUpdate();
    } catch (error: any) {
      console.error('Erreur lors de la réinitialisation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de réinitialiser l'utilisation",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, [shopId]: false }));
    }
  };

  const getUsageColor = (used: number, allocated: number) => {
    const percentage = (used / allocated) * 100;
    if (percentage >= 90) return 'destructive';
    if (percentage >= 70) return 'secondary';
    return 'default';
  };

  const getPlanBadgeColor = (tier: string) => {
    switch (tier) {
      case 'enterprise': return 'default';
      case 'premium': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Répartition Crédits SMS - Magasins du Réseau
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Statistiques globales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{shops.length}</div>
                <p className="text-sm text-muted-foreground">Boutiques actives</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {shops.reduce((sum, shop) => sum + shop.sms_credits_allocated, 0)}
                </div>
                <p className="text-sm text-muted-foreground">Crédits alloués (total)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {shops.reduce((sum, shop) => sum + shop.sms_credits_used, 0)}
                </div>
                <p className="text-sm text-muted-foreground">Crédits utilisés (total)</p>
              </CardContent>
            </Card>
          </div>

          {/* Table des boutiques */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Boutique</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Crédits Alloués</TableHead>
                <TableHead>SMS Achetés</TableHead>
                <TableHead>Total Disponible</TableHead>
                <TableHead>Crédits Utilisés</TableHead>
                <TableHead>Restants</TableHead>
                <TableHead>Ajouter Crédits</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shops.map((shop) => {
                const totalAvailable = shop.sms_credits_allocated + shop.purchased_sms;
                const remainingCredits = totalAvailable - shop.sms_credits_used;
                const usagePercentage = totalAvailable > 0 
                  ? Math.round((shop.sms_credits_used / totalAvailable) * 100)
                  : 0;

                return (
                  <TableRow key={shop.id}>
                    <TableCell className="font-medium">{shop.name}</TableCell>
                    <TableCell>
                      <Badge variant={getPlanBadgeColor(shop.subscription_tier)}>
                        {shop.subscription_tier.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{shop.sms_credits_allocated}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{shop.purchased_sms}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{totalAvailable}</TableCell>
                    <TableCell>{shop.sms_credits_used}</TableCell>
                    <TableCell>
                      <Badge variant={remainingCredits < 0 ? "destructive" : 
                                   remainingCredits < 5 ? "secondary" : "default"}>
                        {remainingCredits}
                      </Badge>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({usagePercentage}%)
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="0"
                          value={creditsToAdd[shop.id] || ''}
                          onChange={(e) => setCreditsToAdd(prev => ({ 
                            ...prev, 
                            [shop.id]: parseInt(e.target.value) || 0 
                          }))}
                          className="w-20"
                          min="0"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddCredits(shop.id)}
                          disabled={loading[shop.id] || !creditsToAdd[shop.id]}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetUsage(shop.id)}
                        disabled={loading[shop.id]}
                        title="Remettre à zéro l'utilisation mensuelle"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {shops.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucune boutique trouvée
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}