import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useSAVTrackingMessages } from '@/hooks/useSAVTrackingMessages';
import { MessageSquare, Send, Smartphone, AlertCircle, CheckCircle, X, Timer, Wifi } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { calculateSAVDelay, formatDelayText } from '@/hooks/useSAVDelay';
import { SAVTimeline } from '@/components/sav/SAVTimeline';

interface SAVCaseData {
  id: string;
  case_number: string;
  sav_type: "client" | "internal" | "external";
  status: "pending" | "in_progress" | "testing" | "ready" | "cancelled" | "parts_ordered" | "delivered";
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
    max_sav_processing_days_client?: number;
    max_sav_processing_days_internal?: number;
  };
}

const statusConfig = {
  pending: { 
    label: 'En attente', 
    variant: 'secondary' as const, 
    description: 'Votre dossier est en attente de prise en charge',
    icon: AlertCircle
  },
  in_progress: { 
    label: 'En cours', 
    variant: 'default' as const,
    description: 'Nous travaillons actuellement sur votre appareil',
    icon: AlertCircle
  },
  testing: { 
    label: 'Tests', 
    variant: 'default' as const,
    description: 'Votre appareil est en phase de test',
    icon: AlertCircle
  },
  ready: { 
    label: 'Prêt', 
    variant: 'default' as const,
    description: 'Votre appareil est prêt, vous pouvez venir le récupérer',
    icon: CheckCircle
  },
  delivered: { 
    label: 'Livré', 
    variant: 'default' as const,
    description: 'Votre appareil a été livré',
    icon: CheckCircle
  },
  cancelled: { 
    label: 'Annulé', 
    variant: 'destructive' as const,
    description: 'Ce dossier a été annulé',
    icon: AlertCircle
  },
};

