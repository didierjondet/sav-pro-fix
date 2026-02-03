import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useShopSAVStatuses } from '@/hooks/useShopSAVStatuses';
import { SAVTimeline } from '@/components/sav/SAVTimeline';
import { MessagingInterface } from '@/components/sav/MessagingInterface';
import { AppointmentDisplay } from '@/components/agenda/AppointmentDisplay';
import { 
  Smartphone,
  CheckCircle,
  Timer,
  Wifi
} from 'lucide-react';

interface SAVCaseData {
  id: string;
  case_number: string;
  sav_type: string;
  status: "pending" | "in_progress" | "testing" | "ready" | "cancelled" | "parts_ordered" | "parts_received" | "delivered";
  device_brand: string;
  device_model: string;
  device_imei?: string;
  sku?: string;
  problem_description: string;
  repair_notes?: string;
  total_cost: number;
  created_at: string;
  updated_at: string;
  customer?: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
  };
  shop?: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    logo_url?: string;
  };
}

export default function TrackSAV() {
  const { slug } = useParams<{ slug: string }>();
  const [savCase, setSavCase] = useState<SAVCaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const { toast } = useToast();
  const { getStatusInfo, isReadyStatus, isCancelledStatus } = useShopSAVStatuses();

  useEffect(() => {
    if (slug) {
      fetchSAVCase();
      // Enregistrer la visite lors du chargement de la page
      recordVisit();
    }
  }, [slug]);

  // Real-time setup for SAV case updates only
  useEffect(() => {
    if (slug && savCase?.id) {
      const channel = supabase
        .channel(`tracking-${slug}`)
        .on('presence', { event: 'sync' }, () => {
          setIsRealTimeConnected(true);
        })
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'sav_cases',
            filter: `id=eq.${savCase.id}`
          },
          (payload) => {
            console.log('SAV case updated via realtime:', payload);
            if (payload.new) {
              setSavCase(prevCase => ({
                ...prevCase,
                ...payload.new,
                customer: prevCase?.customer,
                shop: prevCase?.shop
              }));
            }
          }
        )
        .subscribe();

      return () => {
        setIsRealTimeConnected(false);
        supabase.removeChannel(channel);
      };
    }
  }, [slug, savCase?.id]);

  const fetchSAVCase = async () => {
    console.log('🔍 [TrackSAV] Starting fetch for slug:', slug);
    if (!slug) return;
    
    try {
      // Utiliser la nouvelle fonction sécurisée pour obtenir toutes les informations nécessaires
      const { data: trackingData, error: trackingError } = await supabase
        .rpc('get_tracking_info', { p_tracking_slug: slug });

      if (trackingError) {
        console.error('❌ [TrackSAV] Tracking function error:', trackingError);
        throw new Error('Erreur lors de la récupération des données de suivi');
      }

      if (!trackingData || trackingData.length === 0) {
        console.log('📭 [TrackSAV] No tracking data found for slug:', slug);
        throw new Error('Numéro de suivi introuvable');
      }

      const trackingInfo = trackingData[0];
      console.log('🔍 [TrackSAV] Raw tracking info:', trackingInfo);
      
      const savCaseData: SAVCaseData = {
        id: String(trackingInfo.sav_case_id || ''),
        case_number: String(trackingInfo.case_number || ''),
        status: trackingInfo.status as "pending" | "in_progress" | "testing" | "ready" | "cancelled" | "parts_ordered" | "parts_received" | "delivered",
        device_brand: String(trackingInfo.device_brand || ''),
        device_model: String(trackingInfo.device_model || ''),
        created_at: trackingInfo.created_at || new Date().toISOString(),
        updated_at: trackingInfo.created_at || new Date().toISOString(),
        total_cost: Number(trackingInfo.total_cost || 0),
        device_imei: undefined,
        sku: undefined,
        problem_description: 'Informations disponibles via le magasin',
        repair_notes: undefined,
        sav_type: trackingInfo.sav_type || 'client',
        customer: {
          first_name: String(trackingInfo.customer_first_name || ''),
          last_name: ''
        },
        shop: {
          name: String(trackingInfo.shop_name || ''),
          phone: String(trackingInfo.shop_phone || ''),
          email: String(trackingInfo.shop_email || ''),
          address: String(trackingInfo.shop_address || ''),
          logo_url: String(trackingInfo.shop_logo_url || '')
        }
      };

      console.log('✅ [TrackSAV] SAV case data retrieved:', savCaseData);
      setSavCase(savCaseData);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Dossier SAV introuvable",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour enregistrer la visite
  const recordVisit = async () => {
    if (!slug) {
      console.log('❌ No slug provided for visit recording');
      return;
    }
    
    console.log('🔍 Recording visit for slug:', slug);
    
    try {
      // Obtenir l'IP et User-Agent du client
      const userAgent = navigator.userAgent;
      console.log('📱 User Agent:', userAgent);
      
      // Appeler la fonction pour enregistrer la visite
      const { data, error } = await supabase.rpc('record_sav_visit', {
        p_tracking_slug: slug,
        p_visitor_ip: null, // L'IP sera automatiquement récupérée côté serveur si possible
        p_visitor_user_agent: userAgent
      });

      if (error) {
        console.error('❌ Error recording visit:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
      } else {
        console.log('✅ Visit recorded successfully!', data);
      }
    } catch (error) {
      console.error('❌ Exception recording visit:', error);
    }
  };

  // Créer un objet SAVCase compatible pour useSAVDelay
  const delayInfo = useMemo(() => {
    if (!savCase) {
      return {
        isOverdue: false,
        remainingDays: 0,
        remainingHours: 0,
        totalRemainingHours: 0,
        progress: 0
      };
    }

    // Utiliser des valeurs par défaut pour les délais
    // Dans une version future, il faudrait récupérer ces données depuis shop_sav_types
    const maxDays = savCase.sav_type === 'client' ? 7 : 
                   savCase.sav_type === 'external' ? 9 : 5;

    const createdAt = new Date(savCase.created_at);
    const now = new Date();
    const maxDate = new Date(createdAt.getTime() + maxDays * 24 * 60 * 60 * 1000);
    
    const remainingMs = maxDate.getTime() - now.getTime();
    const totalRemainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    
    const isOverdue = remainingMs <= 0;
    const remainingDays = Math.floor(totalRemainingHours / 24);
    const remainingHours = totalRemainingHours % 24;
    
    // Calculer le pourcentage de temps écoulé
    const totalMaxHours = maxDays * 24;
    const elapsedHours = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
    const progress = Math.min(100, Math.max(0, (elapsedHours / totalMaxHours) * 100));

    return {
      isOverdue,
      remainingDays: Math.max(0, remainingDays),
      remainingHours: Math.max(0, remainingHours),
      totalRemainingHours: Math.max(0, totalRemainingHours),
      progress
    };
  }, [savCase?.created_at, savCase?.sav_type]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  if (!savCase) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Dossier SAV introuvable</h1>
          <p className="text-muted-foreground">
            Le lien de suivi "{slug}" n'existe pas ou n'est plus accessible.
          </p>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(savCase.status);
  const StatusIcon = CheckCircle;

  return (
    <div className="min-h-screen bg-background">
      {/* En-tête du magasin */}
      <div className="bg-card border-b shadow-sm">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-center gap-4 mb-4">
            {savCase?.shop?.logo_url ? (
              <img 
                src={savCase.shop.logo_url} 
                alt={`Logo ${savCase.shop.name}`}
                className="h-16 w-16 object-contain"
              />
            ) : (
              <div className="h-16 w-16 bg-primary/10 rounded-lg flex items-center justify-center">
                <Smartphone className="h-8 w-8 text-primary" />
              </div>
            )}
            <div className="text-center">
              <h1 className="text-2xl font-bold text-primary">
                {savCase?.shop?.name || "FixWay Pro"}
              </h1>
              <p className="text-sm text-muted-foreground">Service Après-Vente</p>
            </div>
          </div>
          
          {/* Coordonnées du magasin */}
          {savCase?.shop && (
            <div className="text-center space-y-1 mb-4">
              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                {savCase.shop.address && (
                  <span>📍 {savCase.shop.address}</span>
                )}
                {savCase.shop.phone && (
                  <span>📞 {savCase.shop.phone}</span>
                )}
                {savCase.shop.email && (
                  <span>✉️ {savCase.shop.email}</span>
                )}
              </div>
            </div>
          )}
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <h2 className="text-lg font-semibold">Suivi de votre dossier SAV</h2>
              {isRealTimeConnected && (
                <div className="flex items-center gap-1 text-green-600 text-sm">
                  <Wifi className="h-4 w-4" />
                  <span>Temps réel</span>
                </div>
              )}
            </div>
            <p className="text-primary font-medium">Dossier n° {savCase?.case_number}</p>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-4xl mx-auto p-6 space-y-6">

        {/* Timeline de progression */}
        {savCase && (
          <div className="mb-6">
            <SAVTimeline 
              savCase={savCase} 
              shop={savCase.shop} 
            />
          </div>
        )}

        {/* Indicateur de délai */}
        {savCase && !isReadyStatus(savCase.status) && !isCancelledStatus(savCase.status) && delayInfo && (
          <Card className={`mb-6 border-2 ${delayInfo.isOverdue ? 'border-red-500 bg-red-50' : 'border-orange-500 bg-orange-50'}`}>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Timer className={`h-5 w-5 ${delayInfo.isOverdue ? 'text-red-600' : 'text-orange-600'}`} />
                  <h3 className={`font-semibold ${delayInfo.isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
                    Délai de traitement
                  </h3>
                </div>
                
                {delayInfo.isOverdue ? (
                  <div className="text-red-600">
                    <p className="font-bold text-lg">⚠️ EN RETARD</p>
                    <p className="text-sm">Le délai de traitement standard a été dépassé</p>
                    <p className="text-xs mt-1">Contactez le magasin pour plus d'informations</p>
                  </div>
                ) : (
                  <div className="text-orange-600">
                    <p className="font-bold text-lg">⏱️ {delayInfo.remainingDays} jours restants</p>
                    <p className="text-sm">Délai de traitement estimé</p>
                    
                    {/* Barre de progression */}
                    <div className="mt-3 mx-auto max-w-md">
                      <Progress value={delayInfo.progress} className="h-2" />
                      <p className="text-xs text-gray-500 mt-1">
                        {Math.round(delayInfo.progress)}% du délai écoulé
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-4 mb-4">
              <StatusIcon className="h-8 w-8 text-primary" />
              <div className="text-center">
                <Badge 
                  style={statusInfo.color ? {
                    backgroundColor: `${statusInfo.color}20`,
                    color: statusInfo.color,
                    borderColor: statusInfo.color
                  } : undefined}
                  className="text-lg px-4 py-2"
                >
                  {statusInfo.label}
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  {savCase.status === 'ready' ? 'Votre appareil est prêt, vous pouvez venir le récupérer' :
                   savCase.status === 'cancelled' ? 'Ce dossier a été annulé' :
                   savCase.status === 'in_progress' ? 'Nous travaillons actuellement sur votre appareil' :
                   savCase.status === 'testing' ? 'Votre appareil est en phase de test' :
                   savCase.status === 'parts_ordered' ? 'Les pièces nécessaires ont été commandées' :
                   'Votre dossier est en attente de prise en charge'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Device Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Détails de l'appareil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <strong>Marque:</strong> {savCase.device_brand}
              </div>
              <div>
                <strong>Modèle:</strong> {savCase.device_model}
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
                <strong>Coût:</strong> {savCase.total_cost}€
              </div>
            </div>
            
            <Separator />
            
            <div>
              <strong>Description du problème:</strong>
              <p className="mt-1 text-muted-foreground">{savCase.problem_description}</p>
            </div>
            
            {savCase.repair_notes && (
              <>
                <Separator />
                <div>
                  <strong>Notes de réparation:</strong>
                  <p className="mt-1 text-muted-foreground">{savCase.repair_notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Rendez-vous proposés */}
        {savCase && (
          <AppointmentDisplay 
            savCaseId={savCase.id} 
            trackingSlug={slug}
          />
        )}

        {/* Section Chat */}
        {savCase && slug && (
          <MessagingInterface
            trackingSlug={slug}
            userType="client"
            caseNumber={savCase.case_number}
            senderName={savCase.customer?.first_name || "Client"}
            isCaseClosed={isReadyStatus(savCase.status) || isCancelledStatus(savCase.status)}
            shopPhone={savCase.shop?.phone}
          />
        )}
      </div>
      
      {/* Footer */}
      <div className="bg-muted/30 border-t mt-12">
        <div className="max-w-4xl mx-auto p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Propulsé par <span className="font-semibold text-primary">FixWay Pro</span>
          </p>
        </div>
      </div>
    </div>
  );
}