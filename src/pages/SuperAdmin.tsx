import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Crown,
  Shield,
  Zap,
  Globe,
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SuperAdminSidebar } from '@/components/admin/SuperAdminSidebar';
import { DashboardOverview } from '@/components/admin/dashboard/DashboardOverview';
import { ShopsManagement } from '@/components/admin/dashboard/ShopsManagement';
import { UsersManagement } from '@/components/admin/dashboard/UsersManagement';
import { StatisticsView } from '@/components/admin/dashboard/StatisticsView';
import SubscriptionPlansManager from '@/components/admin/SubscriptionPlansManager';
import SupportTicketManager from '@/components/admin/SupportTicketManager';
import { SupportTicketsOverview } from '@/components/admin/SupportTicketsOverview';
import { SMSCreditManager } from '@/components/admin/SMSCreditManager';
import { TwilioCreditsManager } from '@/components/admin/TwilioCreditsManager';
import { SEOConfigTab } from '@/components/seo/SEOConfigTab';
import { BrandingManager } from '@/components/admin/BrandingManager';
import { LandingPageManager } from '@/components/admin/LandingPageManager';
import { SMSPackagesManager } from '@/components/admin/SMSPackagesManager';
import { SystemAlertsManager } from '@/components/admin/SystemAlertsManager';
import { InvoiceManagement } from '@/components/admin/InvoiceManagement';
import { useStorageUsage } from '@/hooks/useStorageUsage';
import { Shop } from '@/hooks/useShop';

interface SuperAdminShop extends Shop {
  subscription_menu_visible: boolean;
  subscription_tier: string;
  sms_credits_allocated: number;
  sms_credits_used: number;
  active_sav_count: number;
  purchased_sms: number;
  total_users?: number;
  total_sav_cases?: number;
  pending_cases?: number;
  in_progress_cases?: number;
  ready_cases?: number;
  delivered_cases?: number;
  total_revenue?: number;
  average_case_value?: number;
  is_blocked?: boolean;
  storage_gb?: number;
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
  const [activeSection, setActiveSection] = useState('dashboard');
  
  const [shops, setShops] = useState<SuperAdminShop[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [activeSupportCount, setActiveSupportCount] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const { storageUsage, getShopStorageUsage } = useStorageUsage();

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
      console.log('🔧 Super Admin connecté, chargement des données...');
      fetchData();
    }
  }, [user, authLoading]);

  const fetchSupportTickets = async () => {
    try {
      console.log('🔄 Récupération des tickets de support pour super admin...');
      
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          shop:shops!inner(name, email)
        `)
        .order('created_at', { ascending: false });

      console.log('📊 Résultat requête tickets:', { data, error });

      if (error) {
        console.error('❌ Erreur lors du chargement des tickets:', error);
        throw error;
      }
      
      console.log(`✅ ${data?.length || 0} tickets récupérés`);
      setSupportTickets((data || []) as SupportTicket[]);
      setActiveSupportCount((data || []).filter(ticket => ticket.status === 'open' || ticket.status === 'in_progress').length);
    } catch (error: any) {
      console.error('💥 Erreur critique fetchSupportTickets:', error);
      setSupportTickets([]);
      setActiveSupportCount(0);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch shops
      const { data: shopsData, error: shopsError } = await supabase
        .from('shops')
        .select('*, subscription_plans!shops_subscription_plan_id_fkey(name, monthly_price)')
        .order('created_at', { ascending: false });

      if (shopsError) throw shopsError;

      // Fetch SMS purchases for each shop
      const { data: smsPurchases, error: smsPurchasesError } = await supabase
        .from('sms_package_purchases')
        .select('shop_id, sms_count')
        .eq('status', 'completed');

      if (smsPurchasesError) throw smsPurchasesError;

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

      if (savCasesError) throw savCasesError;

      // Process shop statistics
      const shopsWithStats = shopsData?.map(shop => {
        const shopProfiles = profilesCount?.filter(p => p.shop_id === shop.id) || [];
        const shopSavCases = savCasesData?.filter(sc => sc.shop_id === shop.id) || [];
        const shopSMSPurchases = smsPurchases?.filter(sp => sp.shop_id === shop.id) || [];
        const purchasedSMS = shopSMSPurchases.reduce((sum, purchase) => sum + purchase.sms_count, 0);
        const shopStorage = getShopStorageUsage(shop.id);
        
        return {
          ...shop,
          purchased_sms: purchasedSMS,
          total_users: shopProfiles.length,
          total_sav_cases: shopSavCases.length,
          pending_cases: shopSavCases.filter(c => c.status === 'pending').length,
          in_progress_cases: shopSavCases.filter(c => c.status === 'in_progress').length,
          ready_cases: shopSavCases.filter(c => c.status === 'ready').length,
          delivered_cases: shopSavCases.filter(c => c.status === 'delivered').length,
          total_revenue: shopSavCases.filter(c => c.sav_type !== 'internal').reduce((sum, c) => sum + (c.total_cost || 0), 0),
          average_case_value: shopSavCases.length > 0 
            ? shopSavCases.filter(c => c.sav_type !== 'internal').reduce((sum, c) => sum + (c.total_cost || 0), 0) / shopSavCases.filter(c => c.sav_type !== 'internal').length
            : 0,
          storage_gb: shopStorage?.storage_gb || 0
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

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardOverview shops={shops} profiles={profiles} activeSupportCount={activeSupportCount} />;
      case 'shops':
        return <ShopsManagement shops={shops} onUpdate={fetchData} />;
      case 'users':
        return <UsersManagement profiles={profiles} shops={shops} onUpdate={fetchData} />;
      case 'plans':
        return <SubscriptionPlansManager />;
      case 'sms':
        return (
          <div className="space-y-6">
            <TwilioCreditsManager />
            <SMSCreditManager onUpdate={fetchData} />
          </div>
        );
      case 'invoices':
        return <InvoiceManagement />;
      case 'support':
        return selectedTicket ? (
          <SupportTicketManager
            ticket={selectedTicket}
            onBack={() => setSelectedTicket(null)}
            onDelete={() => {
              setSelectedTicket(null);
              fetchSupportTickets();
            }}
          />
        ) : (
          <SupportTicketsOverview 
            onTicketSelect={setSelectedTicket}
          />
        );
      case 'statistics':
        return <StatisticsView shops={shops} />;
      case 'seo':
        return <SEOConfigTab />;
      case 'branding':
        return <BrandingManager />;
      case 'landing':
        return <LandingPageManager />;
      case 'sms-packages':
        return <SMSPackagesManager />;
      case 'alerts':
        return <SystemAlertsManager />;
      default:
        return <DashboardOverview shops={shops} profiles={profiles} activeSupportCount={activeSupportCount} />;
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

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-slate-50 flex w-full">
        {/* Header spécial Super Admin */}
        <header className="fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-50 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
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
        </header>

        <SuperAdminSidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection}
          activeSupportCount={activeSupportCount}
        />

        <main className="flex-1 pt-20 px-6 py-8">
          {renderActiveSection()}
        </main>
      </div>
    </SidebarProvider>
  );
}