export default function TrackSAV() {
  const { slug } = useParams<{ slug: string }>();
  const [savCase, setSavCase] = useState<SAVCaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const { toast } = useToast();

  const { messages, sendMessage, deleteMessage, refetch: refetchMessages } = useSAVTrackingMessages(slug);

  useEffect(() => {
    if (slug) {
      fetchSAVCase();
    }
  }, [slug]);

  // Setup real-time connection status
  useEffect(() => {
    if (slug) {
      const channel = supabase
        .channel(`tracking-${slug}`)
        .on('presence', { event: 'sync' }, () => {
          setIsRealTimeConnected(true);
        })
        .subscribe();

      return () => {
        setIsRealTimeConnected(false);
        supabase.removeChannel(channel);
      };
    }
  }, [slug]);

  const fetchSAVCase = async () => {
    console.log('🔍 [TrackSAV] Starting fetch for slug:', slug);
    if (!slug) return;
    
    try {
      // Utiliser la nouvelle fonction sécurisée pour obtenir les informations de tracking
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

      // Récupérer les informations de la boutique
      const { data: shopData, error: shopError } = await supabase
        .from('sav_cases')
        .select(`
          id,
          shops (name, phone, email, address, logo_url)
        `)
        .eq('tracking_slug', slug)
        .maybeSingle();

      const trackingInfo = trackingData[0];
      const savCaseData: SAVCaseData = {
        id: shopData?.id || '',
        case_number: trackingInfo.case_number,
        status: trackingInfo.status as "pending" | "in_progress" | "testing" | "ready" | "cancelled" | "parts_ordered" | "delivered",
        device_brand: trackingInfo.device_brand,
        device_model: trackingInfo.device_model,
        created_at: trackingInfo.created_at,
        updated_at: trackingInfo.created_at, // Use created_at as fallback
        total_cost: trackingInfo.total_cost,
        device_imei: undefined, // Not available in tracking info
        sku: undefined, // Not available in tracking info
        problem_description: 'Informations disponibles via le magasin',
        repair_notes: undefined, // Not available in tracking info
        sav_type: 'client' as "client" | "internal" | "external", // Default to client
        customer: {
          first_name: trackingInfo.customer_first_name || '',
          last_name: '' // customer_last_name not available in tracking info
        },
        shop: shopData?.shops ? {
          ...shopData.shops,
          max_sav_processing_days_client: 7, // Valeurs par défaut
          max_sav_processing_days_internal: 5
        } : undefined
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

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setSending(true);
    // Utiliser le nom du client du SAV
    const customerName = savCase?.customer?.first_name || 'Client';
    const result = await sendMessage(newMessage.trim(), customerName, 'client');
    
    if (result?.data) {
      setNewMessage('');
    }
    setSending(false);
  };

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { 
      addSuffix: true, 
      locale: fr 
    });
  };

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

  const statusInfo = statusConfig[savCase.status as keyof typeof statusConfig];
  const StatusIcon = statusInfo?.icon || AlertCircle;

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
        {savCase && savCase.status !== 'ready' && savCase.status !== 'cancelled' && (
          (() => {
            const delayInfo = calculateSAVDelay(savCase as any, savCase.shop as any);
            return (
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
                        <p className="font-bold text-lg">⏱️ {formatDelayText(delayInfo)}</p>
                        <p className="text-sm">Délai de traitement estimé</p>
                        
                        {/* Barre de progression */}
                        <div className="mt-3 mx-auto max-w-md">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(delayInfo.progress, 100)}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {Math.round(delayInfo.progress)}% du délai écoulé
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })()
        )}

        {/* Status */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-4 mb-4">
              <StatusIcon className="h-8 w-8 text-primary" />
              <div className="text-center">
                <Badge 
                  variant={statusInfo?.variant || 'secondary'} 
                  className="text-lg px-4 py-2"
                >
                  {statusInfo?.label || savCase.status}
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  {statusInfo?.description}
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

        {/* Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Discussion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-[400px] w-full pr-4 border rounded-lg bg-muted/30">
              <div className="p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>Aucun message pour le moment</p>
                    <p className="text-sm">Démarrez une conversation avec le magasin</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    // Calculer si le message peut être supprimé (moins d'1 minute)
                    const messageTime = new Date(message.created_at);
                    const now = new Date();
                    const canDelete = message.sender_type === 'client' && 
                      (now.getTime() - messageTime.getTime()) < 60000; // 1 minute
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 relative ${
                            message.sender_type === 'client'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-card'
                          }`}
                        >
                          {/* Bouton de suppression - toujours visible si supprimable */}
                          {canDelete && (
                            <button
                              onClick={() => deleteMessage(message.id)}
                              className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md border border-white transition-colors"
                              title="Supprimer le message (disponible pendant 1 minute)"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                          
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{message.sender_name}</span>
                            <Badge variant={message.sender_type === 'client' ? 'secondary' : 'outline'} className="text-xs">
                              {message.sender_type === 'client' ? 'Vous' : 'Boutique'}
                            </Badge>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                          <div className="text-xs opacity-70 mt-1">
                            {formatTime(message.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            {/* Zone de saisie ou avertissement si fermé */}
            {savCase?.status === 'ready' || savCase?.status === 'cancelled' ? (
              // Avertissement quand le SAV est clôturé
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertCircle className="h-5 w-5" />
                  <h4 className="font-medium">Chat fermé</h4>
                </div>
                <p className="text-sm text-amber-600 mt-1">
                  {savCase.status === 'ready' 
                    ? 'Ce dossier SAV est terminé. Vous ne pouvez plus envoyer de messages via ce chat. Contactez directement le magasin si nécessaire.'
                    : 'Ce dossier SAV a été annulé. Vous ne pouvez plus envoyer de messages via ce chat. Contactez directement le magasin si nécessaire.'
                  }
                </p>
                {savCase.shop?.phone && (
                  <p className="text-xs text-amber-600 mt-2">
                    📞 Téléphone du magasin : <span className="font-medium">{savCase.shop.phone}</span>
                  </p>
                )}
              </div>
            ) : (
              // Zone de saisie normale
              <div className="space-y-2">
                <Textarea
                  placeholder="Tapez votre message ici..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    size="sm"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sending ? 'Envoi...' : 'Envoyer'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
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