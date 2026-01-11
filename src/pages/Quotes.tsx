import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuotes, Quote } from '@/hooks/useQuotes';
import { useShop } from '@/hooks/useShop';
import { useSMS } from '@/hooks/useSMS';
import { useSAVCases } from '@/hooks/useSAVCases';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';
import { QuoteForm } from '@/components/quotes/QuoteForm';
import { SupplierPartsSearch } from '@/components/quotes/SupplierPartsSearch';
import { QuoteView } from '@/components/quotes/QuoteView';
import { QuoteActionDialog } from '@/components/dialogs/QuoteActionDialog';
import { generateQuotePDF } from '@/utils/pdfGenerator';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  FileText,
  Plus,
  Search,
  Mail,
  Download,
  Eye,
  Trash2,
  Calendar,
  MessageSquare,
  Clock,
  CheckCircle,
  Archive,
  RotateCcw,
  RefreshCw
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';

export default function Quotes() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [deletingQuote, setDeletingQuote] = useState<Quote | null>(null);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);
  const [quoteToConvert, setQuoteToConvert] = useState<Quote | null>(null);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [showQuoteActionDialog, setShowQuoteActionDialog] = useState<Quote | null>(null);
  const [selectedSAVType, setSelectedSAVType] = useState<string>('');
  const { quotes, loading, createQuote, deleteQuote, updateQuote, archiveQuote, reactivateQuote } = useQuotes();
  const { createCase } = useSAVCases();
  const { sendQuoteNotification, sendSMS } = useSMS();
  const { shop } = useShop();
  const { toast } = useToast();
  const { getAllTypes, getTypeInfo } = useShopSAVTypes();

  const formatCustomerDisplay = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) return name;
    const last = parts[parts.length - 1];
    const first = parts.slice(0, parts.length - 1).join(' ');
    return `${last.toUpperCase()} ${first.toLowerCase()}`;
  };

  const isQuoteExpired = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const oneMonthLater = new Date(created);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
    return now > oneMonthLater;
  };

  const activeQuotes = quotes.filter(quote => 
    quote.status !== 'rejected' && quote.status !== 'accepted' && quote.status !== 'archived' &&
    (quote.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const acceptedQuotes = quotes.filter(quote => {
    // Inclure seulement les devis acceptés mais pas encore terminés ni archivés
    const isAccepted = quote.status === 'accepted';
    const isNotCompleted = quote.status !== 'completed' && quote.status !== 'archived';
    const matchesSearch = quote.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    return isAccepted && isNotCompleted && matchesSearch;
  });

  const rejectedQuotes = quotes.filter(quote => 
    quote.status === 'rejected' &&
    (quote.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const archivedQuotes = quotes.filter(quote => 
    quote.status === 'archived' &&
    (quote.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateOrUpdateQuote = async (data: any) => {
    if (editingQuote) {
      const result = await updateQuote(editingQuote.id, {
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        // Infos appareil
        device_brand: data.device_brand ? data.device_brand.toUpperCase().trim() : null,
        device_model: data.device_model ? data.device_model.toUpperCase().trim() : null,
        device_imei: data.device_imei || null,
        sku: data.sku,
        problem_description: data.problem_description,
        items: data.items,
        total_amount: data.total_amount,
        status: data.status,
      });
      if (!result.error) {
        setShowForm(false);
        setEditingQuote(null);
        toast({
          title: "Devis modifié",
          description: `Le devis ${editingQuote.quote_number} a été mis à jour avec succès`,
        });
      }
      return { data: null, error: result.error } as any;
    }
    
    // Création d'un nouveau devis
    const result = await createQuote(data);
    if (!result.error && result.data) {
      setShowForm(false);
      // Afficher la popup d'action pour le nouveau devis
      setShowQuoteActionDialog(result.data);
      toast({
        title: "Devis créé",
        description: `Le devis ${result.data.quote_number} a été créé avec succès`,
      });
    }
    return result;
  };

  const handleDeleteQuote = async () => {
    if (!deletingQuote) return;
    const { error } = await deleteQuote(deletingQuote.id);
    if (!error) {
      setDeletingQuote(null);
    }
  };

  const handleArchiveQuote = async (quoteId: string) => {
    const { error } = await archiveQuote(quoteId);
    if (!error) {
      toast({
        title: "Devis archivé",
        description: "Le devis a été archivé avec succès",
      });
    }
  };

  const handleReactivateQuote = async (quoteId: string, previousStatus: Quote['status']) => {
    const { error } = await reactivateQuote(quoteId, previousStatus);
    if (!error) {
      toast({
        title: "Devis réactivé",
        description: "Le devis a été réactivé avec succès",
      });
    }
  };

  const handleViewQuote = (quote: Quote) => {
    setViewingQuote(quote);
  };

  const handleDownloadPDF = (quote: Quote) => {
    try {
      generateQuotePDF(quote, shop);
      toast({
        title: "PDF généré",
        description: "Le PDF du devis a été généré avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de générer le PDF",
        variant: "destructive",
      });
    }
  };

  const handleSendSMS = async (quote: Quote) => {
    if (!quote.customer_phone) {
      toast({
        title: "Erreur",
        description: "Aucun numéro de téléphone renseigné pour ce client",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await sendQuoteNotification(
        quote.customer_phone,
        quote.customer_name,
        quote.quote_number,
        quote.id
      );

      if (result) {
        // Mettre à jour le statut du devis à "sent" avec l'heure d'envoi
        await updateQuote(quote.id, { 
          status: 'sent',
          sms_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        toast({
          title: "SMS envoyé",
          description: `Le devis a été envoyé par SMS à ${quote.customer_phone}`,
        });
      } else {
        throw new Error('Erreur lors de l\'envoi du SMS');
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le SMS",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (quote: Quote, newStatus: Quote['status']) => {
    if (newStatus === 'accepted') {
      // Mettre à jour le statut d'abord avec les infos d'acceptation par le magasin
      const result = await updateQuote(quote.id, { 
        status: newStatus,
        accepted_by: 'shop',
        accepted_at: new Date().toISOString()
      });
      if (!result.error) {
        // Afficher le dialog d'action
        setShowQuoteActionDialog(quote);
      }
      return;
    }
    // Tous les autres statuts sont traités normalement
    const result = await updateQuote(quote.id, { status: newStatus });
    if (!result.error) {
      toast({
        title: "Statut mis à jour",
        description: `Le devis ${quote.quote_number} est maintenant ${getStatusText(newStatus)}`,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'sent': return 'outline';
      case 'viewed': return 'secondary';
      case 'accepted': return 'default';
      case 'rejected': return 'destructive';
      case 'expired': return 'outline';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Brouillon';
      case 'pending_review': return 'En révision';
      case 'sent': return 'Envoyé';
      case 'under_negotiation': return 'En négociation';
      case 'accepted': return 'Accepté';
      case 'rejected': return 'Refusé';
      case 'expired': return 'Expiré';
      default: return status;
    }
  };

  const convertQuoteToSAV = async (type: string) => {
    if (!quoteToConvert) return;
    try {
      // 0) Nettoyer les IDs invalides du devis AVANT toute opération
      const cleanQuote = {
        ...quoteToConvert,
        items: (quoteToConvert.items || []).map(item => ({
          ...item,
          part_id: item.part_id?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) 
            ? item.part_id 
            : null
        }))
      };

      // 1) Mettre le devis à "accepté" pour refléter l'état et nourrir les stats (avec infos d'acceptation si manquantes)
      const updateData: any = { status: 'accepted' };
      if (!quoteToConvert.accepted_by || !quoteToConvert.accepted_at) {
        updateData.accepted_by = 'shop';
        updateData.accepted_at = new Date().toISOString();
      }
      
      const updateRes = await updateQuote(quoteToConvert.id, updateData);
      if (updateRes.error) throw updateRes.error;

      // 2) Récupérer ou créer le client pour lier le SAV
      const getOrCreateCustomerId = async (): Promise<string | null> => {
        if (!shop?.id) return null;

        // Tenter de retrouver par email dans la boutique
        if (cleanQuote.customer_email) {
          const { data: existing, error: findErr } = await supabase
            .from('customers')
            .select('id')
            .eq('shop_id', shop.id)
            .eq('email', cleanQuote.customer_email)
            .maybeSingle();
          if (!findErr && existing?.id) return existing.id;
        }

        // Créer le client à partir du nom / email / téléphone du devis
        const nameParts = (cleanQuote.customer_name || '').trim().split(/\s+/);
        const firstName = nameParts[0] || 'Client';
        const lastName = nameParts.slice(1).join(' ') || 'Devis';

        const { data: created, error: createErr } = await supabase
          .from('customers')
          .insert([
            {
              shop_id: shop.id,
              first_name: firstName,
              last_name: lastName,
              email: cleanQuote.customer_email || null,
              phone: cleanQuote.customer_phone || null,
            },
          ])
          .select('id')
          .maybeSingle();
        if (createErr) throw createErr;
        return created?.id ?? null;
      };

      const customerId = await getOrCreateCustomerId();

      // 3) Créer le dossier SAV avec le client lié
      const totalPublic =
        cleanQuote.items?.reduce(
          (sum, it) => sum + (it.total_price ?? ( (it.quantity || 0) * (it.unit_public_price || 0) )),
          0
        ) || 0;

      const savCaseData = {
        sav_type: type,
        status: 'pending',
        device_brand: (cleanQuote as any).device_brand ? (cleanQuote as any).device_brand.toUpperCase().trim() : null,
        device_model: (cleanQuote as any).device_model ? (cleanQuote as any).device_model.toUpperCase().trim() : null,
        device_imei: (cleanQuote as any).device_imei || null,
        sku: (cleanQuote as any).sku || null,
        problem_description: (cleanQuote as any).problem_description || `Créé depuis devis ${cleanQuote.quote_number}`,
        repair_notes: `[DEVIS] Converti depuis le devis ${cleanQuote.quote_number}`,
        total_time_minutes: 0,
        total_cost: totalPublic,
        shop_id: shop?.id ?? null,
        customer_id: customerId,
        attachments: (cleanQuote as any).attachments || [],
      };

      const savResult = await createCase(savCaseData);
      if (savResult.error || !savResult.data) throw savResult.error ?? new Error('Création SAV échouée');

      const savCaseId = savResult.data.id;

      // 4) Lier le SAV créé au devis original avec le type choisi
      await updateQuote(quoteToConvert.id, { 
        sav_case_id: savCaseId,
        sav_type: type
      });

      // 4) Traitement intelligent des pièces avec gestion du stock
      // Séparer les pièces cataloguées (avec part_id valide) des pièces personnalisées
      const catalogParts = cleanQuote.items.filter((it) => 
        it.part_id && 
        typeof it.part_id === 'string' &&
        it.part_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      );

      const customParts = cleanQuote.items.filter((it) => 
        !it.part_id || 
        typeof it.part_id !== 'string' ||
        !it.part_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      );
      
      // Traiter les pièces cataloguées avec gestion du stock
      if (catalogParts.length > 0) {
        // Récupérer les infos de stock pour toutes les pièces
        const partIds = catalogParts.map(it => it.part_id!);
        const { data: partsStock, error: stockError } = await supabase
          .from('parts')
          .select('id, quantity, reserved_quantity')
          .in('id', partIds);

        if (stockError) throw stockError;

        const partsStockMap = new Map(partsStock?.map(p => [p.id, p]) || []);
        
        const partsToInsert = [];
        const ordersToInsert = [];

        for (const item of catalogParts) {
          const stockInfo = partsStockMap.get(item.part_id!);
          const availableStock = stockInfo ? (stockInfo.quantity - stockInfo.reserved_quantity) : 0;
          const requestedQuantity = item.quantity || 0;

          if (availableStock >= requestedQuantity) {
            // Stock suffisant - insérer directement dans sav_parts
            partsToInsert.push({
              sav_case_id: savCaseId,
              part_id: item.part_id!,
              quantity: requestedQuantity,
              time_minutes: 0,
              unit_price: item.unit_public_price || 0,
              purchase_price: item.unit_purchase_price ?? null,
            });
          } else {
            // Stock insuffisant - créer une commande pour la quantité manquante
            const missingQuantity = requestedQuantity - Math.max(0, availableStock);
            
            // Si il y a du stock partiel, l'ajouter au SAV
            if (availableStock > 0) {
              partsToInsert.push({
                sav_case_id: savCaseId,
                part_id: item.part_id!,
                quantity: availableStock,
                time_minutes: 0,
                unit_price: item.unit_public_price || 0,
                purchase_price: item.unit_purchase_price ?? null,
              });
            }

            // Créer la commande pour la quantité manquante
            ordersToInsert.push({
              shop_id: shop?.id,
              sav_case_id: savCaseId,
              part_id: item.part_id!,
               part_name: item.part_name || 'Pièce du devis',
               part_reference: item.part_reference || '',
              quantity_needed: missingQuantity,
              reason: 'sav_from_quote_stock_insufficient',
              priority: 'high'
            });
          }
        }

        // Insérer les pièces disponibles en stock
        if (partsToInsert.length > 0) {
          const { error: partsError } = await supabase.from('sav_parts').insert(partsToInsert);
          if (partsError) throw partsError;
        }

        // Créer les commandes pour les pièces manquantes
        if (ordersToInsert.length > 0) {
          const { error: ordersError } = await supabase.from('order_items').insert(ordersToInsert);
          if (ordersError) throw ordersError;

          // Changer le statut du SAV à "parts_ordered" si des pièces sont en commande
          const { error: statusError } = await supabase
            .from('sav_cases')
            .update({ status: 'parts_ordered' })
            .eq('id', savCaseId);
          
          if (statusError) throw statusError;
        }
      }

      // 5) Traiter les pièces personnalisées (sans part_id du catalogue)
      if (customParts.length > 0) {
        const customPartsToInsert = customParts.map(item => ({
          sav_case_id: savCaseId,
          part_id: null, // Pas de référence au catalogue
          custom_part_name: item.part_name || 'Pièce personnalisée',
          quantity: item.quantity || 1,
          unit_price: item.unit_public_price || 0,
          purchase_price: item.unit_purchase_price || null,
          time_minutes: 0,
          discount_info: item.discount ? JSON.parse(JSON.stringify(item.discount)) : null,
        }));

        const { error: customPartsError } = await supabase
          .from('sav_parts')
          .insert(customPartsToInsert);
        
        if (customPartsError) {
          console.error('Erreur insertion pièces personnalisées:', customPartsError);
          throw customPartsError;
        }

        console.log(`✅ ${customParts.length} pièce(s) personnalisée(s) transférée(s) vers le SAV`);
      }

      // 6) Envoyer un SMS au client avec le lien de suivi du SAV créé
      if (cleanQuote.customer_phone) {
        try {
          // Récupérer les informations du SAV créé avec le tracking_slug
          const { data: createdSAV, error: savFetchError } = await supabase
            .from('sav_cases')
            .select('case_number, tracking_slug')
            .eq('id', savCaseId)
            .single();

          if (!savFetchError && createdSAV?.tracking_slug) {
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
            const trackingUrl = `${baseUrl}/track/${createdSAV.tracking_slug}`;
            
            const message = `Bonjour ${cleanQuote.customer_name}, votre devis ${cleanQuote.quote_number} a été accepté ! Un dossier SAV ${createdSAV.case_number} a été créé. Suivez l'avancement ici: ${trackingUrl}\n\n⚠️ Ne répondez pas à ce SMS. Pour échanger, utilisez le chat de suivi.`;
            
            await sendSMS({
              toNumber: cleanQuote.customer_phone,
              message,
              type: 'sav_notification',
              recordId: savCaseId,
            });
          }
        } catch (smsError) {
          console.error('Erreur envoi SMS de suivi SAV:', smsError);
          // Ne pas échouer la conversion pour un problème de SMS
        }
      }

      // 7) Supprimer le devis après conversion
      const { error: deleteErr } = await deleteQuote(quoteToConvert.id);
      if (deleteErr) throw deleteErr;

      const typeInfo = getTypeInfo(type);
      toast({
        title: 'Conversion réussie',
        description: `Devis ${quoteToConvert.quote_number} converti en ${typeInfo.label}.${cleanQuote.customer_phone ? ' SMS de suivi envoyé.' : ''}`,
      });
      setQuoteToConvert(null);
      setSelectedSAVType('');
    } catch (error: any) {
      console.error('Erreur conversion devis -> SAV:', error);
      toast({ title: 'Erreur', description: error.message ?? 'Conversion impossible', variant: 'destructive' });
    }
  };

  const renderQuoteCard = (quote: Quote) => (
    <Card key={quote.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <h3 className="font-semibold text-lg">{formatCustomerDisplay(quote.customer_name)}</h3>
              <Badge variant="outline">
                {quote.quote_number}
              </Badge>
              {isQuoteExpired(quote.created_at) ? (
                <Badge variant="destructive">
                  Devis expiré
                </Badge>
              ) : (
                <Badge variant={getStatusColor(quote.status)}>
                  {getStatusText(quote.status)}
                </Badge>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm text-muted-foreground">
              <div>
                <span className="font-medium">Total: </span>
                <span className="text-lg font-bold text-foreground">
                  {quote.total_amount.toFixed(2)}€
                </span>
              </div>
              
              {quote.customer_email && (
                <div>
                  <span className="font-medium">Email: </span>
                  <span>{quote.customer_email}</span>
                </div>
              )}
              
              {quote.customer_phone && (
                <div>
                  <span className="font-medium">Téléphone: </span>
                  <span>{quote.customer_phone}</span>
                </div>
              )}
              
              <div>
                <span className="font-medium">Créé le: </span>
                <span>{new Date(quote.created_at).toLocaleDateString()}</span>
              </div>

              {/* Affichage de qui a accepté le devis */}
              {quote.status === 'accepted' && quote.accepted_by && quote.accepted_at && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <div className="flex flex-col">
                    <span className="font-medium text-xs">
                      Accepté par {quote.accepted_by === 'shop' ? 'le magasin' : 'le client'}
                    </span>
                    <span className="text-xs">
                      {new Date(quote.accepted_at).toLocaleDateString('fr-FR')} à {new Date(quote.accepted_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )}
              
              {quote.status === 'sent' && quote.sms_sent_at && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <div className="flex flex-col">
                    <span className="font-medium text-xs">PDF envoyé par SMS</span>
                    <span className="text-xs">
                      {new Date(quote.sms_sent_at).toLocaleDateString('fr-FR')} à {new Date(quote.sms_sent_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {/* Dropdown de changement de statut - mis en évidence */}
            {quote.status !== 'rejected' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Select
                      value={quote.status}
                      onValueChange={(value) => handleStatusChange(quote, value as Quote['status'])}
                    >
                      <SelectTrigger className="w-44 border-2 border-blue-500 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium shadow-sm dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900 animate-pulse-border">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Changer statut" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 z-50">
                        <SelectItem value="draft">📝 Brouillon</SelectItem>
                        <SelectItem value="sent">📤 Envoyé</SelectItem>
                        <SelectItem value="viewed">👁️ Consulté</SelectItem>
                        <SelectItem value="accepted">✅ Accepté</SelectItem>
                        <SelectItem value="rejected">❌ Refusé</SelectItem>
                        <SelectItem value="expired">⏰ Expiré</SelectItem>
                      </SelectContent>
                    </Select>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Cliquez ici pour valider ou changer le statut du devis</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {/* Bouton de conversion en SAV pour les devis acceptés */}
            {quote.status === 'accepted' && (
              <Button 
                variant="default" 
                size="sm"
                onClick={() => setQuoteToConvert(quote)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Valider le devis
              </Button>
            )}
            
            {quote.status !== 'rejected' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => { setEditingQuote(quote); setShowForm(true); }}
              >
                Modifier
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleViewQuote(quote)}
            >
              <Eye className="h-4 w-4 mr-1" />
              Voir
            </Button>
            {quote.status !== 'rejected' && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDownloadPDF(quote)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  PDF
                </Button>
                {quote.customer_phone && (
                  <Button 
                    variant={quote.status === 'sent' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSendSMS(quote)}
                    className={quote.status === 'sent' ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    {quote.status === 'sent' ? 'Renvoyé SMS' : 'Envoyer SMS'}
                  </Button>
                )}
              </>
            )}
            
            {/* Bouton d'archivage pour devis actifs et acceptés */}
            {(quote.status !== 'rejected' && quote.status !== 'archived') && (
              <Button 
                variant="outline" 
                size="sm" 
                className="text-orange-600 hover:text-orange-700"
                onClick={() => handleArchiveQuote(quote.id)}
              >
                <Archive className="h-4 w-4 mr-1" />
                Archiver
              </Button>
            )}
            
            <Button 
              variant="outline" 
              size="sm" 
              className="text-destructive hover:text-destructive"
              onClick={() => setDeletingQuote(quote)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Supprimer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex h-screen">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
            <main className="flex-1 overflow-y-auto p-6">
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
            <div className="max-w-7xl mx-auto">
              {!showForm ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Gestion des devis</h1>
                    <Button onClick={() => setShowForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nouveau devis
                    </Button>
                  </div>

                  {/* Zone de recherche fournisseurs */}
                  <SupplierPartsSearch />

                  {/* Barre de recherche */}
                  <div className="mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Rechercher un devis par client ou numéro..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Onglets pour séparer les devis actifs et refusés */}
                   <Tabs defaultValue="active" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="active">
                        Devis actifs ({activeQuotes.length})
                      </TabsTrigger>
                      <TabsTrigger value="accepted">
                        Devis acceptés ({acceptedQuotes.length})
                      </TabsTrigger>
                      <TabsTrigger value="rejected">
                        Devis refusés ({rejectedQuotes.length})
                      </TabsTrigger>
                      <TabsTrigger value="archived">
                        Archives ({archivedQuotes.length})
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="active" className="mt-6">
                      <div className="grid gap-4">
                        {activeQuotes.length === 0 ? (
                          <Card>
                            <CardContent className="text-center py-8">
                              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                              <p className="text-muted-foreground">
                                {searchTerm ? 'Aucun devis actif trouvé' : 'Aucun devis actif'}
                              </p>
                              {!searchTerm && (
                                <Button className="mt-4" onClick={() => setShowForm(true)}>
                                  <Plus className="h-4 w-4 mr-2" />
                                  Créer le premier devis
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        ) : (
                          activeQuotes.map(renderQuoteCard)
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="accepted" className="mt-6">
                      <div className="grid gap-4">
                        {acceptedQuotes.length === 0 ? (
                          <Card>
                            <CardContent className="text-center py-8">
                              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                              <p className="text-muted-foreground">
                                {searchTerm ? 'Aucun devis accepté trouvé' : 'Aucun devis accepté'}
                              </p>
                            </CardContent>
                          </Card>
                        ) : (
                          acceptedQuotes.map((quote) => (
                            <Card key={quote.id} className="hover:shadow-md transition-shadow border-green-200">
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-4 mb-2">
                                      <h3 className="font-semibold text-lg">{formatCustomerDisplay(quote.customer_name)}</h3>
                                      <Badge variant="outline">
                                        {quote.quote_number}
                                      </Badge>
                                      <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                                        {getStatusText(quote.status)}
                                      </Badge>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                                      <div>
                                        <span className="font-medium">Total: </span>
                                        <span className="text-lg font-bold text-foreground">
                                          {quote.total_amount.toFixed(2)}€
                                        </span>
                                      </div>
                                      
                                      {quote.customer_phone && (
                                        <div>
                                          <span className="font-medium">Téléphone: </span>
                                          <span>{quote.customer_phone}</span>
                                        </div>
                                      )}
                                      
                                      <div>
                                        <span className="font-medium">Accepté le: </span>
                                        <span>{new Date(quote.updated_at || quote.created_at).toLocaleDateString()}</span>
                                      </div>
                                      
                                      <div className="flex items-center gap-1 text-green-600">
                                        <CheckCircle className="h-3 w-3" />
                                        <span className="font-medium text-xs">Devis validé</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                   <div className="flex items-center gap-2 ml-4">
                                     <Button 
                                       variant="outline" 
                                       size="sm"
                                       onClick={() => handleViewQuote(quote)}
                                     >
                                       <Eye className="h-4 w-4 mr-1" />
                                       Voir
                                     </Button>
                                     <Button 
                                       variant="outline" 
                                       size="sm"
                                       onClick={() => handleDownloadPDF(quote)}
                                     >
                                       <Download className="h-4 w-4 mr-1" />
                                       PDF
                                     </Button>
                                     
                                     {/* Affichage conditionnel : Devis transformé ou bouton de conversion */}
                                     {quote.sav_case_id ? (
                                       <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800">
                                         <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                         <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                           Devis transformé
                                         </span>
                                         <Badge 
                                           variant="outline" 
                                           className="ml-1"
                                           style={{
                                             backgroundColor: `${getTypeInfo(quote.sav_type || 'external').color}20`,
                                             borderColor: getTypeInfo(quote.sav_type || 'external').color,
                                             color: getTypeInfo(quote.sav_type || 'external').color
                                           }}
                                         >
                                           {getTypeInfo(quote.sav_type || 'external').label}
                                         </Badge>
                                       </div>
                                     ) : (
                                       <Button 
                                         variant="default" 
                                         size="sm"
                                         onClick={() => setQuoteToConvert(quote)}
                                         className="bg-green-600 hover:bg-green-700"
                                       >
                                         <Plus className="h-4 w-4 mr-1" />
                                         Convertir en SAV
                                       </Button>
                                     )}
                                      
                                      {/* Bouton d'archivage */}
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="text-orange-600 hover:text-orange-700"
                                        onClick={() => handleArchiveQuote(quote.id)}
                                      >
                                        <Archive className="h-4 w-4 mr-1" />
                                        Archiver
                                      </Button>
                                      
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => deleteQuote(quote.id)}
                                      >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Supprimer
                                      </Button>
                                   </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="rejected" className="mt-6">
                      <div className="grid gap-4">
                        {rejectedQuotes.length === 0 ? (
                          <Card>
                            <CardContent className="text-center py-8">
                              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                              <p className="text-muted-foreground">
                                {searchTerm ? 'Aucun devis refusé trouvé' : 'Aucun devis refusé'}
                              </p>
                            </CardContent>
                          </Card>
                        ) : (
                          rejectedQuotes.map(renderQuoteCard)
                        )}
                      </div>
                     </TabsContent>
                    
                    <TabsContent value="archived" className="mt-6">
                      <div className="grid gap-4">
                        {archivedQuotes.length === 0 ? (
                          <Card>
                            <CardContent className="text-center py-8">
                              <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                              <p className="text-muted-foreground">
                                {searchTerm ? 'Aucun devis archivé trouvé' : 'Aucun devis archivé'}
                              </p>
                            </CardContent>
                          </Card>
                        ) : (
                          archivedQuotes.map((quote) => (
                            <Card key={quote.id} className="hover:shadow-md transition-shadow border-gray-200 opacity-75">
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-4 mb-2">
                                      <h3 className="font-semibold text-lg text-gray-600">{formatCustomerDisplay(quote.customer_name)}</h3>
                                      <Badge variant="outline" className="border-gray-300">
                                        {quote.quote_number}
                                      </Badge>
                                      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                                        <Archive className="h-3 w-3 mr-1" />
                                        Archivé
                                      </Badge>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                                      <div>
                                        <span className="font-medium">Total: </span>
                                        <span className="text-lg font-bold text-foreground">
                                          {quote.total_amount.toFixed(2)}€
                                        </span>
                                      </div>
                                      
                                      {quote.customer_phone && (
                                        <div>
                                          <span className="font-medium">Téléphone: </span>
                                          <span>{quote.customer_phone}</span>
                                        </div>
                                      )}
                                      
                                      <div>
                                        <span className="font-medium">Archivé le: </span>
                                        <span>{new Date(quote.updated_at || quote.created_at).toLocaleDateString()}</span>
                                      </div>
                                      
                                      <div className="flex items-center gap-1 text-gray-500">
                                        <Archive className="h-3 w-3" />
                                        <span className="font-medium text-xs">Devis archivé</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                   <div className="flex items-center gap-2 ml-4">
                                     <Button 
                                       variant="outline" 
                                       size="sm"
                                       onClick={() => handleViewQuote(quote)}
                                     >
                                       <Eye className="h-4 w-4 mr-1" />
                                       Voir
                                     </Button>
                                     
                                     <Button 
                                       variant="outline" 
                                       size="sm"
                                       onClick={() => handleDownloadPDF(quote)}
                                     >
                                       <Download className="h-4 w-4 mr-1" />
                                       PDF
                                     </Button>
                                     
                                     {/* Bouton de réactivation */}
                                     <Button 
                                       variant="default" 
                                       size="sm"
                                       className="bg-blue-600 hover:bg-blue-700"
                                       onClick={() => handleReactivateQuote(quote.id, 'draft')}
                                     >
                                       <RotateCcw className="h-4 w-4 mr-1" />
                                       Réactiver
                                     </Button>
                                     
                                     <Button 
                                       variant="outline" 
                                       size="sm"
                                       className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                       onClick={() => deleteQuote(quote.id)}
                                     >
                                       <Trash2 className="h-4 w-4 mr-1" />
                                       Supprimer
                                     </Button>
                                   </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </>
              ) : (
                <QuoteForm
                  onSubmit={handleCreateOrUpdateQuote}
                  onCancel={() => { setShowForm(false); setEditingQuote(null); }}
                  initialQuote={editingQuote ?? undefined}
                  submitLabel={editingQuote ? 'Mettre à jour le devis' : 'Créer le devis'}
                  title={editingQuote ? 'Modifier le devis' : 'Nouveau devis'}
                />
              )}

              {/* Dialog de vue détaillée */}
              <QuoteView
                quote={viewingQuote}
                isOpen={!!viewingQuote}
                onClose={() => setViewingQuote(null)}
                onDownloadPDF={handleDownloadPDF}
                onSendEmail={() => {}}
                onQuoteUpdate={() => {
                  // Rafraîchir la liste des devis après mise à jour
                  window.location.reload();
                }}
              />

              {/* Dialog de suppression */}
              <Dialog open={!!deletingQuote} onOpenChange={(open) => { if (!open) setDeletingQuote(null); }}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Supprimer le devis</DialogTitle>
                    <DialogDescription id="delete-quote-desc">
                      Êtes-vous sûr de vouloir supprimer le devis "{deletingQuote?.quote_number}" ?
                      Cette action est irréversible.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeletingQuote(null)}>
                      Annuler
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteQuote} aria-describedby="delete-quote-desc">
                      Supprimer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Dialog d'action après validation du devis */}
              <QuoteActionDialog
                isOpen={!!showQuoteActionDialog}
                onClose={() => setShowQuoteActionDialog(null)}
                onPrint={() => {
                  if (showQuoteActionDialog) {
                    handleDownloadPDF(showQuoteActionDialog);
                    setShowQuoteActionDialog(null);
                  }
                }}
                onSendSMS={() => {
                  if (showQuoteActionDialog) {
                    handleSendSMS(showQuoteActionDialog);
                    setShowQuoteActionDialog(null);
                  }
                }}
                onSkip={() => {
                  toast({
                    title: "Devis accepté",
                    description: `Le devis ${showQuoteActionDialog?.quote_number} a été marqué comme accepté`,
                  });
                  setShowQuoteActionDialog(null);
                }}
                onConvertToSAV={() => {
                  if (showQuoteActionDialog) {
                    setQuoteToConvert(showQuoteActionDialog);
                    setShowQuoteActionDialog(null);
                  }
                }}
                quoteNumber={showQuoteActionDialog?.quote_number || ''}
                hasPhone={!!showQuoteActionDialog?.customer_phone}
              />

              {/* Dialog de conversion en SAV avec sélection du type */}
              <Dialog 
                open={!!quoteToConvert} 
                onOpenChange={(open) => { 
                  if (!open) {
                    setQuoteToConvert(null);
                    setSelectedSAVType('');
                  }
                }}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Convertir en SAV</DialogTitle>
                    <DialogDescription id="convert-sav-desc">
                      Choisissez le type de SAV à créer pour le devis "{quoteToConvert?.quote_number}".
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="py-4">
                    <label className="text-sm font-medium mb-2 block">Type de SAV</label>
                    <Select value={selectedSAVType} onValueChange={setSelectedSAVType}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionnez un type de SAV..." />
                      </SelectTrigger>
                      <SelectContent>
                        {getAllTypes().map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: type.color }}
                              />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setQuoteToConvert(null);
                      setSelectedSAVType('');
                    }}>
                      Annuler
                    </Button>
                    <Button 
                      onClick={() => {
                        if (selectedSAVType) {
                          convertQuoteToSAV(selectedSAVType);
                        }
                      }}
                      disabled={!selectedSAVType}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Créer le SAV
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}