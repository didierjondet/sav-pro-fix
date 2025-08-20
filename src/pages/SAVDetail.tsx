import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { QrCode, ExternalLink, ArrowLeft, Copy, Share, Save, Lock, User, Mail, Phone, MapPin } from 'lucide-react';
import { SMSButton } from '@/components/sav/SMSButton';
import { useNavigate } from 'react-router-dom';
import { SAVPartsEditor } from '@/components/sav/SAVPartsEditor';
import { SAVPartsRequirements } from '@/components/sav/SAVPartsRequirements';
import { SAVPrintButton } from '@/components/sav/SAVPrint';
import { ReviewRequestButton } from '@/components/sav/ReviewRequestButton';
import { SAVDocuments } from '@/components/sav/SAVDocuments';
import { generateFullTrackingUrl } from '@/utils/trackingUtils';
import { generateSAVRestitutionPDF } from '@/utils/pdfGenerator';

export default function SAVDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [privateComments, setPrivateComments] = useState('');
  const [savingComments, setSavingComments] = useState(false);
  const { cases, loading } = useSAVCases();
  const { shop } = useShop();
  const [savCase, setSavCase] = useState<any>(null);

  useEffect(() => {
    if (cases && id) {
      const foundCase = cases.find(c => c.id === id);
      setSavCase(foundCase);
      // Charger les commentaires privés
      if (foundCase?.private_comments) {
        setPrivateComments(foundCase.private_comments);
      }
    }
  }, [cases, id]);

  // Mise à jour en temps réel du SAV case et des pièces
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel('sav-case-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sav_cases',
          filter: `id=eq.${id}`
        },
        (payload) => {
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
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sav_parts',
          filter: `sav_case_id=eq.${id}`
        },
        (payload) => {
          console.log('SAV parts updated:', payload);
          // Recalculer le prix total automatiquement
          // Le trigger de la base de données se charge déjà de mettre à jour le total_cost dans sav_cases
          // La mise à jour sera captée par l'écoute sur sav_cases ci-dessus
        }
      )
      .subscribe();

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
      description: "Le QR Code s'ouvre dans un nouvel onglet",
    });
  };

  const copyTrackingUrl = async () => {
    try {
      await navigator.clipboard.writeText(generateTrackingUrl());
      toast({
        title: "Lien copié",
        description: "Le lien de suivi a été copié dans le presse-papier",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le lien",
        variant: "destructive",
      });
    }
  };

  const handleStatusUpdated = () => {
    // Plus besoin de refetch, le realtime se charge de la mise à jour
  };

  const savePrivateComments = async () => {
    if (!savCase?.id) return;
    
    setSavingComments(true);
    try {
      const { error } = await supabase
        .from('sav_cases')
        .update({ private_comments: privateComments })
        .eq('id', savCase.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Commentaires privés sauvegardés",
      });

      // Mettre à jour l'état local
      setSavCase({ ...savCase, private_comments: privateComments });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les commentaires",
        variant: "destructive",
      });
    } finally {
      setSavingComments(false);
    }
  };

  const handleAttachmentsUpdate = (newAttachments: any[]) => {
    setSavCase({ ...savCase, attachments: newAttachments });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex h-screen">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="text-center">Chargement...</div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  if (!savCase) {
    return (
      <div className="min-h-screen bg-background">
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
      </div>
    );
  }

  const statusConfig = {
    pending: { label: 'En attente', variant: 'secondary' as const },
    in_progress: { label: 'En cours', variant: 'default' as const },
    testing: { label: 'Tests', variant: 'default' as const },
    ready: { label: 'Prêt', variant: 'default' as const },
    delivered: { label: 'Livré', variant: 'default' as const },
    cancelled: { label: 'Annulé', variant: 'destructive' as const },
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/sav')}
                  >
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
                  <Badge variant={statusConfig[savCase.status as keyof typeof statusConfig]?.variant || 'secondary'}>
                    {statusConfig[savCase.status as keyof typeof statusConfig]?.label || savCase.status}
                  </Badge>
                  {/* Bouton Imprimer restitution - uniquement pour les SAV prêts */}
                  {savCase.status === 'ready' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        generateSAVRestitutionPDF(savCase, shop);
                        toast({
                          title: "Document de restitution",
                          description: "Le document de restitution est en cours d'impression.",
                        });
                      }}
                      className="bg-primary/10 hover:bg-primary/20"
                    >
                      Imprimer restitution
                    </Button>
                  )}
                  {/* SMS Button - for all SAV types except internal */}
                  {savCase.sav_type !== 'internal' && (
                    <SMSButton
                      customerPhone={savCase.customer?.phone || savCase.external_contact_phone || ''}
                      customerName={
                        savCase.sav_type === 'client' 
                          ? `${savCase.customer?.first_name || ''} ${savCase.customer?.last_name || ''}`.trim()
                          : savCase.external_contact_name || 'Contact externe'
                      }
                      caseNumber={savCase.case_number}
                      caseId={savCase.id}
                      size="sm"
                      variant="outline"
                    />
                  )}
                  <SAVPrintButton savCase={savCase} />
                  <SAVPartsEditor 
                    savCaseId={savCase.id} 
                    onPartsUpdated={() => {}}
                  />
                </div>
              </div>

              {/* Client Information - Only for client SAV cases */}
              {savCase.sav_type === 'client' && savCase.customer && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Coordonnées du client
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Nom complet</p>
                        <p className="font-medium">
                          {savCase.customer.first_name} {savCase.customer.last_name}
                        </p>
                      </div>
                    </div>
                    
                    {savCase.customer.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{savCase.customer.email}</p>
                        </div>
                      </div>
                    )}
                    
                    {savCase.customer.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Téléphone</p>
                          <p className="font-medium">{savCase.customer.phone}</p>
                        </div>
                      </div>
                    )}
                    
                    {savCase.customer.address && (
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

              {/* Case Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Détails du dossier</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <strong>Type:</strong> {savCase.sav_type === 'client' ? 'Client' : savCase.sav_type === 'external' ? 'Externe' : 'Interne'}
                  </div>
                  <div>
                    <strong>Appareil:</strong> {savCase.device_brand} {savCase.device_model}
                  </div>
                  {savCase.device_imei && (
                    <div>
                      <strong>IMEI:</strong> {savCase.device_imei}
                    </div>
                  )}
                  {savCase.sku && (
                    <div>
                      <strong>SKU:</strong> {savCase.sku}
                    </div>
                  )}
                  <div>
                    <strong>Coût total:</strong> {savCase.total_cost}€
                  </div>
                  <div className="md:col-span-2">
                    <strong>Description du problème:</strong>
                    <p className="mt-1 text-muted-foreground">{savCase.problem_description}</p>
                  </div>
                  {savCase.repair_notes && (
                    <div className="md:col-span-2">
                      <strong>Notes de réparation:</strong>
                      <p className="mt-1 text-muted-foreground">{savCase.repair_notes}</p>
                    </div>
                  )}
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
                    <Label htmlFor="private-comments">Commentaires internes</Label>
                    <Textarea
                      id="private-comments"
                      placeholder="Ajoutez vos notes et commentaires privés ici..."
                      value={privateComments}
                      onChange={(e) => setPrivateComments(e.target.value)}
                      rows={4}
                      className="mt-2"
                    />
                  </div>
                  <Button 
                    onClick={savePrivateComments}
                    disabled={savingComments}
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {savingComments ? 'Sauvegarde...' : 'Sauvegarder les commentaires'}
                  </Button>
                </CardContent>
              </Card>

              {/* Client Tracking */}
              {savCase.sav_type === 'client' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Share className="h-5 w-5" />
                      Partage client
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Lien de suivi simplifié pour le client</label>
                      <div className="mt-2 p-3 bg-muted rounded-lg border text-sm break-all">
                        {savCase?.tracking_slug ? generateTrackingUrl() : 'Slug de suivi non généré'}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Lien simplifié : <strong>fixwaypro.com/{savCase?.tracking_slug || 'nomclient123'}</strong><br/>
                        Le client pourra suivre l'état de sa réparation et communiquer avec vous via ce lien
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyTrackingUrl}
                        className="flex-1 sm:flex-initial"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copier le lien
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateQRCode}
                        className="flex-1 sm:flex-initial"
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        Générer QR Code
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(generateTrackingUrl(), '_blank')}
                        className="flex-1 sm:flex-initial"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Prévisualiser
                      </Button>
                      {savCase.status === 'ready' && (
                        <ReviewRequestButton
                          savCaseId={savCase.id}
                          shopId={savCase.shop_id}
                          customerName={`${savCase.customer?.first_name || ''} ${savCase.customer?.last_name || ''}`.trim()}
                          caseNumber={savCase.case_number}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Documents and Photos */}
              <SAVDocuments
                savCaseId={savCase.id}
                attachments={savCase.attachments || []}
                onAttachmentsUpdate={handleAttachmentsUpdate}
              />

              {/* Parts Requirements */}
              <SAVPartsRequirements 
                savCaseId={savCase.id} 
                onPartsUpdated={() => {}}
              />

              {/* Status Management and Messaging */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SAVStatusManager 
                  savCase={savCase} 
                  onStatusUpdated={handleStatusUpdated}
                />
                <SAVMessaging 
                  savCaseId={savCase.id} 
                  savCaseNumber={savCase.case_number}
                  customerPhone={savCase.customer?.phone}
                  customerName={`${savCase.customer?.first_name || ''} ${savCase.customer?.last_name || ''}`.trim()}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}