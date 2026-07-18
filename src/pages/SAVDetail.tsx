import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { SAVMessaging } from '@/components/sav/SAVMessaging';
import { SAVLoanerCard } from '@/components/loaner/SAVLoanerCard';
import { SAVStatusManager } from '@/components/sav/SAVStatusManager';
import { SAVBarcode } from '@/components/sav/SAVBarcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSAVCases } from '@/hooks/useSAVCases';
import { useShop } from '@/hooks/useShop';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { useShopSAVTypes } from '@/hooks/useShopSAVTypes';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QrCode, ExternalLink, ArrowLeft, Copy, Share, Save, Lock, User, Mail, Phone, MapPin, CheckCircle, X, MessageSquare, Edit, Clock, CalendarPlus, ScrollText, AlertCircle } from 'lucide-react';
import { SMSButton } from '@/components/sav/SMSButton';
import { ProblemDescriptionDisplay } from '@/components/sav/ProblemDescriptionHighlight';
import { useNavigate } from 'react-router-dom';
import { SAVPartsEditor } from '@/components/sav/SAVPartsEditor';
import { SAVPartsRequirements } from '@/components/sav/SAVPartsRequirements';
import { SAVPrintButton } from '@/components/sav/SAVPrint';
import { ReviewRequestButton } from '@/components/sav/ReviewRequestButton';
import { SAVDocuments } from '@/components/sav/SAVDocuments';
import { PatternLock } from '@/components/sav/PatternLock';
import { SecurityCodesDisplay } from '@/components/sav/SecurityCodesDisplay';
import { generateShortTrackingUrl } from '@/utils/trackingUtils';
import { generateSAVRestitutionPDF } from '@/utils/pdfGenerator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AITextReformulator } from '@/components/sav/AITextReformulator';
import { EditSAVCustomerDialog } from '@/components/sav/EditSAVCustomerDialog';
import { EditSAVDetailsDialog } from '@/components/sav/EditSAVDetailsDialog';
import { AppointmentProposalDialog } from '@/components/agenda/AppointmentProposalDialog';
import { useProfile } from '@/hooks/useProfile';
import { logSAVChange, getCurrentUserName } from '@/hooks/useSAVAuditLog';
import { ProductRecurrenceBadge } from '@/components/sav/ProductRecurrenceBadge';
import { ProductHistoryBanner } from '@/components/sav/ProductHistoryBanner';
import { SAVCodesTab } from '@/components/sav/SAVCodesTab';
import { SAVDiagnosticTab } from '@/components/sav/SAVDiagnosticTab';
import { useSAVCaseUnreadCount, useSAVCaseHasActiveLoan } from '@/hooks/useSAVCaseIndicators';
import { Stethoscope, KeyRound, Smartphone } from 'lucide-react';
export default function SAVDetail() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [privateComments, setPrivateComments] = useState('');
  const [savingComments, setSavingComments] = useState(false);
  const {
    cases,
    loading,
    updateTechnicianComments,
    updatePrivateComments,
  } = useSAVCases();

  const refreshSavCustomer = async () => {
    if (!id) return;
    const { data: caseRow } = await supabase
      .from('sav_cases')
      .select('customer_id')
      .eq('id', id)
      .maybeSingle();
    const newCustomerId = caseRow?.customer_id || null;
    let newCustomer: any = undefined;
    if (newCustomerId) {
      const { data: cust } = await supabase
        .from('customers')
        .select('first_name, last_name, email, phone, address')
        .eq('id', newCustomerId)
        .maybeSingle();
      newCustomer = cust || undefined;
    }
    setSavCase((prev: any) => prev ? { ...prev, customer_id: newCustomerId, customer: newCustomer } : prev);
  };

  const {
    shop
  } = useShop();
  const { getStatusInfo, isReadyStatus } = useShopSAVStatuses();
  const { profile: userProfile, actualProfile } = useProfile();
  const isAdmin = userProfile?.role === 'admin' || actualProfile?.role === 'super_admin';
  const { getAllTypes, getTypeInfo } = useShopSAVTypes();
  const [savCase, setSavCase] = useState<any>(null);
  const [technicianComments, setTechnicianComments] = useState('');
  const [editingSavType, setEditingSavType] = useState(false);
  const [tempSavType, setTempSavType] = useState('');
  const [savingTechnicianComments, setSavingTechnicianComments] = useState(false);
  const { data: unreadCount = 0 } = useSAVCaseUnreadCount(id);
  const { data: hasActiveLoan = false } = useSAVCaseHasActiveLoan(id);
  useEffect(() => {
    if (cases && id) {
      const foundCase = cases.find(c => c.id === id);
      setSavCase(foundCase);
      // Charger les commentaires privés
      if (foundCase?.private_comments) {
        setPrivateComments(foundCase.private_comments);
      }
      // Charger les commentaires technicien
      if (foundCase?.technician_comments) {
        setTechnicianComments(foundCase.technician_comments);
      }
    }
  }, [cases, id]);

  // Mise à jour en temps réel du SAV case et des pièces
  useEffect(() => {
    if (!id) return;
    const channel = supabase.channel('sav-case-realtime').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'sav_cases',
      filter: `id=eq.${id}`
    }, payload => {
      console.log('SAV case updated:', payload);
      if (payload.eventType === 'UPDATE' && payload.new) {
        setSavCase((prevCase: any) => {
          const customerChanged = payload.new.customer_id !== prevCase?.customer_id;
          if (customerChanged) {
            // Recharge ciblée des infos client
            refreshSavCustomer();
          }
          return {
            ...prevCase,
            ...payload.new,
            // Conserver la relation customer si customer_id inchangé, sinon laisser refreshSavCustomer la repeupler
            customer: customerChanged ? undefined : prevCase?.customer,
          };
        });
        // Mettre à jour les commentaires privés si ils ont changé
        if (payload.new.private_comments !== undefined) {
          setPrivateComments(payload.new.private_comments || '');
        }
        // Mettre à jour les commentaires technicien si ils ont changé
        if (payload.new.technician_comments !== undefined) {
          setTechnicianComments(payload.new.technician_comments || '');
        }
      }
    }).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'sav_parts',
      filter: `sav_case_id=eq.${id}`
    }, payload => {
      console.log('SAV parts updated:', payload);
      // Recalculer le prix total automatiquement
      // Le trigger de la base de données se charge déjà de mettre à jour le total_cost dans sav_cases
      // La mise à jour sera captée par l'écoute sur sav_cases ci-dessus
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);
  const generateTrackingUrl = () => {
    if (!savCase?.tracking_slug) return '';
    return generateShortTrackingUrl(savCase.tracking_slug);
  };
  const generateQRCode = async () => {
    const url = generateTrackingUrl();
    // Open QR code generator
    window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`, '_blank');
    toast({
      title: "QR Code généré",
      description: "Le QR Code s'ouvre dans un nouvel onglet"
    });
  };
  const copyTrackingUrl = async () => {
    try {
      await navigator.clipboard.writeText(generateTrackingUrl());
      toast({
        title: "Lien copié",
        description: "Le lien de suivi a été copié dans le presse-papier"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le lien",
        variant: "destructive"
      });
    }
  };
  const handleStatusUpdated = () => {
    // Plus besoin de refetch, le realtime se charge de la mise à jour
  };
  const saveTechnicianComments = async () => {
    if (!savCase?.id) return;
    setSavingTechnicianComments(true);
    try {
      const oldVal = savCase.technician_comments || '';
      await updateTechnicianComments(savCase.id, technicianComments);
      if (oldVal !== technicianComments && savCase.shop_id) {
        const name = await getCurrentUserName();
        await logSAVChange(savCase.id, savCase.shop_id, 'sav_cases', 'update', 'technician_comments', oldVal || null, technicianComments || null, name);
      }
      setSavCase({ ...savCase, technician_comments: technicianComments });
    } catch (error) {
    } finally {
      setSavingTechnicianComments(false);
    }
  };
  const savePrivateComments = async () => {
    if (!savCase?.id) return;
    setSavingComments(true);
    try {
      const oldVal = savCase.private_comments || '';
      await updatePrivateComments(savCase.id, privateComments);
      if (oldVal !== privateComments && savCase.shop_id) {
        const name = await getCurrentUserName();
        await logSAVChange(savCase.id, savCase.shop_id, 'sav_cases', 'update', 'private_comments', oldVal || null, privateComments || null, name);
      }
      setSavCase({ ...savCase, private_comments: privateComments });
    } catch (error) {
    } finally {
      setSavingComments(false);
    }
  };

  const updateSavType = async () => {
    if (!savCase?.id || !tempSavType) {
      console.log('updateSavType: Missing data', { savCaseId: savCase?.id, tempSavType });
      return;
    }
    
    console.log('updateSavType: Starting update', { 
      savCaseId: savCase.id, 
      currentType: savCase.sav_type, 
      newType: tempSavType 
    });
    
    try {
      const { error } = await supabase
        .from('sav_cases')
        .update({ sav_type: tempSavType })
        .eq('id', savCase.id);
      
      if (error) {
        console.error('updateSavType: Supabase error', error);
        throw error;
      }
      
      if (savCase.shop_id) {
        const name = await getCurrentUserName();
        await logSAVChange(savCase.id, savCase.shop_id, 'sav_cases', 'update', 'sav_type', savCase.sav_type, tempSavType, name);
      }
      
      setSavCase({
        ...savCase,
        sav_type: tempSavType
      });
      
      setEditingSavType(false);
      toast({
        title: "Succès",
        description: "Type de SAV mis à jour"
      });
    } catch (error: any) {
      console.error('updateSavType: Full error', error);
      toast({
        title: "Erreur",
        description: `Impossible de modifier le type de SAV: ${error.message || error}`,
        variant: "destructive"
      });
    }
  };

  const cancelEditSavType = () => {
    setEditingSavType(false);
    setTempSavType('');
  };

  const handleAttachmentsUpdate = (newAttachments: any[]) => {
    setSavCase({
      ...savCase,
      attachments: newAttachments
    });
  };
  if (loading) {
    return <main className="flex-1 overflow-y-auto p-6">
              <div className="text-center">Chargement...</div>
            </main>;
  }
  if (!savCase) {
    return <main className="flex-1 overflow-y-auto p-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Dossier SAV introuvable</h1>
                <Button onClick={() => navigate('/sav')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour à la liste
                </Button>
              </div>
            </main>;
  }
  const statusConfig = {
    pending: {
      label: 'En attente',
      variant: 'secondary' as const
    },
    in_progress: {
      label: 'En cours',
      variant: 'default' as const
    },
    testing: {
      label: 'Tests',
      variant: 'default' as const
    },
    ready: {
      label: 'Prêt',
      variant: 'default' as const
    },
    delivered: {
      label: 'Livré',
      variant: 'default' as const
    },
    cancelled: {
      label: 'Annulé',
      variant: 'destructive' as const
    }
  };
  const isSimplifiedView = typeof window !== 'undefined' && localStorage.getItem('fixway_simplified_view') === 'true';

  if (isSimplifiedView) {
    const customerFullName = `${savCase.customer?.first_name || ''} ${savCase.customer?.last_name || ''}`.trim();
    const contactName = savCase.sav_type === 'client' ? customerFullName : (savCase.external_contact_name || 'Contact externe');
    const initialTab = (() => {
      try { return localStorage.getItem('fixway_sav_detail_tab') || 'apercu'; } catch { return 'apercu'; }
    })();
    return (
      <main className="flex-1 overflow-y-auto">
        {/* Bandeau sticky de contexte */}
        <div className="sticky top-0 z-30 bg-slate-800 text-slate-50 border-b border-slate-900 shadow-md">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2 md:gap-3 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => navigate('/sav')} className="shrink-0">
              <ArrowLeft className="h-4 w-4 mr-1" /> Retour
            </Button>
            <h1 className="text-lg font-bold whitespace-nowrap">{savCase.case_number}</h1>
            <Badge
              variant="outline"
              className="px-2 py-0.5"
              style={{
                backgroundColor: `${getTypeInfo(savCase.sav_type).color}20`,
                color: getTypeInfo(savCase.sav_type).color,
                borderColor: getTypeInfo(savCase.sav_type).color,
              }}
            >
              {getTypeInfo(savCase.sav_type).label}
            </Badge>
            <Badge variant={getStatusInfo(savCase.status)?.variant || 'secondary'}>
              {getStatusInfo(savCase.status)?.label || savCase.status}
            </Badge>
            {(savCase.device_brand || savCase.device_model) && (
              <span className="text-sm text-muted-foreground truncate">
                {[savCase.device_brand, savCase.device_model].filter(Boolean).join(' — ')}
              </span>
            )}
            {(customerFullName || savCase.customer?.phone) && (
              <span className="ml-auto text-sm font-medium truncate max-w-[240px]">
                {customerFullName}{savCase.customer?.phone ? ` · ${savCase.customer.phone}` : ''}
              </span>
            )}
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-4 md:p-6">
          <Tabs
            defaultValue={initialTab}
            onValueChange={(v) => { try { localStorage.setItem('fixway_sav_detail_tab', v); } catch {} }}
            className="space-y-4"
          >
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="apercu">Aperçu</TabsTrigger>
              <TabsTrigger value="communication" className="relative">
                Communication
                {unreadCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="pieces">Pièces</TabsTrigger>
              <TabsTrigger value="codes">
                <KeyRound className="h-3.5 w-3.5 mr-1" /> Codes
              </TabsTrigger>
              <TabsTrigger value="diagnostic">
                <Stethoscope className="h-3.5 w-3.5 mr-1" /> Diagnostic
              </TabsTrigger>
              {hasActiveLoan && (
                <TabsTrigger value="loaner" className="text-destructive data-[state=active]:text-destructive data-[state=active]:border-destructive">
                  <Smartphone className="h-3.5 w-3.5 mr-1" /> Prêt matériel
                </TabsTrigger>
              )}
              <TabsTrigger value="impression">Impression</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            {/* Onglet Aperçu */}
            <TabsContent value="apercu" className="space-y-4">
              <ProductHistoryBanner
                shopId={savCase.shop_id}
                imei={savCase.device_imei}
                sku={savCase.sku}
                brand={savCase.device_brand}
                model={savCase.device_model}
                excludeSavId={savCase.id}
              />
              <ProblemDescriptionDisplay value={savCase.problem_description} />


              {getTypeInfo(savCase.sav_type).show_customer_info && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" /> Client
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Nom</p>
                      <p className="font-medium">{customerFullName || 'Non renseigné'}</p>
                    </div>
                    {savCase.customer?.phone && (
                      <div>
                        <p className="text-xs text-muted-foreground">Téléphone</p>
                        <p className="font-medium">{savCase.customer.phone}</p>
                      </div>
                    )}
                    {savCase.customer?.email && (
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium truncate">{savCase.customer.email}</p>
                      </div>
                    )}
                    {savCase.customer?.address && (
                      <div>
                        <p className="text-xs text-muted-foreground">Adresse</p>
                        <p className="font-medium">{savCase.customer.address}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Appareil & dossier</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Marque / Modèle</p>
                    <p className="font-medium">{[savCase.device_brand, savCase.device_model].filter(Boolean).join(' ') || '—'}</p>
                  </div>
                  {savCase.device_imei && (
                    <div>
                      <p className="text-xs text-muted-foreground">IMEI</p>
                      <p className="font-medium break-all">{savCase.device_imei}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Créé le</p>
                    <p className="font-medium">{format(new Date(savCase.created_at), 'dd/MM/yyyy', { locale: fr })}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Coût total</p>
                    <p className="font-medium">{savCase.total_cost}€</p>
                  </div>
                </CardContent>
              </Card>



              <SAVStatusManager savCase={savCase} onStatusUpdated={handleStatusUpdated} />
            </TabsContent>

            {/* Onglet Communication */}
            <TabsContent value="communication" className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {getTypeInfo(savCase.sav_type).show_customer_info && (
                  <SMSButton
                    customerPhone={savCase.customer?.phone || savCase.external_contact_phone || ''}
                    customerName={customerFullName || savCase.external_contact_name || 'Contact'}
                    caseNumber={savCase.case_number}
                    caseId={savCase.id}
                    size="sm"
                    variant="outline"
                  />
                )}
                {getTypeInfo(savCase.sav_type).show_customer_info && (
                  <AppointmentProposalDialog
                    savCaseId={savCase.id}
                    customerId={savCase.customer_id}
                    customerName={customerFullName || 'Client'}
                    customerPhone={savCase.customer?.phone}
                    caseNumber={savCase.case_number}
                    deviceInfo={{ brand: savCase.device_brand, model: savCase.device_model }}
                    trigger={
                      <Button variant="outline" size="sm">
                        <CalendarPlus className="h-4 w-4 mr-2" /> Proposer RDV
                      </Button>
                    }
                  />
                )}
                <Button variant="outline" size="sm" onClick={copyTrackingUrl}>
                  <Share className="h-4 w-4 mr-2" /> Partager le lien
                </Button>
                {isReadyStatus(savCase.status) && (
                  <ReviewRequestButton
                    savCaseId={savCase.id}
                    shopId={savCase.shop_id}
                    customerName={contactName}
                    caseNumber={savCase.case_number}
                  />
                )}
              </div>

              <SAVMessaging
                savCaseId={savCase.id}
                savCaseNumber={savCase.case_number}
                customerPhone={savCase.customer?.phone || savCase.external_contact_phone}
                customerName={contactName}
                shopId={savCase.shop_id}
                customerId={savCase.customer_id}
                showSatisfactionButton={getTypeInfo(savCase.sav_type).show_satisfaction_survey}
              />

              {savCase.sav_type !== 'internal' && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Share className="h-4 w-4" /> Lien de suivi
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-primary text-primary-foreground rounded-lg text-sm break-all font-mono">
                      {savCase?.tracking_slug ? `fixway.fr/track/${savCase.tracking_slug}` : 'Slug non généré'}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={copyTrackingUrl}>
                        <Copy className="h-4 w-4 mr-2" /> Copier
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => window.open(generateTrackingUrl(), '_blank')}>
                        <ExternalLink className="h-4 w-4 mr-2" /> Prévisualiser
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Onglet Pièces */}
            <TabsContent value="pieces" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Pièces du dossier</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Ajoutez, retirez ou ajustez les pièces liées à ce dossier SAV.
                  </p>
                  <div>
                    <SAVPartsEditor savCaseId={savCase.id} onPartsUpdated={() => {}} />
                  </div>
                  <div className="pt-2 text-sm">
                    <span className="text-muted-foreground">Coût total actuel : </span>
                    <span className="font-semibold">{savCase.total_cost}€</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet Impression */}
            <TabsContent value="impression" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Document de prise en charge</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Imprimez le récapitulatif du dossier (à remettre au client lors du dépôt).
                  </p>
                  <SAVPrintButton savCase={savCase} />
                </CardContent>
              </Card>

              {isReadyStatus(savCase.status) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Document de restitution</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      À imprimer quand l'appareil est rendu au client.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const { data: freshCase } = await supabase
                            .from('sav_cases')
                            .select('*, customers(*)')
                            .eq('id', savCase.id)
                            .single();
                          const caseForPDF = freshCase
                            ? { ...savCase, closure_history: (freshCase.closure_history || []) as any, customer: (freshCase as any).customers || savCase.customer }
                            : savCase;
                          await generateSAVRestitutionPDF(caseForPDF, shop);
                          toast({ title: 'Document de restitution', description: "Le document est en cours d'impression." });
                        } catch (error) {
                          toast({ title: 'Erreur', description: 'Impossible de générer le document.', variant: 'destructive' });
                        }
                      }}
                      className="bg-primary/10 hover:bg-primary/20"
                    >
                      Imprimer restitution
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <QrCode className="h-4 w-4" /> Étiquette / QR code
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SAVBarcode
                    savCase={savCase}
                    savTypeLabel={getTypeInfo(savCase.sav_type).label}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Onglet Codes */}
            <TabsContent value="codes" className="space-y-4">
              <SAVCodesTab savCase={savCase} />
            </TabsContent>

            {/* Onglet Diagnostic IA */}
            <TabsContent value="diagnostic" className="space-y-4">
              <SAVDiagnosticTab savCase={savCase} />
            </TabsContent>

            {/* Onglet Prêt matériel */}
            {hasActiveLoan && (
              <TabsContent value="loaner" className="space-y-4">
                <SAVLoanerCard savCaseId={savCase.id} customerId={savCase.customer_id} />
              </TabsContent>
            )}

            {/* Onglet Documents */}
            <TabsContent value="documents" className="space-y-4">
              <SAVDocuments
                savCaseId={savCase.id}
                attachments={savCase.attachments || []}
                onAttachmentsUpdate={handleAttachmentsUpdate}
              />
            </TabsContent>


          </Tabs>
        </div>
      </main>
    );
  }

  const customerFullNameStd = `${savCase.customer?.first_name || ''} ${savCase.customer?.last_name || ''}`.trim();
  const contactNameStd = savCase.sav_type === 'client' ? customerFullNameStd : (savCase.external_contact_name || 'Contact externe');
  const initialTabStd = (() => {
    try { return localStorage.getItem('fixway_sav_detail_tab') || 'apercu'; } catch { return 'apercu'; }
  })();

  return (
    <main className="flex-1 overflow-y-auto">
      {/* Bandeau sticky de contexte */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2 md:gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate('/sav')} className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
          <h1 className="text-lg md:text-xl font-bold whitespace-nowrap">{savCase.case_number}</h1>

          {editingSavType ? (
            <div className="flex items-center gap-2">
              <Select value={tempSavType} onValueChange={setTempSavType}>
                <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {getAllTypes().map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={updateSavType} disabled={!tempSavType}><Save className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" onClick={cancelEditSavType}><X className="h-4 w-4" /></Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Badge
                variant="outline"
                className="px-2 py-0.5"
                style={{
                  backgroundColor: `${getTypeInfo(savCase.sav_type).color}20`,
                  color: getTypeInfo(savCase.sav_type).color,
                  borderColor: getTypeInfo(savCase.sav_type).color,
                }}
              >
                {getTypeInfo(savCase.sav_type).label}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => { setEditingSavType(true); setTempSavType(savCase.sav_type); }}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <Badge variant={getStatusInfo(savCase.status)?.variant || 'secondary'}>
            {getStatusInfo(savCase.status)?.label || savCase.status}
          </Badge>

          {(savCase as any).taken_over_by && (
            <Badge className="bg-primary text-primary-foreground border-2 border-primary px-2 py-0.5 font-bold tracking-wider">
              👤 {(savCase as any).taken_over_by}
            </Badge>
          )}

          {(savCase.device_brand || savCase.device_model) && (
            <span className="text-sm text-muted-foreground truncate">
              {[savCase.device_brand, savCase.device_model].filter(Boolean).join(' — ')}
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            {customerFullNameStd && (
              <span className="text-sm font-medium truncate max-w-[220px]">
                {customerFullNameStd}{savCase.customer?.phone ? ` · ${savCase.customer.phone}` : ''}
              </span>
            )}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/sav/${id}/logs`)}
                className="border-destructive text-destructive hover:bg-destructive/10"
              >
                <ScrollText className="h-4 w-4 mr-1" /> Log
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <Tabs
          defaultValue={initialTabStd}
          onValueChange={(v) => { try { localStorage.setItem('fixway_sav_detail_tab', v); } catch {} }}
          className="space-y-4"
        >
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="apercu">Aperçu</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="pieces">Pièces</TabsTrigger>
            <TabsTrigger value="impression">Impression</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          {/* Onglet Aperçu */}
          <TabsContent value="apercu" className="space-y-4">
            <ProductHistoryBanner
              shopId={savCase.shop_id}
              imei={savCase.device_imei}
              sku={savCase.sku}
              brand={savCase.device_brand}
              model={savCase.device_model}
              excludeSavId={savCase.id}
            />

            <ProblemDescriptionDisplay value={savCase.problem_description} />

            {/* Coordonnées client */}
            {getTypeInfo(savCase.sav_type).show_customer_info && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Coordonnées du client
                    </div>
                    <EditSAVCustomerDialog
                      savCaseId={savCase.id}
                      shopId={savCase.shop_id}
                      currentCustomerId={savCase.customer_id}
                      currentCustomerName={savCase.customer ? `${savCase.customer.first_name} ${savCase.customer.last_name}` : undefined}
                      onCustomerUpdated={() => { refreshSavCustomer(); }}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Nom complet</p>
                      <p className="font-medium">{customerFullNameStd || 'Non renseigné'}</p>
                    </div>
                  </div>
                  {savCase.customer?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{savCase.customer.email}</p>
                      </div>
                    </div>
                  )}
                  {savCase.customer?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Téléphone</p>
                        <p className="font-medium">{savCase.customer.phone}</p>
                      </div>
                    </div>
                  )}
                  {savCase.customer?.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Adresse</p>
                        <p className="font-medium">{savCase.customer.address}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Détails du dossier */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Détails du dossier</span>
                  <EditSAVDetailsDialog
                    savCaseId={savCase.id}
                    shopId={savCase.shop_id}
                    currentDetails={{
                      device_brand: savCase.device_brand,
                      device_model: savCase.device_model,
                      device_imei: savCase.device_imei,
                      problem_description: savCase.problem_description,
                      repair_notes: savCase.repair_notes,
                      sku: savCase.sku,
                    }}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><strong>Appareil:</strong> {savCase.device_brand} {savCase.device_model}</div>
                {savCase.device_imei && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span><strong>IMEI:</strong> {savCase.device_imei}</span>
                    <ProductRecurrenceBadge shopId={savCase.shop_id} imei={savCase.device_imei} excludeSavId={savCase.id} />
                  </div>
                )}
                {savCase.sku && <div><strong>SKU:</strong> {savCase.sku}</div>}
                <div><strong>Date de création:</strong> {format(new Date(savCase.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}</div>
                <div><strong>Coût total:</strong> {savCase.total_cost}€</div>
                {savCase.repair_notes && (
                  <div className="md:col-span-2">
                    <strong>Notes de réparation:</strong>
                    <p className="mt-1 text-muted-foreground">{savCase.repair_notes}</p>
                  </div>
                )}
                {savCase.details_updated_at && (
                  <div className="md:col-span-2 mt-2 pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        Détails modifiés le {format(new Date(savCase.details_updated_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                        {savCase.updated_by_profile && ` par ${savCase.updated_by_profile.first_name} ${savCase.updated_by_profile.last_name}`}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Accessoires */}
            {(savCase.accessories?.charger || savCase.accessories?.case || savCase.accessories?.screen_protector || savCase.accessories?.other) && (
              <Card>
                <CardHeader><CardTitle>Accessoires présents</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      {savCase.accessories?.charger ? <CheckCircle className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-muted-foreground" />}
                      <span className={savCase.accessories?.charger ? 'text-green-600' : 'text-muted-foreground'}>Chargeur</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {savCase.accessories?.case ? <CheckCircle className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-muted-foreground" />}
                      <span className={savCase.accessories?.case ? 'text-green-600' : 'text-muted-foreground'}>Coque</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {savCase.accessories?.screen_protector ? <CheckCircle className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-muted-foreground" />}
                      <span className={savCase.accessories?.screen_protector ? 'text-green-600' : 'text-muted-foreground'}>Protection d'écran</span>
                    </div>
                  </div>
                  {savCase.accessories?.other && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                      <span className="text-green-600"><span className="font-medium">Autre :</span> {savCase.accessories.other}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Schéma de verrouillage */}
            {savCase.unlock_pattern && savCase.unlock_pattern.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PatternLock pattern={savCase.unlock_pattern} onChange={() => {}} disabled={true} showPattern={true} />
                <Card>
                  <CardHeader><CardTitle>Schéma de verrouillage enregistré</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Ce schéma de verrouillage a été enregistré lors de la création du dossier SAV.
                      Il contient {savCase.unlock_pattern.length} points connectés.
                    </p>
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <p className="text-xs font-medium">Séquence: {savCase.unlock_pattern.join(' → ')}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Codes de sécurité */}
            {savCase.status !== 'ready' && savCase.status !== 'cancelled' && (
              <SecurityCodesDisplay
                savCase={savCase}
                onUpdate={async (codes) => {
                  await supabase.from('sav_cases').update({
                    security_codes: (codes.unlock_code || codes.icloud_id || codes.icloud_password || codes.sim_pin || codes.email_id || codes.email_password) ? codes as any : null,
                  }).eq('id', savCase.id);
                }}
              />
            )}

            {/* Commentaire technicien */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Commentaire technicien
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Commentaire visible par le client et imprimé sur le bon de restitution.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="technician-comments">Commentaire pour le client</Label>
                    <AITextReformulator
                      text={technicianComments}
                      context="technician_comments"
                      onReformulated={(reformulatedText) => setTechnicianComments(reformulatedText)}
                    />
                  </div>
                  <Textarea id="technician-comments" placeholder="Décrivez l'intervention réalisée, les problèmes rencontrés ou les recommandations pour le client..." value={technicianComments} onChange={e => setTechnicianComments(e.target.value)} rows={4} />
                </div>
                <Button onClick={saveTechnicianComments} disabled={savingTechnicianComments} size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  {savingTechnicianComments ? 'Sauvegarde...' : 'Sauvegarder le commentaire'}
                </Button>
              </CardContent>
            </Card>

            {/* Commentaires privés */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Commentaires privés magasin
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Ces commentaires ne sont visibles que par le personnel du magasin. Le client ne peut pas les voir.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="private-comments">Commentaires internes</Label>
                    <AITextReformulator
                      text={privateComments}
                      context="private_comments"
                      onReformulated={(reformulatedText) => setPrivateComments(reformulatedText)}
                    />
                  </div>
                  <Textarea id="private-comments" placeholder="Ajoutez vos notes et commentaires privés ici..." value={privateComments} onChange={e => setPrivateComments(e.target.value)} rows={4} />
                </div>
                <Button onClick={savePrivateComments} disabled={savingComments} size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  {savingComments ? 'Sauvegarde...' : 'Sauvegarder les commentaires'}
                </Button>
              </CardContent>
            </Card>

            <SAVLoanerCard savCaseId={savCase.id} customerId={savCase.customer_id} />
            <SAVPartsRequirements savCaseId={savCase.id} onPartsUpdated={() => {}} />
            <SAVStatusManager savCase={savCase} onStatusUpdated={handleStatusUpdated} />
          </TabsContent>

          {/* Onglet Communication */}
          <TabsContent value="communication" className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {getTypeInfo(savCase.sav_type).show_customer_info && (
                <SMSButton
                  customerPhone={savCase.customer?.phone || savCase.external_contact_phone || ''}
                  customerName={customerFullNameStd || savCase.external_contact_name || 'Contact'}
                  caseNumber={savCase.case_number}
                  caseId={savCase.id}
                  size="sm"
                  variant="outline"
                />
              )}
              {getTypeInfo(savCase.sav_type).show_customer_info && (
                <AppointmentProposalDialog
                  savCaseId={savCase.id}
                  customerId={savCase.customer_id}
                  customerName={customerFullNameStd || 'Client'}
                  customerPhone={savCase.customer?.phone}
                  caseNumber={savCase.case_number}
                  deviceInfo={{ brand: savCase.device_brand, model: savCase.device_model }}
                  trigger={
                    <Button variant="outline" size="sm">
                      <CalendarPlus className="h-4 w-4 mr-2" /> Proposer RDV
                    </Button>
                  }
                />
              )}
              <Button variant="outline" size="sm" onClick={copyTrackingUrl}>
                <Share className="h-4 w-4 mr-2" /> Partager le lien
              </Button>
              {isReadyStatus(savCase.status) && (
                <ReviewRequestButton
                  savCaseId={savCase.id}
                  shopId={savCase.shop_id}
                  customerName={contactNameStd}
                  caseNumber={savCase.case_number}
                />
              )}
            </div>

            <SAVMessaging
              savCaseId={savCase.id}
              savCaseNumber={savCase.case_number}
              customerPhone={savCase.customer?.phone || savCase.external_contact_phone}
              customerName={contactNameStd}
              shopId={savCase.shop_id}
              customerId={savCase.customer_id}
              showSatisfactionButton={getTypeInfo(savCase.sav_type).show_satisfaction_survey}
            />

            {savCase.sav_type !== 'internal' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Share className="h-4 w-4" /> Lien de suivi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-primary text-primary-foreground rounded-lg text-sm break-all font-mono">
                    {savCase?.tracking_slug ? `fixway.fr/track/${savCase.tracking_slug}` : 'Slug non généré'}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={copyTrackingUrl}>
                      <Copy className="h-4 w-4 mr-2" /> Copier
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.open(generateTrackingUrl(), '_blank')}>
                      <ExternalLink className="h-4 w-4 mr-2" /> Prévisualiser
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Onglet Pièces */}
          <TabsContent value="pieces" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Pièces du dossier</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Ajoutez, retirez ou ajustez les pièces liées à ce dossier SAV.
                </p>
                <div>
                  <SAVPartsEditor savCaseId={savCase.id} onPartsUpdated={() => {}} />
                </div>
                <div className="pt-2 text-sm">
                  <span className="text-muted-foreground">Coût total actuel : </span>
                  <span className="font-semibold">{savCase.total_cost}€</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Impression */}
          <TabsContent value="impression" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Document de prise en charge</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Imprimez le récapitulatif du dossier (à remettre au client lors du dépôt).
                </p>
                <SAVPrintButton savCase={savCase} />
              </CardContent>
            </Card>

            {isReadyStatus(savCase.status) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Document de restitution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    À imprimer quand l'appareil est rendu au client.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const { data: freshCase } = await supabase
                          .from('sav_cases')
                          .select('*, customers(*)')
                          .eq('id', savCase.id)
                          .single();
                        const caseForPDF = freshCase
                          ? { ...savCase, closure_history: (freshCase.closure_history || []) as any, customer: (freshCase as any).customers || savCase.customer }
                          : savCase;
                        await generateSAVRestitutionPDF(caseForPDF, shop);
                        toast({ title: 'Document de restitution', description: "Le document est en cours d'impression." });
                      } catch (error) {
                        toast({ title: 'Erreur', description: 'Impossible de générer le document.', variant: 'destructive' });
                      }
                    }}
                    className="bg-primary/10 hover:bg-primary/20"
                  >
                    Imprimer restitution
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <QrCode className="h-4 w-4" /> Étiquette / QR code
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SAVBarcode
                  savCase={savCase}
                  savTypeLabel={getTypeInfo(savCase.sav_type).label}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Documents */}
          <TabsContent value="documents" className="space-y-4">
            <SAVDocuments
              savCaseId={savCase.id}
              attachments={savCase.attachments || []}
              onAttachmentsUpdate={handleAttachmentsUpdate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
