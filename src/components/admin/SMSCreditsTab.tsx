import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageSquare, Plus, RotateCcw, History, RefreshCw, TrendingUp, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Shop {
  id: string;
  name: string;
  subscription_tier: string;
  sms_credits_allocated: number;
  sms_credits_used: number;
  admin_added_sms_credits?: number;
}

interface AdminCreditsHistoryEntry {
  id: string;
  credits_added: number;
  admin_name: string | null;
  note: string | null;
  created_at: string;
}

interface RealTimeCredits {
  monthly_allocated: number;
  monthly_used: number;
  monthly_remaining: number;
  purchased_total: number;
  admin_added: number;
  purchasable_used: number;
  purchasable_remaining: number;
  total_available: number;
  total_remaining: number;
}

interface SMSCreditsTabProps {
  shop: Shop;
  loading: boolean;
  smsCreditsToAdd: string;
  setSmsCreditsToAdd: (value: string) => void;
  handleAddSmsCredits: () => Promise<void>;
  handleResetSmsUsage: () => Promise<void>;
  onUpdate: () => void;
}

export function SMSCreditsTab({
  shop,
  loading,
  smsCreditsToAdd,
  setSmsCreditsToAdd,
  handleAddSmsCredits,
  handleResetSmsUsage,
  onUpdate
}: SMSCreditsTabProps) {
  const [history, setHistory] = useState<AdminCreditsHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [realTimeCredits, setRealTimeCredits] = useState<RealTimeCredits | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [noteForCredits, setNoteForCredits] = useState('');
  const { toast } = useToast();

  // Fetch credits history
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_sms_credits_history')
        .select('*')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Fetch real-time credits
  const fetchRealTimeCredits = async () => {
    setCreditsLoading(true);
    try {
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('sms_credits_allocated, monthly_sms_used, admin_added_sms_credits, purchased_sms_credits')
        .eq('id', shop.id)
        .single();

      if (shopError) throw shopError;

      // Get purchased packages
      const { data: packages } = await supabase
        .from('sms_package_purchases')
        .select('sms_count')
        .eq('shop_id', shop.id)
        .eq('status', 'completed');

      const purchased_total = packages?.reduce((sum, pkg) => sum + pkg.sms_count, 0) || 0;
      const admin_added = shopData.admin_added_sms_credits || 0;
      const monthly_allocated = shopData.sms_credits_allocated || 0;
      const monthly_used = shopData.monthly_sms_used || 0;
      const purchasable_used = shopData.purchased_sms_credits || 0;

      const monthly_remaining = Math.max(0, monthly_allocated - monthly_used);
      const purchasable_total = purchased_total + admin_added;
      const purchasable_remaining = Math.max(0, purchasable_total - purchasable_used);
      
      const total_available = monthly_allocated + purchasable_total;
      const total_remaining = monthly_remaining + purchasable_remaining;

      setRealTimeCredits({
        monthly_allocated,
        monthly_used,
        monthly_remaining,
        purchased_total,
        admin_added,
        purchasable_used,
        purchasable_remaining,
        total_available,
        total_remaining
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des crédits:', error);
    } finally {
      setCreditsLoading(false);
    }
  };

  // Enhanced add credits with history
  const handleAddCreditsWithHistory = async () => {
    const creditsToAdd = parseInt(smsCreditsToAdd);
    if (isNaN(creditsToAdd) || creditsToAdd <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un nombre valide de crédits",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user?.id)
        .single();

      const adminName = profile 
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Super Admin'
        : 'Super Admin';

      // Insert into history
      const { error: historyError } = await supabase
        .from('admin_sms_credits_history')
        .insert({
          shop_id: shop.id,
          credits_added: creditsToAdd,
          admin_user_id: user?.id,
          admin_name: adminName,
          note: noteForCredits || null
        });

      if (historyError) {
        console.error('Erreur lors de l\'enregistrement dans l\'historique:', historyError);
      }

      // Add credits (using the parent function)
      await handleAddSmsCredits();

      // Reset note and refresh
      setNoteForCredits('');
      await fetchHistory();
      await fetchRealTimeCredits();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  useEffect(() => {
    if (shop?.id) {
      fetchHistory();
      fetchRealTimeCredits();
    }
  }, [shop?.id]);

  const getTierLabel = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'enterprise': return 'Enterprise';
      case 'premium': return 'Premium';
      case 'free': return 'Gratuit';
      default: return tier || 'N/A';
    }
  };

  return (
    <div className="space-y-4">
      {/* Real-time credits counter */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Crédits SMS en temps réel
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchRealTimeCredits}
              disabled={creditsLoading}
            >
              <RefreshCw className={`h-4 w-4 ${creditsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {realTimeCredits ? (
            <div className="space-y-4">
              {/* Main counter */}
              <div className="text-center p-4 bg-background rounded-lg border">
                <div className="text-4xl font-bold text-primary">
                  {realTimeCredits.total_remaining}
                </div>
                <div className="text-sm text-muted-foreground">
                  crédits SMS disponibles sur {realTimeCredits.total_available}
                </div>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-background rounded-lg border">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    Plan ({getTierLabel(shop.subscription_tier)})
                  </div>
                  <div className="text-xl font-semibold text-green-600">
                    {realTimeCredits.monthly_remaining}/{realTimeCredits.monthly_allocated}
                  </div>
                  <div className="text-xs text-muted-foreground">restants ce mois</div>
                </div>

                <div className="p-3 bg-background rounded-lg border">
                  <div className="text-xs text-muted-foreground">Achetés par client</div>
                  <div className="text-xl font-semibold text-blue-600">
                    {realTimeCredits.purchased_total}
                  </div>
                  <div className="text-xs text-muted-foreground">crédits</div>
                </div>

                <div className="p-3 bg-background rounded-lg border">
                  <div className="text-xs text-muted-foreground">Ajoutés par admin</div>
                  <div className="text-xl font-semibold text-purple-600">
                    {realTimeCredits.admin_added}
                  </div>
                  <div className="text-xs text-muted-foreground">crédits bonus</div>
                </div>

                <div className="p-3 bg-background rounded-lg border">
                  <div className="text-xs text-muted-foreground">Épuisables restants</div>
                  <div className="text-xl font-semibold text-orange-600">
                    {realTimeCredits.purchasable_remaining}
                  </div>
                  <div className="text-xs text-muted-foreground">sur {realTimeCredits.purchased_total + realTimeCredits.admin_added}</div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                💡 <strong>Crédits du plan ({realTimeCredits.monthly_allocated}/mois)</strong> : se réinitialisent chaque mois. 
                <strong> Crédits épuisables</strong> : achetés par le client ou ajoutés par l'admin, ne se réinitialisent pas.
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Chargement des crédits...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add credits section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Ajouter des crédits SMS manuellement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre de crédits à ajouter</Label>
              <Input
                type="number"
                placeholder="Ex: 50"
                value={smsCreditsToAdd}
                onChange={(e) => setSmsCreditsToAdd(e.target.value)}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>Note (optionnel)</Label>
              <Input
                placeholder="Ex: Offert pour problème technique"
                value={noteForCredits}
                onChange={(e) => setNoteForCredits(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleAddCreditsWithHistory} 
              disabled={loading || !smsCreditsToAdd}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter les crédits
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                await handleResetSmsUsage();
                await fetchRealTimeCredits();
              }}
              disabled={loading}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              RAZ utilisation
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Ces crédits sont ajoutés comme "crédits bonus" et ne se réinitialisent pas mensuellement.
          </div>
        </CardContent>
      </Card>

      {/* History section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historique des crédits ajoutés manuellement
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchHistory}
              disabled={historyLoading}
            >
              <RefreshCw className={`h-4 w-4 ${historyLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="text-center py-4 text-muted-foreground">
              Chargement de l'historique...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucun crédit ajouté manuellement pour ce magasin</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Crédits</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm">
                      {format(new Date(entry.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">
                        +{entry.credits_added}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.admin_name || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {entry.note || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}