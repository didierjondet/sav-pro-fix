import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { SAVMessaging } from '@/components/sav/SAVMessaging';
import { SAVStatusManager } from '@/components/sav/SAVStatusManager';
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
import { QrCode, ExternalLink, ArrowLeft, Copy, Share, Save, Lock, User, Mail, Phone, MapPin, CheckCircle, X, MessageSquare, Edit, Clock, CalendarPlus } from 'lucide-react';
import { SMSButton } from '@/components/sav/SMSButton';
import { useNavigate } from 'react-router-dom';
import { SAVPartsEditor } from '@/components/sav/SAVPartsEditor';
import { SAVPartsRequirements } from '@/components/sav/SAVPartsRequirements';
import { SAVPrintButton } from '@/components/sav/SAVPrint';
import { ReviewRequestButton } from '@/components/sav/ReviewRequestButton';
import { SAVDocuments } from '@/components/sav/SAVDocuments';
import { PatternLock } from '@/components/sav/PatternLock';
import { SecurityCodesSection } from '@/components/sav/SecurityCodesSection';
import { generateFullTrackingUrl } from '@/utils/trackingUtils';
import { generateSAVRestitutionPDF } from '@/utils/pdfGenerator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AITextReformulator } from '@/components/sav/AITextReformulator';
import { EditSAVCustomerDialog } from '@/components/sav/EditSAVCustomerDialog';
import { EditSAVDetailsDialog } from '@/components/sav/EditSAVDetailsDialog';
import { AppointmentProposalDialog } from '@/components/agenda/AppointmentProposalDialog';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [privateComments, setPrivateComments] = useState('');
  const [savingComments, setSavingComments] = useState(false);
  const {
    cases,
    loading,
    updateTechnicianComments,
    updatePrivateComments
  } = useSAVCases();
  const {
    shop
  } = useShop();
  const { getStatusInfo, isReadyStatus } = useShopSAVStatuses();
  const { getAllTypes, getTypeInfo } = useShopSAVTypes();
  const [savCase, setSavCase] = useState<any>(null);
  const [technicianComments, setTechnicianComments] = useState('');
  const [editingSavType, setEditingSavType] = useState(false);
  const [tempSavType, setTempSavType] = useState('');
  const [savingTechnicianComments, setSavingTechnicianComments] = useState(false);
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
        setSavCase((prevCase: any) => ({
          ...prevCase,
          ...payload.new,
          // Conserver les données de relation customer si elles existent
          customer: prevCase?.customer
        }));
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
    return generateFullTrackingUrl(savCase.tracking_slug);
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
      await updateTechnicianComments(savCase.id, technicianComments);

      // Mettre à jour l'état local
      setSavCase({
        ...savCase,
        technician_comments: technicianComments
      });
    } catch (error) {
      // L'erreur est déjà gérée dans le hook
    } finally {
      setSavingTechnicianComments(false);
    }
  };
  const savePrivateComments = async () => {
    if (!savCase?.id) return;
    setSavingComments(true);
    try {
      await updatePrivateComments(savCase.id, privateComments);

      // Mettre à jour l'état local
      setSavCase({
        ...savCase,
        private_comments: privateComments
      });
    } catch (error) {
      // L'erreur est déjà gérée dans le hook
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
      
      console.log('updateSavType: Success');
      
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
    return <div className="min-h-screen bg-background">
        <div className="flex h-screen">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="text-center">Chargement...</div>
            </main>
          </div>
        </div>
      </div>;
  }
  if (!savCase) {
    return <div className="min-h-screen bg-background">
        <div className="flex h-screen">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Dossier SAV introuvable</h1>
                <Button onClick={() => navigate('/sav')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour à la liste
                </Button>
              </div>
            </main>
          </div>
        </div>
      </div>;
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
  return <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="sm" onClick={() => navigate('/sav')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold">Dossier {savCase.case_number}</h1>
                    <p className="text-muted-foreground">
                      {savCase.device_brand} {savCase.device_model}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusInfo(savCase.status)?.variant || 'secondary'}>
                    {getStatusInfo(savCase.status)?.label || savCase.status}
                  </Badge>
                  {/* Bouton Imprimer restitution - uniquement pour les SAV prêts */}
                  {isReadyStatus(savCase.status) && <Button variant="outline" size="sm" onClick={async () => {
                  try {
                    await generateSAVRestitutionPDF(savCase, shop);
                    toast({
                      title: "Document de restitution",
                      description: "Le document de restitution est en cours d'impression."
                    });
                  } catch (error) {
                    console.error('Erreur lors de la génération du PDF:', error);
                    toast({
                      title: "Erreur",
                      description: "Impossible de générer le document de restitution.",
                      variant: "destructive"
                    });
                  }
                }} className="bg-primary/10 hover:bg-primary/20">
                      Imprimer restitution
                    </Button>}
                  
                  {/* Bouton Partager */}
                  <Button variant="outline" size="sm" onClick={copyTrackingUrl}>
                    <Share className="h-4 w-4 mr-2" />
                    Partager
                  </Button>
                  
                  {/* SMS Button - for types that require customer info */}
                  {getTypeInfo(savCase.sav_type).show_customer_info && <SMSButton customerPhone={savCase.customer?.phone || savCase.external_contact_phone || ''} customerName={`${savCase.customer?.first_name || ''} ${savCase.customer?.last_name || ''}`.trim() || savCase.external_contact_name || 'Contact'} caseNumber={savCase.case_number} caseId={savCase.id} size="sm" variant="outline" />}
                  
                  {/* Bouton Proposer RDV - for types with customer info */}
                  {getTypeInfo(savCase.sav_type).show_customer_info && (
                    <AppointmentProposalDialog
                      savCaseId={savCase.id}
                      customerId={savCase.customer_id}
                      customerName={`${savCase.customer?.first_name || ''} ${savCase.customer?.last_name || ''}`.trim() || 'Client'}
                      customerPhone={savCase.customer?.phone}
                      caseNumber={savCase.case_number}
                      deviceInfo={{
                        brand: savCase.device_brand,
                        model: savCase.device_model
                      }}
                      trigger={
                        <Button variant="outline" size="sm">
                          <CalendarPlus className="h-4 w-4 mr-2" />
                          Proposer RDV
                        </Button>
                      }
                    />
                  )}
                  
                  <SAVPrintButton savCase={savCase} />
                  <SAVPartsEditor savCaseId={savCase.id} onPartsUpdated={() => {}} />
                </div>
              </div>

              {/* Contact Information - For types that require customer info */}
              {getTypeInfo(savCase.sav_type).show_customer_info && <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Coordonnées du client
                      </div>
                      <EditSAVCustomerDialog
                        savCaseId={savCase.id}
                        currentCustomerId={savCase.customer_id}
                        currentCustomerName={savCase.customer ? `${savCase.customer.first_name} ${savCase.customer.last_name}` : undefined}
                        onCustomerUpdated={() => {
                          // Le realtime se charge de la mise à jour
                        }}
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Nom complet</p>
                        <p className="font-medium">
                          {`${savCase.customer?.first_name || ''} ${savCase.customer?.last_name || ''}`.trim() || 'Non renseigné'}
                        </p>
                      </div>
                    </div>
                    
                    {savCase.customer?.email && <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">
                            {savCase.customer?.email}
                          </p>
                        </div>
                      </div>}
                    
                    {savCase.customer?.phone && <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Téléphone</p>
                          <p className="font-medium">
                            {savCase.customer?.phone}
                          </p>
                        </div>
                      </div>}
                    
                    {savCase.customer?.address && <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Adresse</p>
                          <p className="font-medium">
                            {savCase.customer?.address}
                          </p>
                        </div>
                      </div>}
                  </CardContent>
                </Card>}

              {/* Case Details */}
              <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Détails du dossier</span>
                  <EditSAVDetailsDialog
                    savCaseId={savCase.id}
                    currentDetails={{
                      device_brand: savCase.device_brand,
                      device_model: savCase.device_model,
                      device_imei: savCase.device_imei,
                      problem_description: savCase.problem_description,
                      repair_notes: savCase.repair_notes,
                      sku: savCase.sku
                    }}
                  />
                </CardTitle>
              </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <strong>Type:</strong> 
                    {editingSavType ? (
                      <div className="flex items-center gap-2">
                        <Select value={tempSavType} onValueChange={setTempSavType}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
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
                        <Button size="sm" onClick={updateSavType} disabled={!tempSavType}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditSavType}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className="px-2 py-1"
                          style={{ 
                            backgroundColor: `${getTypeInfo(savCase.sav_type).color}20`,
                            color: getTypeInfo(savCase.sav_type).color,
                            borderColor: getTypeInfo(savCase.sav_type).color
                          }}
                        >
                          {getTypeInfo(savCase.sav_type).label}
                        </Badge>
                        {/* Ne montrer le bouton d'édition que si le type est modifiable */}
                        <Button
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              setEditingSavType(true);
                              setTempSavType(savCase.sav_type);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                      </div>
                    )}
                  </div>
                  <div>
                    <strong>Appareil:</strong> {savCase.device_brand} {savCase.device_model}
                  </div>
                  {savCase.device_imei && <div>
                      <strong>IMEI:</strong> {savCase.device_imei}
                    </div>}
                  {savCase.sku && <div>
                      <strong>SKU:</strong> {savCase.sku}
                    </div>}
                  <div>
                    <strong>Date de création:</strong> {format(new Date(savCase.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                  </div>
                  <div>
                    <strong>Coût total:</strong> {savCase.total_cost}€
                  </div>
                  <div className="md:col-span-2">
                    <strong>Description du problème:</strong>
                    <p className="mt-1 text-muted-foreground">{savCase.problem_description}</p>
                  </div>
                  {savCase.repair_notes && <div className="md:col-span-2">
                      <strong>Notes de réparation:</strong>
                      <p className="mt-1 text-muted-foreground">{savCase.repair_notes}</p>
                    </div>}
                  
                  {savCase.details_updated_at && (
                    <div className="md:col-span-2 mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          Détails modifiés le {format(new Date(savCase.details_updated_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                          {savCase.updated_by_profile && 
                            ` par ${savCase.updated_by_profile.first_name} ${savCase.updated_by_profile.last_name}`
                          }
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Accessoires présents */}
              {(savCase.accessories?.charger || savCase.accessories?.case || savCase.accessories?.screen_protector) && <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Accessoires présents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        {savCase.accessories?.charger ? <CheckCircle className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-muted-foreground" />}
                        <span className={savCase.accessories?.charger ? 'text-green-600' : 'text-muted-foreground'}>
                          Chargeur
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {savCase.accessories?.case ? <CheckCircle className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-muted-foreground" />}
                        <span className={savCase.accessories?.case ? 'text-green-600' : 'text-muted-foreground'}>
                          Coque
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {savCase.accessories?.screen_protector ? <CheckCircle className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-muted-foreground" />}
                        <span className={savCase.accessories?.screen_protector ? 'text-green-600' : 'text-muted-foreground'}>
                          Protection d'écran
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>}

              {/* Schéma de verrouillage */}
              {savCase.unlock_pattern && savCase.unlock_pattern.length > 0 && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <PatternLock pattern={savCase.unlock_pattern} onChange={() => {}} // Read-only in view mode
              disabled={true} showPattern={true} />
                  <Card>
                    <CardHeader>
                      <CardTitle>Schéma de verrouillage enregistré</CardTitle>
                    </CardHeader>
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
                </div>}

              {/* Codes de sécurité - Visible seulement si le SAV n'est pas terminé */}
              {savCase.security_codes && savCase.status !== 'ready' && savCase.status !== 'cancelled' && (
                <Card className="border-orange-200 bg-orange-50/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="h-5 w-5 text-orange-600" />
                      Codes de sécurité
                    </CardTitle>
                    <div className="mt-2 p-3 rounded-lg border border-orange-300 bg-orange-50">
                      <p className="text-sm text-orange-800 flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Ces codes seront automatiquement supprimés lors de la livraison ou annulation du SAV.
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {savCase.security_codes.unlock_code && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Code de déverrouillage</Label>
                        <p className="font-mono text-lg font-semibold">{savCase.security_codes.unlock_code}</p>
                      </div>
                    )}
                    
                    {(savCase.security_codes.icloud_id || savCase.security_codes.icloud_password) && (
                      <div className="space-y-2">
                        <Label className="font-semibold text-base">Compte iCloud</Label>
                        {savCase.security_codes.icloud_id && (
                          <div className="pl-4">
                            <Label className="text-xs text-muted-foreground">Identifiant</Label>
                            <p className="font-mono">{savCase.security_codes.icloud_id}</p>
                          </div>
                        )}
                        {savCase.security_codes.icloud_password && (
                          <div className="pl-4">
                            <Label className="text-xs text-muted-foreground">Mot de passe</Label>
                            <p className="font-mono text-lg font-semibold">{savCase.security_codes.icloud_password}</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {savCase.security_codes.sim_pin && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Code PIN SIM</Label>
                        <p className="font-mono text-lg font-semibold">{savCase.security_codes.sim_pin}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Technician Comments - Visible to all */}
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

              {/* Private Comments - Only visible to shop staff */}
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

              {/* Client/Contact Tracking */}
              {savCase.sav_type !== 'internal' && <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Share className="h-5 w-5" />
                      {savCase.sav_type === 'client' ? 'Partage client' : 'Partage contact'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">
                        Lien de suivi simplifié pour le {savCase.sav_type === 'client' ? 'client' : 'contact'}
                      </label>
                      <div className="mt-2 p-3 bg-primary text-primary-foreground rounded-lg border text-sm break-all font-mono">
                        {savCase?.tracking_slug ? `fixway.fr/track/${savCase.tracking_slug}` : 'Slug de suivi non généré'}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Le {savCase.sav_type === 'client' ? 'client' : 'contact'} pourra suivre l'état de sa réparation et communiquer avec vous via ce lien
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={copyTrackingUrl} className="flex-1 sm:flex-initial">
                        <Copy className="h-4 w-4 mr-2" />
                        Copier le lien
                      </Button>
                      
                      <Button variant="outline" size="sm" onClick={() => window.open(generateTrackingUrl(), '_blank')} className="flex-1 sm:flex-initial">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Prévisualiser
                      </Button>
                      {isReadyStatus(savCase.status) && <ReviewRequestButton savCaseId={savCase.id} shopId={savCase.shop_id} customerName={savCase.sav_type === 'client' ? `${savCase.customer?.first_name || ''} ${savCase.customer?.last_name || ''}`.trim() : savCase.external_contact_name || 'Contact externe'} caseNumber={savCase.case_number} />}
                    </div>
                  </CardContent>
                </Card>}

              {/* Documents and Photos */}
              <SAVDocuments savCaseId={savCase.id} attachments={savCase.attachments || []} onAttachmentsUpdate={handleAttachmentsUpdate} />

              {/* Parts Requirements */}
              <SAVPartsRequirements savCaseId={savCase.id} onPartsUpdated={() => {}} />

              {/* Status Management and Messaging */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SAVStatusManager savCase={savCase} onStatusUpdated={handleStatusUpdated} />
                <SAVMessaging 
                  savCaseId={savCase.id} 
                  savCaseNumber={savCase.case_number} 
                  customerPhone={savCase.customer?.phone || savCase.external_contact_phone} 
                  customerName={savCase.sav_type === 'client' ? `${savCase.customer?.first_name || ''} ${savCase.customer?.last_name || ''}`.trim() : savCase.external_contact_name || 'Contact externe'} 
                  shopId={savCase.shop_id}
                  customerId={savCase.customer_id}
                  showSatisfactionButton={getTypeInfo(savCase.sav_type).show_satisfaction_survey}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>;
}