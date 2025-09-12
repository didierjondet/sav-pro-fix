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
import { SMSCreditsDisplay } from '@/components/sms/SMSCreditsDisplay';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useShop } from '@/hooks/useShop';
import { useProfile } from '@/hooks/useProfile';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { SAVStatusesManager } from '@/components/sav/SAVStatusesManager';
import SAVTypesManager from '@/components/sav/SAVTypesManager';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';
import { SMSPackagesDisplay } from '@/components/subscription/SMSPackagesDisplay';
import * as XLSX from 'xlsx';
import { useSearchParams } from 'react-router-dom';
import { ImportStock } from '@/components/parts/ImportStock';
import { ImportQuotes } from '@/components/import/ImportQuotes';
import { ImportSAVs } from '@/components/import/ImportSAVs';
import { BillingInvoices } from '@/components/billing/BillingInvoices';
import { Store, Users, Mail, Phone, MapPin, UserPlus, Trash2, Crown, Settings as SettingsIcon, Copy, Key, Upload, Image as ImageIcon, Moon, Sun, Monitor, Star, Search, CreditCard, MessageSquare, FileText, Bell, Tag, Package } from 'lucide-react';
import { useTheme } from "next-themes";
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const {
    theme,
    setTheme
  } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'shop';
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    shop,
    updateShop: updateShopData
  } = useShop();
  const {
    profile,
    refetch: refetchProfile
  } = useProfile();
  const {
    subscription,
    createCheckout,
    openCustomerPortal
  } = useSubscription();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'technician' | 'super_admin' | 'shop_admin'>('technician');
  const [logoUploading, setLogoUploading] = useState(false);
  const [showStockImport, setShowStockImport] = useState(false);
  const [showQuotesImport, setShowQuotesImport] = useState(false);
  const [showSAVsImport, setShowSAVsImport] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const { statuses, loading: statusesLoading, refetch: refetchStatuses } = useShopSAVStatuses();
  const { types: savTypes, loading: savTypesLoading, refetch: refetchSavTypes } = useShopSAVTypes();

  // Local state for form data
  const [shopForm, setShopForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    logo_url: '',
    review_link: '',
    auto_review_enabled: true,
    sav_warning_enabled: true,
    max_sav_processing_days_client: 7,
    max_sav_processing_days_internal: 5,
    max_sav_processing_days_external: 9,
    custom_review_sms_message: '',
    custom_review_chat_message: '',
    sav_delay_alerts_enabled: false,
    sav_client_alert_days: 2,
    sav_external_alert_days: 2,
    sav_internal_alert_days: 2
  });
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone: ''
  });
  useEffect(() => {
    if (user) {
      fetchProfiles();
      fetchPlans();
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
        review_link: (shop as any).review_link || '',
        auto_review_enabled: (shop as any).auto_review_enabled ?? true,
        sav_warning_enabled: (shop as any).sav_warning_enabled ?? true,
        max_sav_processing_days_client: shop.max_sav_processing_days_client || 7,
        max_sav_processing_days_internal: shop.max_sav_processing_days_internal || 5,
        max_sav_processing_days_external: shop.max_sav_processing_days_external || 9,
        custom_review_sms_message: shop.custom_review_sms_message || 'Bonjour {customer_name}, votre dossier de réparation {case_number} a été mis à jour : {status}. Si vous avez été satisfait(e) de notre service, nous vous serions reconnaissants de prendre un moment pour nous laisser un avis : {review_link}. Merci pour votre confiance ! {shop_name}',
        custom_review_chat_message: shop.custom_review_chat_message || 'Bonjour {customer_name} ! 👋\\n\\nVotre réparation est maintenant terminée ! Si vous avez été satisfait(e) de notre service, nous vous serions reconnaissants de prendre un moment pour nous laisser un avis.\\n\\n⭐ Laisser un avis : {review_link}\\n\\nVotre retour nous aide à continuer d\'améliorer nos services.\\n\\nMerci pour votre confiance ! 😊\\n\\nL\'équipe {shop_name}',
        sav_delay_alerts_enabled: (shop as any).sav_delay_alerts_enabled ?? false,
        sav_client_alert_days: (shop as any).sav_client_alert_days || 2,
        sav_external_alert_days: (shop as any).sav_external_alert_days || 2,
        sav_internal_alert_days: (shop as any).sav_internal_alert_days || 2
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
      const {
        data: profilesData,
        error: profilesError
      } = await supabase.from('profiles').select('*').neq('role', 'super_admin') // Filtrer les super admins
      .order('created_at', {
        ascending: false
      });
      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const fetchPlans = async () => {
    try {
      const {
        data: dbPlans,
        error
      } = await supabase.from('subscription_plans').select('id, name, monthly_price, sms_limit, sav_limit, features, billing_interval, stripe_price_id, contact_only, is_active').eq('is_active', true).order('monthly_price');
      if (error) throw error;
      if (dbPlans && dbPlans.length > 0) {
        setPlans(dbPlans);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des plans:', error);
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
      const {
        error
      } = await supabase.from('profiles').update(profileForm).eq('id', profile.id);
      if (error) throw error;
      await refetchProfile();
      toast({
        title: "Succès",
        description: "Profil mis à jour"
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  const deleteUser = async (profileId: string) => {
    try {
      const {
        error
      } = await supabase.from('profiles').delete().eq('id', profileId);
      if (error) throw error;
      fetchProfiles();
      toast({
        title: "Succès",
        description: "Utilisateur supprimé"
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const copyShopCode = () => {
    if (!shop?.invite_code) return;
    navigator.clipboard.writeText(shop.invite_code);
    toast({
      title: "Succès",
      description: "Code magasin copié dans le presse-papiers"
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
      const {
        error: uploadError
      } = await supabase.storage.from('shop-logos').upload(fileName, file, {
        upsert: true
      });
      if (uploadError) throw uploadError;

      // Récupérer l'URL publique
      const {
        data
      } = supabase.storage.from('shop-logos').getPublicUrl(fileName);

      // Mettre à jour la base de données
      await updateShopData({
        logo_url: data.publicUrl
      });
      setShopForm(prev => ({
        ...prev,
        logo_url: data.publicUrl
      }));
      toast({
        title: "Succès",
        description: "Logo mis à jour avec succès"
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLogoUploading(false);
    }
  };

  // Helpers Export
  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };
  const downloadBlob = (content: string | Blob, filename: string, mime: string) => {
    const blob = content instanceof Blob ? content : new Blob([content], {
      type: mime
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const buildAndDownloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csv = [headers.join(';'), ...rows.map(r => r.map(escapeCSV).join(';'))].join('\n');
    downloadBlob(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
  };
  const exportToExcel = (filename: string, rows: Record<string, any>[]) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Export');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };
  const printTablePDF = (title: string, headers: string[], rows: (string | number)[][]) => {
    const styles = `
      <style>
        body{font-family: Arial, sans-serif; padding:20px; color:#333}
        h1{font-size:20px; margin-bottom:16px}
        table{width:100%; border-collapse:collapse}
        th,td{border:1px solid #ddd; padding:8px; font-size:12px}
        th{background:#f3f4f6; text-align:left}
      </style>`;
    const tableHead = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    const tableBody = rows.map(r => `<tr>${r.map(c => `<td>${c ?? ''}</td>`).join('')}</tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>${styles}</head><body><h1>${title}</h1><table><thead>${tableHead}</thead><tbody>${tableBody}</tbody></table></body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.onload = () => {
        w.print();
        w.onafterprint = () => w.close();
      };
    }
  };
  const handleExportQuotes = async (format: 'csv' | 'xlsx' | 'pdf') => {
    try {
      const query = supabase.from('quotes' as any).select(`
          *,
          customer:customers(first_name,last_name,email,phone,address)
        `).order('created_at', {
        ascending: false
      });
      const {
        data,
        error
      } = shop?.id ? await query.eq('shop_id', shop.id) : await query;
      if (error) throw error;
      const quotes = (data || []) as any[];
      const getItems = (q: any) => Array.isArray(q.items) ? q.items : typeof q.items === 'string' ? JSON.parse(q.items || '[]') : [];
      const headers = ['ID', 'Numéro', 'Créé le', 'Mis à jour le', 'Statut', 'Client (nom complet)', 'Email devis', 'Téléphone devis', 'Client prénom', 'Client nom', 'Client email', 'Client téléphone', 'Client adresse', 'Total (€)', 'Articles (nombre)', 'Articles (JSON)', 'Shop ID', 'Customer ID'];
      const rows = quotes.map(q => [q.id, q.quote_number, new Date(q.created_at).toLocaleString('fr-FR'), new Date(q.updated_at).toLocaleString('fr-FR'), q.status, q.customer_name, q.customer_email || '', q.customer_phone || '', q.customer?.first_name || '', q.customer?.last_name || '', q.customer?.email || '', q.customer?.phone || '', q.customer?.address || '', Number(q.total_amount || 0).toFixed(2), getItems(q).length, JSON.stringify(getItems(q)), q.shop_id || '', q.customer_id || '']);
      if (format === 'csv') return buildAndDownloadCSV('devis_complet', headers, rows);
      if (format === 'xlsx') return exportToExcel('devis_complet', quotes.map(q => {
        const items = getItems(q);
        return {
          'ID': q.id,
          'Numéro': q.quote_number,
          'Créé le': new Date(q.created_at).toLocaleString('fr-FR'),
          'Mis à jour le': new Date(q.updated_at).toLocaleString('fr-FR'),
          'Statut': q.status,
          'Client (nom complet)': q.customer_name,
          'Email devis': q.customer_email || '',
          'Téléphone devis': q.customer_phone || '',
          'Client prénom': q.customer?.first_name || '',
          'Client nom': q.customer?.last_name || '',
          'Client email': q.customer?.email || '',
          'Client téléphone': q.customer?.phone || '',
          'Client adresse': q.customer?.address || '',
          'Total (€)': Number(q.total_amount || 0),
          'Articles (nombre)': items.length,
          'Articles (JSON)': JSON.stringify(items),
          'Shop ID': q.shop_id || '',
          'Customer ID': q.customer_id || ''
        };
      }));
      return printTablePDF('Export - Tous les devis (complet)', headers, rows);
    } catch (e: any) {
      toast({
        title: 'Erreur',
        description: e.message || 'Export devis impossible',
        variant: 'destructive'
      });
    }
  };
  const handleExportSAVs = async (format: 'csv' | 'xlsx' | 'pdf') => {
    try {
      const query = supabase.from('sav_cases' as any).select(`
          *,
          customer:customers(first_name,last_name,email,phone,address)
        `).order('created_at', {
        ascending: false
      });
      const {
        data,
        error
      } = shop?.id ? await query.eq('shop_id', shop.id) : await query;
      if (error) throw error;
      const cases = (data || []) as any[];
      const headers = ['ID', 'Dossier', 'Créé le', 'Mis à jour le', 'Type', 'Statut', 'Coût (€)', 'Temps (min)', 'Marque', 'Modèle', 'IMEI', 'SKU', 'Problème', 'Notes réparation', 'Commentaires privés', 'Prise en charge', 'Prise partielle', 'Montant prise en charge', 'Tracking', 'Shop ID', 'Customer ID', 'Technicien ID', 'Client prénom', 'Client nom', 'Client email', 'Client téléphone', 'Client adresse'];
      const rows = cases.map(c => [c.id, c.case_number, new Date(c.created_at).toLocaleString('fr-FR'), new Date(c.updated_at).toLocaleString('fr-FR'), c.sav_type, c.status, Number(c.total_cost || 0).toFixed(2), c.total_time_minutes || 0, c.device_brand || '', c.device_model || '', c.device_imei || '', c.sku || '', c.problem_description || '', c.repair_notes || '', c.private_comments || '', c.taken_over ? 'oui' : 'non', c.partial_takeover ? 'oui' : 'non', Number(c.takeover_amount || 0).toFixed(2), c.tracking_slug || '', c.shop_id || '', c.customer_id || '', c.technician_id || '', c.customer?.first_name || '', c.customer?.last_name || '', c.customer?.email || '', c.customer?.phone || '', c.customer?.address || '']);
      if (format === 'csv') return buildAndDownloadCSV('sav_complet', headers, rows);
      if (format === 'xlsx') return exportToExcel('sav_complet', cases.map(c => ({
        'ID': c.id,
        'Dossier': c.case_number,
        'Créé le': new Date(c.created_at).toLocaleString('fr-FR'),
        'Mis à jour le': new Date(c.updated_at).toLocaleString('fr-FR'),
        'Type': c.sav_type,
        'Statut': c.status,
        'Coût (€)': Number(c.total_cost || 0),
        'Temps (min)': c.total_time_minutes || 0,
        'Marque': c.device_brand || '',
        'Modèle': c.device_model || '',
        'IMEI': c.device_imei || '',
        'SKU': c.sku || '',
        'Problème': c.problem_description || '',
        'Notes réparation': c.repair_notes || '',
        'Commentaires privés': c.private_comments || '',
        'Prise en charge': !!c.taken_over,
        'Prise partielle': !!c.partial_takeover,
        'Montant prise en charge': Number(c.takeover_amount || 0),
        'Tracking': c.tracking_slug || '',
        'Shop ID': c.shop_id || '',
        'Customer ID': c.customer_id || '',
        'Technicien ID': c.technician_id || '',
        'Client prénom': c.customer?.first_name || '',
        'Client nom': c.customer?.last_name || '',
        'Client email': c.customer?.email || '',
        'Client téléphone': c.customer?.phone || '',
        'Client adresse': c.customer?.address || ''
      })));
      return printTablePDF('Export - Tous les SAV (complet)', headers, rows);
    } catch (e: any) {
      toast({
        title: 'Erreur',
        description: e.message || 'Export SAV impossible',
        variant: 'destructive'
      });
    }
  };
  const handleExportParts = async (format: 'csv' | 'xlsx') => {
    try {
      const query = supabase.from('parts' as any).select('*').order('name', {
        ascending: true
      });
      const {
        data,
        error
      } = shop?.id ? await query.eq('shop_id', shop.id) : await query;
      if (error) throw error;
      const parts = (data || []) as any[];
      const headers = ['ID', 'Créé le', 'Mis à jour le', 'Nom', 'Référence', 'Quantité', 'Stock mini', 'Prix achat', 'Prix vente', 'Temps (min)', 'Notes', 'Shop ID'];
      const rows = parts.map(p => [p.id, new Date(p.created_at).toLocaleString('fr-FR'), new Date(p.updated_at).toLocaleString('fr-FR'), p.name || '', p.reference || '', p.quantity ?? 0, p.min_stock ?? 0, Number(p.purchase_price || 0).toFixed(2), Number(p.selling_price || 0).toFixed(2), p.time_minutes ?? 0, p.notes || '', p.shop_id || '']);
      if (format === 'csv') return buildAndDownloadCSV('stock_pieces', headers, rows);
      if (format === 'xlsx') return exportToExcel('stock_pieces', parts.map(p => ({
        'ID': p.id,
        'Créé le': new Date(p.created_at).toLocaleString('fr-FR'),
        'Mis à jour le': new Date(p.updated_at).toLocaleString('fr-FR'),
        'Nom': p.name || '',
        'Référence': p.reference || '',
        'Quantité': p.quantity ?? 0,
        'Stock mini': p.min_stock ?? 0,
        'Prix achat': Number(p.purchase_price || 0),
        'Prix vente': Number(p.selling_price || 0),
        'Temps (min)': p.time_minutes ?? 0,
        'Notes': p.notes || '',
        'Shop ID': p.shop_id || ''
      })));
    } catch (e: any) {
      toast({
        title: 'Erreur',
        description: e.message || 'Export stock impossible',
        variant: 'destructive'
      });
    }
  };
  const isAdmin = profile?.role === 'admin';
  if (loading) {
    return <div className="min-h-screen bg-background">
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
      </div>;
  }
  return <div className="min-h-screen bg-background">
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

          <Tabs value={activeTab} onValueChange={val => {
              setActiveTab(val);
              setSearchParams(prev => {
                const p = new URLSearchParams(prev);
                p.set('tab', val);
                return p;
              });
            }} className="space-y-6">
            <TabsList className="grid w-full grid-cols-9">
              <TabsTrigger value="shop" className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                Magasin
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Apparence
              </TabsTrigger>
              <TabsTrigger value="sms" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Crédits SMS
              </TabsTrigger>
              <TabsTrigger value="import-export" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Import/Export
              </TabsTrigger>
              <TabsTrigger value="sav-statuses" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Statuts SAV
              </TabsTrigger>
              <TabsTrigger value="sav-types" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Types de SAV
              </TabsTrigger>
              <TabsTrigger value="subscription" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Abonnement
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Facturation
              </TabsTrigger>
              {isAdmin && <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Utilisateurs
                </TabsTrigger>}
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
                    <Input id="shop-name" value={shopForm.name} onChange={e => setShopForm({
                        ...shopForm,
                        name: e.target.value
                      })} disabled={!isAdmin} />
                  </div>
                  
                  <div>
                    <Label htmlFor="shop-logo">Logo du magasin</Label>
                    <div className="flex items-center gap-4">
                      {shopForm.logo_url && <div className="flex items-center gap-2">
                          <img src={shopForm.logo_url} alt="Logo du magasin" className="h-12 w-12 object-contain border rounded" />
                        </div>}
                      <div className="flex-1">
                        <Input id="shop-logo" type="file" accept="image/*" onChange={handleLogoUpload} disabled={!isAdmin || logoUploading} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                        {logoUploading && <p className="text-sm text-muted-foreground mt-1">Upload en cours...</p>}
                        <p className="text-sm text-muted-foreground mt-1">
                          Le logo sera utilisé dans les PDF et les liens de suivi client
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="shop-email">Email</Label>
                    <Input id="shop-email" type="email" value={shopForm.email} onChange={e => setShopForm({
                        ...shopForm,
                        email: e.target.value
                      })} disabled={!isAdmin} />
                  </div>
                  <div>
                    <Label htmlFor="shop-phone">Téléphone</Label>
                    <Input id="shop-phone" value={shopForm.phone} onChange={e => setShopForm({
                        ...shopForm,
                        phone: e.target.value
                      })} disabled={!isAdmin} />
                  </div>
                  <div>
                    <Label htmlFor="shop-address">Adresse</Label>
                    <Textarea id="shop-address" value={shopForm.address} onChange={e => setShopForm({
                        ...shopForm,
                        address: e.target.value
                      })} disabled={!isAdmin} />
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-4">Délais de traitement SAV</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="sav-client-delay">SAV Client (jours)</Label>
                        <Input id="sav-client-delay" type="number" min="1" max="30" value={shopForm.max_sav_processing_days_client} onChange={e => setShopForm({
                            ...shopForm,
                            max_sav_processing_days_client: parseInt(e.target.value) || 7
                          })} disabled={!isAdmin} />
                      </div>
                      <div>
                        <Label htmlFor="sav-external-delay">SAV Externe (jours)</Label>
                        <Input id="sav-external-delay" type="number" min="1" max="30" value={shopForm.max_sav_processing_days_external} onChange={e => setShopForm({
                            ...shopForm,
                            max_sav_processing_days_external: parseInt(e.target.value) || 9
                          })} disabled={!isAdmin} />
                      </div>
                      <div>
                        <Label htmlFor="sav-internal-delay">SAV Magasin (jours)</Label>
                        <Input id="sav-internal-delay" type="number" min="1" max="30" value={shopForm.max_sav_processing_days_internal} onChange={e => setShopForm({
                            ...shopForm,
                            max_sav_processing_days_internal: parseInt(e.target.value) || 5
                          })} disabled={!isAdmin} />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Délai maximum pour traiter les dossiers SAV. Les dossiers dépassant ce délai seront mis en surbrillance.
                    </p>
                  </div>

                  {isAdmin && <Button onClick={handleSaveShop} disabled={saving}>
                      {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </Button>}
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
                      <Button variant="outline" size="sm" onClick={copyShopCode} className="flex items-center gap-2">
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

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Avis Google
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-4">Configuration des avis</h4>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="review-link">Lien vers votre page d'avis Google</Label>
                        <Input id="review-link" type="url" value={shopForm.review_link} onChange={e => setShopForm({
                            ...shopForm,
                            review_link: e.target.value
                          })} disabled={!isAdmin} placeholder="https://g.page/r/..." />
                        <p className="text-sm text-muted-foreground mt-2">
                          Ce lien sera utilisé pour demander aux clients de laisser un avis après réparation. 
                          Vous pouvez trouver votre lien d'avis dans Google My Business.
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Envoi automatique de demande d'avis</div>
                          <p className="text-sm text-muted-foreground">
                            Envoyer automatiquement une demande d'avis lorsqu'un SAV est marqué comme "livré"
                          </p>
                        </div>
                        <Switch checked={shopForm.auto_review_enabled} onCheckedChange={checked => setShopForm({
                            ...shopForm,
                            auto_review_enabled: checked
                          })} disabled={!isAdmin} />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Messages d'avis personnalisés
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="custom-sms-message">Message SMS lors de la clôture SAV</Label>
                        <Textarea id="custom-sms-message" value={shopForm.custom_review_sms_message} onChange={e => setShopForm({
                            ...shopForm,
                            custom_review_sms_message: e.target.value
                          })} disabled={!isAdmin} rows={3} placeholder="Message personnalisé pour SMS..." />
                        <p className="text-sm text-muted-foreground mt-2">
                          Variables disponibles : {"{customer_name}"}, {"{case_number}"}, {"{status}"}, {"{review_link}"}, {"{shop_name}"}
                        </p>
                      </div>
                      
                      <div>
                        <Label htmlFor="custom-chat-message">Message chat pour demande d'avis</Label>
                        <Textarea id="custom-chat-message" value={shopForm.custom_review_chat_message} onChange={e => setShopForm({
                            ...shopForm,
                            custom_review_chat_message: e.target.value
                          })} disabled={!isAdmin} rows={6} placeholder="Message personnalisé pour chat..." />
                        <p className="text-sm text-muted-foreground mt-2">
                          Variables disponibles : {"{customer_name}"}, {"{review_link}"}, {"{shop_name}"}. Utilisez \\n pour les retours à la ligne.
                        </p>
                      </div>
                    </div>
                  </div>

                  {isAdmin && <Button onClick={handleSaveShop} disabled={saving}>
                      {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </Button>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5" />
                    Notifications diverses
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-4">Paramètres généraux</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Avertissement nouveau SAV</div>
                          <p className="text-sm text-muted-foreground">Afficher un avertissement pour vérifier les comptes et codes de déverrouillage d'un téléphone ou autre avant impression/SMS</p>
                        </div>
                        <Switch checked={shopForm.sav_warning_enabled} onCheckedChange={checked => setShopForm({
                            ...shopForm,
                            sav_warning_enabled: checked
                          })} disabled={!isAdmin} />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Alertes de retard SAV
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Activer les alertes de retard</div>
                          <p className="text-sm text-muted-foreground">Recevoir des notifications avant qu'un SAV soit en retard</p>
                        </div>
                        <Switch checked={shopForm.sav_delay_alerts_enabled || false} onCheckedChange={checked => setShopForm({
                            ...shopForm,
                            sav_delay_alerts_enabled: checked
                          })} disabled={!isAdmin} />
                      </div>
                      
                      {shopForm.sav_delay_alerts_enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                          <div>
                            <Label htmlFor="sav-client-alert-days">
                              Alerte SAV Client (jours avant)
                            </Label>
                            <Input 
                              id="sav-client-alert-days" 
                              type="number" 
                              min="1" 
                              max="10" 
                              value={shopForm.sav_client_alert_days || 2} 
                              onChange={e => setShopForm({
                                ...shopForm,
                                sav_client_alert_days: parseInt(e.target.value) || 2
                              })} 
                              disabled={!isAdmin} 
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Délai configuré: {shopForm.max_sav_processing_days_client || 7} jours
                            </p>
                          </div>
                          <div>
                            <Label htmlFor="sav-external-alert-days">
                              Alerte SAV Externe (jours avant)
                            </Label>
                            <Input 
                              id="sav-external-alert-days" 
                              type="number" 
                              min="1" 
                              max="10" 
                              value={shopForm.sav_external_alert_days || 2} 
                              onChange={e => setShopForm({
                                ...shopForm,
                                sav_external_alert_days: parseInt(e.target.value) || 2
                              })} 
                              disabled={!isAdmin} 
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Délai configuré: {shopForm.max_sav_processing_days_external || 9} jours
                            </p>
                          </div>
                          <div>
                            <Label htmlFor="sav-internal-alert-days">
                              Alerte SAV Magasin (jours avant)
                            </Label>
                            <Input 
                              id="sav-internal-alert-days" 
                              type="number" 
                              min="1" 
                              max="10" 
                              value={shopForm.sav_internal_alert_days || 2} 
                              onChange={e => setShopForm({
                                ...shopForm,
                                sav_internal_alert_days: parseInt(e.target.value) || 2
                              })} 
                              disabled={!isAdmin} 
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Délai configuré: {shopForm.max_sav_processing_days_internal || 5} jours
                            </p>
                          </div>
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Les notifications apparaîtront dans la cloche de notification lorsque les SAV approchent de leur délai maximum.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-4">Notifications sonores</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Son des nouveaux messages clients</div>
                          <p className="text-sm text-muted-foreground">Jouer un son lorsqu'un client envoie un message.</p>
                        </div>
                        <Switch checked={typeof window !== 'undefined' ? localStorage.getItem('chatSoundEnabled') !== 'false' : true} onCheckedChange={val => {
                            localStorage.setItem('chatSoundEnabled', val ? 'true' : 'false');
                          }} />
                      </div>
                    </div>
                  </div>

                  {isAdmin && <Button onClick={handleSaveShop} disabled={saving}>
                      {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </Button>}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sms" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Crédits SMS - Plan {subscription?.subscription_tier || 'free'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <h3 className="font-medium mb-1">Crédits disponibles</h3>
                      <div className="text-2xl font-bold">
                        {(subscription?.sms_credits_allocated || 0) - (subscription?.sms_credits_used || 0)}
                      </div>
                      <p className="text-sm text-muted-foreground">SMS restants</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <h3 className="font-medium mb-1">Utilisés ce mois</h3>
                      <div className="text-2xl font-bold">{subscription?.sms_credits_used || 0}</div>
                      <p className="text-sm text-muted-foreground">SMS envoyés</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <SMSPackagesDisplay />
            </TabsContent>

            <TabsContent value="appearance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Apparence et Thème
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">Mode d'affichage</Label>
                      <p className="text-sm text-muted-foreground mb-4">
                        Personnalisez l'apparence de l'interface selon vos préférences
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {/* Option Mode Clair */}
                      <div className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/25'}`} onClick={() => setTheme('light')}>
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                              {theme === 'light' && <div className="w-2 h-2 rounded-full bg-primary"></div>}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Sun className="h-4 w-4" />
                              <span className="font-medium">Mode Clair</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Interface claire et lumineuse, idéale pour le travail de jour
                            </p>
                          </div>
                          <div className="w-16 h-10 bg-white border rounded-md shadow-sm flex items-center justify-center">
                            <div className="w-8 h-2 bg-gray-200 rounded"></div>
                          </div>
                        </div>
                      </div>

                      {/* Option Mode Sombre */}
                      <div className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/25'}`} onClick={() => setTheme('dark')}>
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                              {theme === 'dark' && <div className="w-2 h-2 rounded-full bg-primary"></div>}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Moon className="h-4 w-4" />
                              <span className="font-medium">Mode Sombre</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Interface sombre qui réduit la fatigue oculaire, parfait pour les sessions prolongées
                            </p>
                          </div>
                          <div className="w-16 h-10 bg-gray-900 border rounded-md shadow-sm flex items-center justify-center">
                            <div className="w-8 h-2 bg-gray-600 rounded"></div>
                          </div>
                        </div>
                      </div>

                      {/* Option Système */}
                      <div className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${theme === 'system' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/25'}`} onClick={() => setTheme('system')}>
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                              {theme === 'system' && <div className="w-2 h-2 rounded-full bg-primary"></div>}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Monitor className="h-4 w-4" />
                              <span className="font-medium">Automatique (Système)</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              S'adapte automatiquement aux préférences de votre système d'exploitation
                            </p>
                          </div>
                          <div className="w-16 h-10 border rounded-md shadow-sm flex">
                            <div className="w-8 h-full bg-white border-r flex items-center justify-center">
                              <div className="w-4 h-1 bg-gray-200 rounded"></div>
                            </div>
                            <div className="w-8 h-full bg-gray-900 flex items-center justify-center">
                              <div className="w-4 h-1 bg-gray-600 rounded"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="text-sm text-muted-foreground space-y-2">
                        <p className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          Les modifications s'appliquent instantanément
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          Vos préférences sont sauvegardées automatiquement
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </TabsContent>

            {isAdmin && <TabsContent value="users" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Mon Profil
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first-name">Prénom</Label>
                        <Input id="first-name" value={profileForm.first_name} onChange={e => setProfileForm({
                            ...profileForm,
                            first_name: e.target.value
                          })} />
                      </div>
                      <div>
                        <Label htmlFor="last-name">Nom</Label>
                        <Input id="last-name" value={profileForm.last_name} onChange={e => setProfileForm({
                            ...profileForm,
                            last_name: e.target.value
                          })} />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input id="phone" value={profileForm.phone} onChange={e => setProfileForm({
                          ...profileForm,
                          phone: e.target.value
                        })} />
                    </div>
                    <Button onClick={handleSaveProfile} disabled={saving}>
                      {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </Button>
                  </CardContent>
                </Card>

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
                              <Input id="invite-email" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="utilisateur@example.com" />
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
                                const {
                                  data,
                                  error
                                } = await supabase.rpc('create_real_user_for_shop', {
                                  p_email: inviteEmail,
                                  p_password: 'motdepasse123',
                                  // Mot de passe temporaire
                                  p_first_name: '',
                                  p_last_name: '',
                                  p_phone: '',
                                  p_role: inviteRole,
                                  p_shop_id: shop.id
                                });
                                if (error) throw error;
                                toast({
                                  title: "Succès",
                                  description: "Profil utilisateur créé. L'utilisateur pourra se connecter quand il s'inscrira avec cet email."
                                });
                                setInviteEmail('');
                                setIsInviteDialogOpen(false);
                                fetchProfiles();
                              } catch (error: any) {
                                toast({
                                  title: "Erreur",
                                  description: error.message,
                                  variant: "destructive"
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
                      {profiles.map(profile => <div key={profile.id} className="flex items-center justify-between p-4 border rounded-lg">
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
                                {profile.role === 'admin' && <Crown className="h-4 w-4 text-yellow-500" />}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
                                  {profile.role === 'admin' ? 'Administrateur' : 'Technicien'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {profile.user_id !== user?.id && <Button variant="outline" size="sm" onClick={() => deleteUser(profile.id)} className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>}
                          </div>
                        </div>)}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>}

            <TabsContent value="import-export" className="space-y-6">
              {showStockImport ? <ImportStock onBack={() => setShowStockImport(false)} onRefresh={() => {
                  toast({
                    title: 'Import stock',
                    description: 'Import terminé avec succès.'
                  });
                  setShowStockImport(false);
                }} /> : showQuotesImport ? <ImportQuotes onBack={() => setShowQuotesImport(false)} onSuccess={() => {
                  toast({
                    title: 'Import devis',
                    description: 'Import terminé avec succès.'
                  });
                  setShowQuotesImport(false);
                }} /> : showSAVsImport ? <ImportSAVs onBack={() => setShowSAVsImport(false)} onSuccess={() => {
                  toast({
                    title: 'Import SAV',
                    description: 'Import terminé avec succès.'
                  });
                  setShowSAVsImport(false);
                }} /> : <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Exporter les Devis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => handleExportQuotes('csv')}>Exporter CSV</Button>
                      <Button variant="outline" onClick={() => handleExportQuotes('xlsx')}>Exporter Excel</Button>
                      <Button variant="outline" onClick={() => handleExportQuotes('pdf')}>Exporter PDF</Button>
                      <Button onClick={() => setShowQuotesImport(true)} variant="destructive" className="ml-4">
                        <Upload className="h-4 w-4 mr-2" />
                        Importer les devis
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Exporter les SAV
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => handleExportSAVs('csv')}>Exporter CSV</Button>
                      <Button variant="outline" onClick={() => handleExportSAVs('xlsx')}>Exporter Excel</Button>
                      <Button variant="outline" onClick={() => handleExportSAVs('pdf')}>Exporter PDF</Button>
                      <Button onClick={() => setShowSAVsImport(true)} variant="destructive" className="ml-4">
                        <Upload className="h-4 w-4 mr-2" />
                        Importer les SAV
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Stock (Pièces)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => handleExportParts('csv')}>Exporter CSV</Button>
                      <Button variant="outline" onClick={() => handleExportParts('xlsx')}>Exporter Excel</Button>
                      <Button onClick={() => setShowStockImport(true)} className="bg-red-600 hover:bg-red-500">Importer le stock</Button>
                    </CardContent>
                  </Card>
                </>}
            </TabsContent>

            <TabsContent value="sav-statuses" className="space-y-6">
              <SAVStatusesManager />
            </TabsContent>

            <TabsContent value="sav-types" className="space-y-6">
              <SAVTypesManager
                types={savTypes}
                loading={savTypesLoading}
                onRefresh={refetchSavTypes}
              />
            </TabsContent>

            <TabsContent value="subscription" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Abonnement et Crédits SMS
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <h3 className="font-medium mb-1">Plan actuel</h3>
                      <div className="text-2xl font-bold capitalize">
                        {subscription?.subscription_tier || 'Gratuit'}
                      </div>
                      <p className="text-sm text-muted-foreground">Votre abonnement</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <h3 className="font-medium mb-1">Crédits SMS restants</h3>
                      <div className="text-2xl font-bold">
                        {(subscription?.sms_credits_allocated || 0) - (subscription?.sms_credits_used || 0)}
                      </div>
                      <p className="text-sm text-muted-foreground">SMS disponibles</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <h3 className="font-medium mb-1">SAV actifs</h3>
                      <div className="text-2xl font-bold">
                        {subscription?.active_sav_count || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">Dossiers en cours</p>
                    </div>
                  </div>
                  
                  {subscription?.subscribed && <div className="flex justify-center">
                      <Button onClick={openCustomerPortal} variant="outline">
                        Gérer l'abonnement
                      </Button>
                    </div>}
                </CardContent>
              </Card>

              {/* Plans disponibles */}
              <Card>
                <CardHeader>
                  <CardTitle>Plans d'abonnement</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Choisissez le plan qui correspond le mieux à vos besoins
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map(plan => {
                        const isCurrentPlan = subscription?.subscription_tier === plan.name.toLowerCase() || plan.monthly_price === 0 && (!subscription?.subscribed || subscription?.subscription_tier === 'free');

                        // Déterminer l'icône basée sur le nom du plan  
                        let PlanIcon = Star;
                        const planNameLower = plan.name.toLowerCase();
                        if (planNameLower.includes('premium')) {
                          PlanIcon = Crown;
                        } else if (planNameLower.includes('enterprise') || planNameLower.includes('sur mesure')) {
                          PlanIcon = SettingsIcon;
                        }
                        return <Card key={plan.id} className={`relative ${isCurrentPlan ? 'border-primary bg-primary/5' : ''}`}>
                          {isCurrentPlan && <Badge className="absolute -top-2 left-4 bg-primary">
                              Plan Actuel
                            </Badge>}
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <PlanIcon className="h-5 w-5" />
                              {plan.name}
                            </CardTitle>
                            <div className="text-3xl font-bold">
                              {plan.monthly_price === 0 ? 'Gratuit' : `${Number(plan.monthly_price).toFixed(0)}€`}
                              <span className="text-sm font-normal text-muted-foreground">
                                {plan.monthly_price > 0 ? plan.billing_interval === 'year' ? '/an' : '/mois' : ''}
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                {plan.sav_limit === null ? 'SAV illimités' : `${plan.sav_limit} SAV ${plan.sav_limit > 5 ? 'simultanés' : 'maximum'}`}
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                {plan.sms_limit} SMS par mois
                              </div>
                              {Array.isArray(plan.features) && plan.features.map((feature, index) => <div key={index} className="flex items-center gap-2 text-sm">
                                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                  {feature}
                                </div>)}
                            </div>
                            
                            {plan.monthly_price === 0 ? <Button variant="outline" disabled className="w-full">
                                Plan Gratuit
                              </Button> : isCurrentPlan ? <Button variant="outline" disabled className="w-full">
                                Plan Actuel
                              </Button> : plan.contact_only ? <Button onClick={() => window.location.href = `mailto:contact@fixway.fr?subject=Demande de contact pour le plan ${plan.name}&body=Bonjour,%0D%0A%0D%0AJe souhaite obtenir plus d'informations sur le plan ${plan.name}.%0D%0A%0D%0ACordialement`} className="w-full">
                                Nous contacter
                              </Button> : <Button onClick={() => createCheckout(plan.name.toLowerCase() as 'premium' | 'enterprise')} className="w-full">
                                Passer à {plan.name}
                              </Button>}
                          </CardContent>
                        </Card>;
                      })}
                  </div>
                </CardContent>
              </Card>
              
              <SMSPackagesDisplay />
            </TabsContent>

            <TabsContent value="billing" className="space-y-6">
              <BillingInvoices />
            </TabsContent>

          </Tabs>
            </div>
          </main>
        </div>
      </div>
    </div>;
}