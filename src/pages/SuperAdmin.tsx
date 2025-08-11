import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Store, 
  Users, 
  BarChart3,
  Plus,
  Edit,
  Trash2,
  Crown,
  Shield,
  TrendingUp,
  Activity,
  DollarSign,
  Unlock,
  MessageSquare,
  AlertTriangle,
  Zap,
  Globe,
  HelpCircle,
  Search,
  Palette,
  FileText,
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
import ShopManagementDialog from '@/components/admin/ShopManagementDialog';
import SubscriptionPlansManager from '@/components/admin/SubscriptionPlansManager';
import SupportTicketManager from '@/components/admin/SupportTicketManager';
import { SMSCreditManager } from '@/components/admin/SMSCreditManager';
import { TwilioCreditsManager } from '@/components/admin/TwilioCreditsManager';
import { SEOConfigTab } from '@/components/seo/SEOConfigTab';
import { BrandingManager } from '@/components/admin/BrandingManager';
import { LandingPageManager } from '@/components/admin/LandingPageManager';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

// Fonction pour calculer le revenu des abonnements basé sur les plans
const calculateSubscriptionRevenue = (shops: any[]) => {
  // Prix des plans basés sur les plans d'abonnement créés
  const planPrices = { 'free': 0, 'premium': 29, 'enterprise': 99 };
  
  return shops.reduce((sum, shop) => {
    return sum + (planPrices[shop.subscription_tier as keyof typeof planPrices] || 0);
  }, 0);
};

interface Shop {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  invite_code: string;
  logo_url: string;
  website_enabled: boolean;
  website_title: string;
  website_description: string;
  max_sav_processing_days_client: number;
  max_sav_processing_days_internal: number;
  slug: string;
  subscription_tier: string;
  subscription_plan_id?: string;
  sms_credits_allocated: number;
  sms_credits_used: number;
  active_sav_count: number;
  subscription_menu_visible: boolean;
  created_at: string;
  total_users?: number;
  total_sav_cases?: number;
  pending_cases?: number;
  in_progress_cases?: number;
  ready_cases?: number;
  delivered_cases?: number;
  total_revenue?: number;
  average_case_value?: number;
  is_blocked?: boolean;
}

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

interface SupportTicket {
  id: string;
  shop_id: string;
  created_by: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  shop?: {
    name: string;
    email?: string;
  };
  creator?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

export default function SuperAdmin() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  
  const [shops, setShops] = useState<Shop[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [activeSupportCount, setActiveSupportCount] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isCreateShopOpen, setIsCreateShopOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isEditShopOpen, setIsEditShopOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [isShopManagementOpen, setIsShopManagementOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newShop, setNewShop] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'admin' as 'admin' | 'technician' | 'super_admin' | 'shop_admin',
    shop_id: ''
  });

  useEffect(() => {
    if (!user && !authLoading) {
      window.location.href = '/auth';
      return;
    }
    
    // Protection stricte : seul djondet@gmail.com peut accéder à cette page
    if (user && user.email !== 'djondet@gmail.com') {
      console.warn('Accès non autorisé à la page Super Admin:', user.email);
      toast({
        title: "Accès refusé",
        description: "Vous n'êtes pas autorisé à accéder à cette page.",
        variant: "destructive",
      });
      window.location.href = '/';
      return;
    }
    
    if (user && user.email === 'djondet@gmail.com') {
      fetchData();
    }
  }, [user, authLoading]);

  const fetchSupportTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          shop:shops(name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setSupportTickets((data || []) as SupportTicket[]);
      setActiveSupportCount((data || []).filter(ticket => ticket.status === 'open' || ticket.status === 'in_progress').length);
    } catch (error: any) {
      console.error('Error fetching support tickets:', error);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch shops
      const { data: shopsData, error: shopsError } = await supabase
        .from('shops')
        .select('*')
        .order('created_at', { ascending: false });

      if (shopsError) throw shopsError;

      // Fetch profiles count for each shop
      const { data: profilesCount, error: profilesCountError } = await supabase
        .from('profiles')
        .select('shop_id')
        .not('shop_id', 'is', null);

      if (profilesCountError) throw profilesCountError;

      // Fetch SAV cases for statistics
      const { data: savCasesData, error: savCasesError } = await supabase
        .from('sav_cases')
        .select('shop_id, status, total_cost, sav_type');

      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select('shop_id, status, total_amount');

      if (savCasesError) throw savCasesError;
      if (quotesError) throw quotesError;

      // Process shop statistics
      const shopsWithStats = shopsData?.map(shop => {
        const shopProfiles = profilesCount?.filter(p => p.shop_id === shop.id) || [];
        const shopSavCases = savCasesData?.filter(sc => sc.shop_id === shop.id) || [];
        
        return {
          ...shop,
          total_users: shopProfiles.length,
          total_sav_cases: shopSavCases.length,
          pending_cases: shopSavCases.filter(c => c.status === 'pending').length,
          in_progress_cases: shopSavCases.filter(c => c.status === 'in_progress').length,
          ready_cases: shopSavCases.filter(c => c.status === 'ready').length,
          delivered_cases: shopSavCases.filter(c => c.status === 'delivered').length,
          total_revenue: shopSavCases.filter(c => c.sav_type !== 'internal').reduce((sum, c) => sum + (c.total_cost || 0), 0),
          average_case_value: shopSavCases.length > 0 
            ? shopSavCases.filter(c => c.sav_type !== 'internal').reduce((sum, c) => sum + (c.total_cost || 0), 0) / shopSavCases.filter(c => c.sav_type !== 'internal').length
            : 0
        };
      }) || [];

      setShops(shopsWithStats);

      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          shops!inner(name, email)
        `)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      
      // Transform the data to match expected format
      const transformedProfiles = profilesData?.map(profile => ({
        ...profile,
        shop: profile.shops ? { name: profile.shops.name, email: profile.shops.email } : undefined
      })) || [];
      
      setProfiles(transformedProfiles);

      // Fetch support tickets
      await fetchSupportTickets();

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erreur",
        description: `Impossible de charger les données: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter shops based on search term
  const filteredShops = shops.filter(shop => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    // Search in shop name
    if (shop.name.toLowerCase().includes(searchLower)) return true;
    
    // Search in address (for postal code)
    if (shop.address?.toLowerCase().includes(searchLower)) return true;
    
    // Search in email
    if (shop.email?.toLowerCase().includes(searchLower)) return true;
    
    // Search in admin names (we need to fetch profile data for this)
    // For now, we'll search in the shop email which often contains admin info
    return false;
  });

  const createShop = async () => {
    try {
      const { data, error } = await supabase
        .from('shops')
        .insert([newShop])
        .select()
        .single();

      if (error) throw error;

      setShops([...shops, data]);
      setIsCreateShopOpen(false);
      setNewShop({ name: '', email: '', phone: '', address: '' });
      
      toast({
        title: "Succès",
        description: "Magasin créé avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const editShop = (shop: Shop) => {
    setEditingShop(shop);
    setNewShop({
      name: shop.name,
      email: shop.email || '',
      phone: shop.phone || '',
      address: shop.address || ''
    });
    setIsEditShopOpen(true);
  };

  const openShopManagement = (shop: Shop) => {
    setSelectedShop(shop);
    setIsShopManagementOpen(true);
  };

  const updateShop = async () => {
    if (!editingShop) return;
    
    try {
      const { data, error } = await supabase
        .from('shops')
        .update(newShop)
        .eq('id', editingShop.id)
        .select()
        .single();

      if (error) throw error;

      setShops(shops.map(shop => shop.id === editingShop.id ? { ...shop, ...data } : shop));
      setIsEditShopOpen(false);
      setEditingShop(null);
      setNewShop({ name: '', email: '', phone: '', address: '' });
      
      toast({
        title: "Succès",
        description: "Magasin mis à jour avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteShop = async (shopId: string) => {
    try {
      console.log('Starting shop deletion for ID:', shopId);
      
      // D'abord récupérer tous les sav_cases pour ce magasin
      console.log('Fetching sav_cases for shop', shopId);
      const { data: savCases, error: fetchError } = await supabase
        .from('sav_cases')
        .select('id')
        .eq('shop_id', shopId);

      if (fetchError) {
        console.error('Error fetching sav_cases:', fetchError);
        throw fetchError;
      }

      const savCaseIds = savCases?.map(sc => sc.id) || [];
      console.log('Found sav_cases:', savCaseIds);

      // Supprimer sav_parts qui référencent ces sav_cases
      if (savCaseIds.length > 0) {
        console.log('Deleting sav_parts for sav_cases', savCaseIds);
        const { error: savPartsError } = await supabase
          .from('sav_parts')
          .delete()
          .in('sav_case_id', savCaseIds);
        
        if (savPartsError) {
          console.error('Error deleting sav_parts:', savPartsError);
          throw savPartsError;
        }

        // Supprimer sav_status_history qui référencent ces sav_cases
        console.log('Deleting sav_status_history for sav_cases', savCaseIds);
        const { error: savStatusError } = await supabase
          .from('sav_status_history')
          .delete()
          .in('sav_case_id', savCaseIds);
        
        if (savStatusError) {
          console.error('Error deleting sav_status_history:', savStatusError);
          throw savStatusError;
        }
      }

      // Supprimer parts
      console.log('Deleting parts for shop', shopId);
      const { error: partsError } = await supabase
        .from('parts')
        .delete()
        .eq('shop_id', shopId);

      if (partsError) {
        console.error('Error deleting parts:', partsError);
        throw partsError;
      }

      // Supprimer customers
      console.log('Deleting customers for shop', shopId);
      const { error: customersError } = await supabase
        .from('customers')
        .delete()
        .eq('shop_id', shopId);

      if (customersError) {
        console.error('Error deleting customers:', customersError);
        throw customersError;
      }

      // Supprimer quotes
      console.log('Deleting quotes for shop', shopId);
      const { error: quotesError } = await supabase
        .from('quotes')
        .delete()
        .eq('shop_id', shopId);

      if (quotesError) {
        console.error('Error deleting quotes:', quotesError);
        throw quotesError;
      }

      // Supprimer order_items
      console.log('Deleting order_items for shop', shopId);
      const { error: orderItemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('shop_id', shopId);

      if (orderItemsError) {
        console.error('Error deleting order_items:', orderItemsError);
        throw orderItemsError;
      }

      // Supprimer notifications
      console.log('Deleting notifications for shop', shopId);
      const { error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .eq('shop_id', shopId);

      if (notificationsError) {
        console.error('Error deleting notifications:', notificationsError);
        throw notificationsError;
      }

      // Supprimer sav_messages
      console.log('Deleting sav_messages for shop', shopId);
      const { error: messagesError } = await supabase
        .from('sav_messages')
        .delete()
        .eq('shop_id', shopId);

      if (messagesError) {
        console.error('Error deleting sav_messages:', messagesError);
        throw messagesError;
      }

      // Supprimer sav_cases
      console.log('Deleting sav_cases for shop', shopId);
      const { error: savCasesError } = await supabase
        .from('sav_cases')
        .delete()
        .eq('shop_id', shopId);

      if (savCasesError) {
        console.error('Error deleting sav_cases:', savCasesError);
        throw savCasesError;
      }

      // Supprimer profiles
      console.log('Deleting profiles for shop', shopId);
      const { error: profilesError } = await supabase
        .from('profiles')
        .delete()
        .eq('shop_id', shopId);

      if (profilesError) {
        console.error('Error deleting profiles:', profilesError);
        throw profilesError;
      }

      // Enfin supprimer le magasin lui-même
      console.log('Deleting shop', shopId);
      const { error: shopError } = await supabase
        .from('shops')
        .delete()
        .eq('id', shopId);

      if (shopError) {
        console.error('Error deleting shop:', shopError);
        throw shopError;
      }

      // Vérifier que le magasin a bien été supprimé
      const { data: verificationData, error: verificationError } = await supabase
        .from('shops')
        .select('id')
        .eq('id', shopId);

      if (verificationError) {
        console.error('Error verifying deletion:', verificationError);
        throw verificationError;
      }

      if (verificationData && verificationData.length > 0) {
        throw new Error('Le magasin n\'a pas été supprimé correctement');
      }

      console.log('Shop deletion completed successfully');

      // Mettre à jour l'état local uniquement après confirmation de la suppression
      setShops(shops.filter(shop => shop.id !== shopId));
      
      toast({
        title: "Succès",
        description: "Magasin et toutes ses données supprimés",
      });

      // Recharger les données après un délai pour s'assurer de la cohérence
      setTimeout(() => {
        fetchData();
      }, 1000);
      
    } catch (error: any) {
      console.error('Deletion error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  };

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

      await fetchData();
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

      setProfiles(profiles.filter(profile => profile.id !== profileId));
      
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

  const addSmsCredits = async (shopId: string, additionalCredits: number) => {
    try {
      const shop = shops.find(s => s.id === shopId);
      if (!shop) throw new Error("Magasin non trouvé");

      const { error } = await supabase
        .from('shops')
        .update({ 
          sms_credits_allocated: shop.sms_credits_allocated + additionalCredits 
        })
        .eq('id', shopId);

      if (error) throw error;

      await fetchData();
      
      toast({
        title: "Succès",
        description: `${additionalCredits} crédits SMS ajoutés`,
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-700 text-lg">Chargement du panneau Super Admin...</p>
        </div>
      </div>
    );
  }

  const totalStats = {
    totalShops: shops.length,
    totalUsers: profiles.length,
    totalRevenue: shops.reduce((sum, shop) => sum + (shop.total_revenue || 0), 0),
    totalCases: shops.reduce((sum, shop) => sum + (shop.total_sav_cases || 0), 0),
    totalSubscriptionRevenue: calculateSubscriptionRevenue(shops),
    activeSupportTickets: activeSupportCount,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header spécial Super Admin */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary rounded-xl shadow-lg">
                <Crown className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="h-6 w-6" />
                  Super Administration
                </h1>
                <p className="text-slate-600">Panneau de contrôle réseau SAV Pro</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-slate-900 font-medium">{user?.email}</p>
                <p className="text-xs text-primary flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Super Administrateur
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="border-slate-300 text-slate-700 hover:bg-slate-100"
                onClick={() => window.location.href = '/landing'}
              >
                Retour Landing
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={signOut}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-10 w-10 text-primary" />
            <div>
              <h2 className="text-4xl font-bold text-slate-900">Administration du Réseau</h2>
              <p className="text-xl text-slate-600">Gestion centralisée de tous les magasins et utilisateurs</p>
            </div>
          </div>
        </div>

        {/* Dashboard Overview - 3 rangées de 2 modules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 font-medium">Total Magasins</p>
                  <p className="text-3xl font-bold text-slate-900">{totalStats.totalShops}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Store className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 font-medium">Total Utilisateurs</p>
                  <p className="text-3xl font-bold text-slate-900">{totalStats.totalUsers}</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <Users className="h-8 w-8 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 font-medium">CA généré par le réseau</p>
                  <p className="text-3xl font-bold text-slate-900">{totalStats.totalRevenue.toFixed(2)}€</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <DollarSign className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 font-medium">Total Dossiers SAV</p>
                  <p className="text-3xl font-bold text-slate-900">{totalStats.totalCases}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Activity className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 font-medium">Notre Chiffre d'Affaires</p>
                  <p className="text-3xl font-bold text-slate-900">{totalStats.totalSubscriptionRevenue}€</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 font-medium">Support Actif</p>
                  <p className="text-3xl font-bold text-slate-900">{totalStats.activeSupportTickets}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <HelpCircle className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="shops" className="space-y-6">
          <TabsList className="grid w-full grid-cols-9 bg-white border-slate-200">
            <TabsTrigger value="shops" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-slate-700">
              <Store className="h-4 w-4" />
              Gestion Magasins
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-slate-700">
              <Users className="h-4 w-4" />
              Gestion Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-slate-700">
              <Crown className="h-4 w-4" />
              Plans d'abonnement
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-slate-700">
              <BarChart3 className="h-4 w-4" />
              Statistiques
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-slate-700">
              <MessageSquare className="h-4 w-4" />
              Crédits SMS
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-slate-700">
              <HelpCircle className="h-4 w-4" />
              Support
              {activeSupportCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {activeSupportCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="seo" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-slate-700">
              <Search className="h-4 w-4" />
              SEO
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-slate-700">
              <Palette className="h-4 w-4" />
              Charte Graphique
            </TabsTrigger>
            <TabsTrigger value="landing" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-slate-700">
              <FileText className="h-4 w-4" />
              Landing Page
            </TabsTrigger>
          </TabsList>

          {/* Shops Management */}
          <TabsContent value="shops">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Store className="h-5 w-5" />
                    Gestion des Magasins
                  </CardTitle>
                  <Dialog open={isCreateShopOpen} onOpenChange={setIsCreateShopOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Créer un magasin
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 border-slate-700 text-white">
                      <DialogHeader>
                        <DialogTitle>Créer un nouveau magasin</DialogTitle>
                        <DialogDescription className="text-slate-300">
                          Créez un nouveau magasin pour un client.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="shop-name" className="text-white">Nom du magasin</Label>
                          <Input
                            id="shop-name"
                            value={newShop.name}
                            onChange={(e) => setNewShop({...newShop, name: e.target.value})}
                            className="bg-slate-800 border-slate-600 text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="shop-email" className="text-white">Email</Label>
                          <Input
                            id="shop-email"
                            type="email"
                            value={newShop.email}
                            onChange={(e) => setNewShop({...newShop, email: e.target.value})}
                            className="bg-slate-800 border-slate-600 text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="shop-phone" className="text-white">Téléphone</Label>
                          <Input
                            id="shop-phone"
                            value={newShop.phone}
                            onChange={(e) => setNewShop({...newShop, phone: e.target.value})}
                            className="bg-slate-800 border-slate-600 text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="shop-address" className="text-white">Adresse</Label>
                          <Textarea
                            id="shop-address"
                            value={newShop.address}
                            onChange={(e) => setNewShop({...newShop, address: e.target.value})}
                            className="bg-slate-800 border-slate-600 text-white"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateShopOpen(false)}>
                          Annuler
                        </Button>
                        <Button onClick={createShop} className="bg-emerald-600 hover:bg-emerald-700">
                          Créer le magasin
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Search field */}
                <div className="mt-4 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Rechercher par nom, code postal ou administrateur..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 max-w-md"
                  />
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {filteredShops.map((shop) => (
                  <Dialog open={isEditShopOpen} onOpenChange={setIsEditShopOpen}>
                    <DialogContent className="bg-slate-900 border-slate-700 text-white">
                      <DialogHeader>
                        <DialogTitle>Modifier le magasin</DialogTitle>
                        <DialogDescription className="text-slate-300">
                          Modifiez les informations du magasin.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="edit-shop-name" className="text-white">Nom du magasin</Label>
                          <Input
                            id="edit-shop-name"
                            value={newShop.name}
                            onChange={(e) => setNewShop({...newShop, name: e.target.value})}
                            className="bg-slate-800 border-slate-600 text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-shop-email" className="text-white">Email</Label>
                          <Input
                            id="edit-shop-email"
                            type="email"
                            value={newShop.email}
                            onChange={(e) => setNewShop({...newShop, email: e.target.value})}
                            className="bg-slate-800 border-slate-600 text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-shop-phone" className="text-white">Téléphone</Label>
                          <Input
                            id="edit-shop-phone"
                            value={newShop.phone}
                            onChange={(e) => setNewShop({...newShop, phone: e.target.value})}
                            className="bg-slate-800 border-slate-600 text-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-shop-address" className="text-white">Adresse</Label>
                          <Textarea
                            id="edit-shop-address"
                            value={newShop.address}
                            onChange={(e) => setNewShop({...newShop, address: e.target.value})}
                            className="bg-slate-800 border-slate-600 text-white"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditShopOpen(false)}>
                          Annuler
                        </Button>
                        <Button onClick={updateShop} className="bg-emerald-600 hover:bg-emerald-700">
                          Sauvegarder
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Search field */}
                <div className="mt-4 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Rechercher par nom, code postal ou administrateur..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 max-w-md"
                  />
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {filteredShops.length === 0 && searchTerm ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucun magasin trouvé pour "{searchTerm}"</p>
                    </div>
                  ) : (
                    filteredShops.map((shop) => (
                    <Card key={shop.id} className="bg-white border-slate-200 hover:shadow-md transition-all duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                              <h3 className="font-semibold text-lg text-slate-900">{shop.name}</h3>
                              <Badge variant="outline" className="border-emerald-600 text-emerald-700">
                                {shop.total_users} utilisateur(s)
                              </Badge>
                              <Badge variant="outline" className="border-blue-600 text-blue-700">
                                {shop.total_sav_cases} dossier(s) SAV
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-2">
                              <div className="text-slate-700">
                                <span className="font-medium">Email: </span>
                                <span>{shop.email}</span>
                              </div>
                              <div className="text-slate-700">
                                <span className="font-medium">Téléphone: </span>
                                <span>{shop.phone}</span>
                              </div>
                              <div className="text-slate-700">
                                <span className="font-medium">CA: </span>
                                <span>{shop.total_revenue?.toFixed(2)}€</span>
                              </div>
                            </div>
                            
                            {shop.slug && (
                              <div className="flex items-center gap-2 bg-slate-100 p-3 rounded-lg">
                                <div className="flex-1">
                                  <span className="font-medium text-sm text-slate-700">URL du magasin: </span>
                                  <a 
                                    href={`${window.location.origin}/${shop.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:text-primary/80 font-mono text-sm"
                                  >
                                    {window.location.origin}/{shop.slug}
                                  </a>
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="border-slate-300 text-slate-700 hover:bg-slate-100"
                                  onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/${shop.slug}`);
                                    toast({
                                      title: "Copié !",
                                      description: "L'URL a été copiée dans le presse-papiers",
                                    });
                                  }}
                                >
                                  Copier
                                </Button>
                              </div>
                            )}
                          </div>
                          
                           <div className="flex items-center gap-2 ml-4">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-slate-300 text-slate-700 hover:bg-slate-100"
                              onClick={() => openShopManagement(shop)}
                            >
                              <Crown className="h-4 w-4 mr-1" />
                              Gérer
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-slate-300 text-slate-700 hover:bg-slate-100"
                              onClick={() => editShop(shop)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Modifier
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="border-red-300 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Supprimer
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-white border-red-200">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-slate-900 flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-red-500" />
                                    Supprimer le magasin "{shop.name}"
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-slate-600">
                                    <div className="space-y-2">
                                      <p>Cette action est irréversible et supprimera définitivement :</p>
                                      <ul className="list-disc list-inside space-y-1 text-sm">
                                        <li>Le magasin et ses informations</li>
                                        <li>Tous les utilisateurs associés ({shop.total_users})</li>
                                        <li>Tous les dossiers SAV ({shop.total_sav_cases})</li>
                                        <li>Tous les articles et stocks</li>
                                        <li>Tous les clients et devis</li>
                                        <li>Toutes les notifications et messages</li>
                                      </ul>
                                      <p className="font-medium text-red-600 mt-3">
                                        Voulez-vous vraiment continuer ?
                                      </p>
                                    </div>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200">
                                    Annuler
                                  </AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteShop(shop.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Supprimer définitivement
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Management */}
          <TabsContent value="users">
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
                    <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
                      <DialogHeader>
                        <DialogTitle>Créer un nouvel utilisateur</DialogTitle>
                        <DialogDescription className="text-slate-300">
                          Créez un nouvel utilisateur et assignez-le à un magasin.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
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
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="user-firstname" className="text-white">Prénom</Label>
                            <Input
                              id="user-firstname"
                              value={newUser.first_name}
                              onChange={(e) => setNewUser({...newUser, first_name: e.target.value})}
                              className="bg-slate-800 border-slate-600 text-white"
                            />
                          </div>
                          <div>
                            <Label htmlFor="user-lastname" className="text-white">Nom</Label>
                            <Input
                              id="user-lastname"
                              value={newUser.last_name}
                              onChange={(e) => setNewUser({...newUser, last_name: e.target.value})}
                              className="bg-slate-800 border-slate-600 text-white"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="user-shop" className="text-white">Magasin</Label>
                          <Select value={newUser.shop_id} onValueChange={(value) => setNewUser({...newUser, shop_id: value})}>
                            <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                              <SelectValue placeholder="Sélectionner un magasin" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              {shops.map(shop => (
                                <SelectItem key={shop.id} value={shop.id} className="text-white focus:bg-slate-700">
                                  {shop.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="user-role" className="text-white">Rôle</Label>
                          <Select value={newUser.role} onValueChange={(value: any) => setNewUser({...newUser, role: value})}>
                            <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              <SelectItem value="admin" className="text-white focus:bg-slate-700">Administrateur</SelectItem>
                              <SelectItem value="technician" className="text-white focus:bg-slate-700">Technicien</SelectItem>
                              <SelectItem value="super_admin" className="text-white focus:bg-slate-700">Super Admin</SelectItem>
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
                    <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
                      <DialogHeader>
                        <DialogTitle>Changer le mot de passe</DialogTitle>
                        <p className="text-slate-400">
                          {selectedUserForPassword && `${selectedUserForPassword.first_name} ${selectedUserForPassword.last_name}`}
                        </p>
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
                            placeholder="Entrez le nouveau mot de passe"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => {
                          setIsChangePasswordOpen(false);
                          setSelectedUserForPassword(null);
                          setNewPassword('');
                        }}>
                          Annuler
                        </Button>
                        <Button 
                          onClick={changeUserPassword} 
                          className="bg-blue-600 hover:bg-blue-700"
                          disabled={!newPassword}
                        >
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
                              <h3 className="font-semibold text-lg text-slate-900">
                                {profile.first_name} {profile.last_name}
                              </h3>
                               <Badge variant={profile.role === 'super_admin' ? 'default' : profile.role === 'admin' ? 'secondary' : 'outline'} 
                                 className={profile.role === 'super_admin' ? 'bg-primary text-primary-foreground' : ''}>
                                {profile.role === 'super_admin' && <Crown className="h-3 w-3 mr-1" />}
                                {profile.role === 'super_admin' ? 'Super Admin' : 
                                 profile.role === 'admin' ? 'Administrateur' : 'Technicien'}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
                              <div>
                                <span className="font-medium">Magasin: </span>
                                <span>{profile.shop?.name || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="font-medium">Email: </span>
                                <span>{profile.shop?.email || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="font-medium">Téléphone: </span>
                                <span>{profile.phone}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-blue-300 text-blue-600 hover:bg-blue-50"
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
          </TabsContent>

          {/* Plans d'abonnement */}
          <TabsContent value="plans" className="space-y-6">
            <SubscriptionPlansManager />
          </TabsContent>

          {/* Statistics */}
          <TabsContent value="statistics">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <TrendingUp className="h-5 w-5" />
                  Statistiques par Magasin
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shops.map((shop) => (
                    <Card key={shop.id} className="bg-white border-slate-200">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <h4 className="font-medium text-slate-900">{shop.name}</h4>
                            <p className="text-sm text-slate-600">{shop.email}</p>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{shop.total_sav_cases}</div>
                            <div className="text-sm text-slate-600">Dossiers SAV</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{shop.total_revenue?.toFixed(2)}€</div>
                            <div className="text-sm text-slate-600">Chiffre d'affaires</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">{shop.average_case_value?.toFixed(2)}€</div>
                            <div className="text-sm text-slate-600">Panier moyen</div>
                          </div>
                        </div>
                        
                        <div className="mt-4 grid grid-cols-4 gap-2 text-sm">
                          <div className="text-center">
                            <div className="font-medium text-yellow-600">{shop.pending_cases}</div>
                            <div className="text-slate-600">En attente</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-blue-600">{shop.in_progress_cases}</div>
                            <div className="text-slate-600">En cours</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-green-600">{shop.ready_cases}</div>
                            <div className="text-slate-600">Prêt</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-slate-600">{shop.delivered_cases}</div>
                            <div className="text-slate-600">Livré</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SMS Credits Management */}
          <TabsContent value="sms">
            <TwilioCreditsManager />
            <SMSCreditManager 
              shops={shops || []} 
              onUpdate={fetchData} 
            />
          </TabsContent>

          {/* Support Management */}
          <TabsContent value="support">
            {selectedTicket ? (
              <SupportTicketManager
                ticket={selectedTicket}
                onBack={() => setSelectedTicket(null)}
                onDelete={(ticketId: string) => {
                  setSelectedTicket(null);
                  fetchSupportTickets();
                }}
              />
            ) : (
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <HelpCircle className="h-5 w-5" />
                    Gestion du Support
                    <Badge variant="secondary" className="ml-2">
                      {supportTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length} actifs
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {supportTickets.length === 0 ? (
                      <div className="text-center py-8 text-slate-600">
                        <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">Aucun ticket de support</p>
                        <p>Les magasins peuvent créer des tickets depuis leur espace Support</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Ticket
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Magasin
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Statut
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Priorité
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-200">
                            {supportTickets.map((ticket) => (
                              <tr key={ticket.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4">
                                  <div>
                                    <div className="text-sm font-medium text-slate-900">
                                      {ticket.subject}
                                    </div>
                                    <div className="text-sm text-slate-500 truncate max-w-xs">
                                      {ticket.description}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-slate-900">{ticket.shop?.name}</div>
                                  <div className="text-sm text-slate-500">{ticket.shop?.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Badge variant={
                                    ticket.status === 'open' ? 'destructive' : 
                                    ticket.status === 'in_progress' ? 'default' : 
                                    ticket.status === 'resolved' ? 'secondary' : 'outline'
                                  }>
                                    {ticket.status === 'open' ? 'Ouvert' :
                                     ticket.status === 'in_progress' ? 'En cours' :
                                     ticket.status === 'resolved' ? 'Résolu' : 'Fermé'}
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Badge variant={
                                    ticket.priority === 'urgent' ? 'destructive' : 
                                    ticket.priority === 'high' ? 'default' : 'outline'
                                  }>
                                    {ticket.priority === 'urgent' ? 'Urgent' :
                                     ticket.priority === 'high' ? 'Élevée' :
                                     ticket.priority === 'medium' ? 'Moyenne' : 'Faible'}
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                  {new Date(ticket.created_at).toLocaleDateString('fr-FR')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Button
                                    size="sm"
                                    onClick={() => setSelectedTicket(ticket)}
                                    className="flex items-center gap-2"
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                    Gérer
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* SEO Configuration */}
          <TabsContent value="seo">
            <SEOConfigTab />
          </TabsContent>

          {/* Branding Management */}
          <TabsContent value="branding">
            <BrandingManager />
          </TabsContent>

          {/* Landing Page Management */}
          <TabsContent value="landing">
            <LandingPageManager />
          </TabsContent>
        </Tabs>

        {/* Dialog de gestion du magasin */}
        <ShopManagementDialog
          shop={selectedShop}
          isOpen={isShopManagementOpen}
          onClose={() => setIsShopManagementOpen(false)}
          onUpdate={fetchData}
        />
      </main>
    </div>
  );
}