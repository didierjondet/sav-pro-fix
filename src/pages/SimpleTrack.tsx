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
import { MessageSquare, Send, Smartphone, AlertCircle, CheckCircle, Clock, Package, Wifi } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface SAVCaseData {
  id: string;
  case_number: string;
  tracking_slug: string;
  sav_type: string;
  status: string;
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

const statusConfig = {
  pending: { 
    label: 'En attente', 
    variant: 'secondary' as const, 
    description: 'Votre dossier est en attente de prise en charge',
    icon: Clock
  },
  in_progress: { 
    label: 'En cours', 
    variant: 'default' as const,
    description: 'Nous travaillons actuellement sur votre appareil',
    icon: AlertCircle
  },
  testing: { 
    label: 'Test en cours', 
    variant: 'default' as const,
    description: 'Votre appareil est en phase de test',
    icon: Package
  },
  ready: { 
    label: 'Prêt', 
    variant: 'default' as const,
    description: 'Votre appareil est réparé et prêt à être récupéré',
    icon: CheckCircle
  },
  delivered: { 
    label: 'Livré', 
    variant: 'default' as const,
    description: 'Votre appareil vous a été rendu',
    icon: CheckCircle
  },
  cancelled: { 
    label: 'Annulé', 
    variant: 'destructive' as const,
    description: 'Ce dossier a été annulé',
    icon: AlertCircle
  }
};

export default function SimpleTrack() {
  const { slug } = useParams<{ slug: string }>();
  const [savCase, setSavCase] = useState<SAVCaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  
  const { toast } = useToast();
  const { messages, sendMessage, markAsRead } = useSAVTrackingMessages(slug);

  useEffect(() => {
    if (slug) {
      fetchSAVCase();
    }
  }, [slug]);

  // Écouter les mises à jour en temps réel du dossier SAV
  useEffect(() => {
    if (!savCase?.id) return;

    const channel = supabase
      .channel('sav-case-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sav_cases',
          filter: `id=eq.${savCase.id}`
        },
        (payload) => {
          console.log('SAV case updated:', payload);
          // Mettre à jour le dossier SAV avec les nouvelles données
          setSavCase((prevCase) => {
            if (prevCase) {
              return { ...prevCase, ...payload.new };
            }
            return prevCase;
          });

          // Afficher une notification de mise à jour
          toast({
            title: "Dossier mis à jour",
            description: "Le statut de votre dossier a été mis à jour automatiquement",
          });
        }
      )
      .on('system', {}, (status) => {
        if (status.type === 'connection') {
          console.log('Realtime connection status:', status);
          setIsRealTimeConnected(status.status === 'connected');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [savCase?.id, toast]);

  const fetchSAVCase = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 [SimpleTrack] Fetching SAV case for slug:', slug);

      // Utiliser la nouvelle fonction sécurisée pour obtenir les informations de tracking
      const { data: trackingData, error: trackingError } = await supabase
        .rpc('get_tracking_info', { p_tracking_slug: slug });

      if (trackingError) {
        console.error('❌ [SimpleTrack] Tracking function error:', trackingError);
        setError('Erreur lors de la récupération des données de suivi');
        return;
      }

      if (!trackingData || trackingData.length === 0) {
        console.log('📭 [SimpleTrack] No tracking data found for slug:', slug);
        setError('Aucun dossier trouvé avec ce lien de suivi.');
        return;
      }

      // Récupérer les informations de la boutique (accès authentifié)
      const { data: shopData, error: shopError } = await supabase
        .from('sav_cases')
        .select(`
          id,
          shops (name, phone, email, address, logo_url)
        `)
        .eq('tracking_slug', slug)
        .maybeSingle();

      const trackingInfo = trackingData[0];
      const savCaseData = {
        id: shopData?.id || '',
        case_number: trackingInfo.case_number,
        status: trackingInfo.status,
        device_brand: trackingInfo.device_brand,
        device_model: trackingInfo.device_model,
        created_at: trackingInfo.created_at,
        total_cost: trackingInfo.total_cost,
        tracking_slug: slug!,
        device_imei: undefined,
        sku: undefined,
        problem_description: 'Informations non disponibles en mode public',
        repair_notes: undefined,
        updated_at: trackingInfo.created_at,
        sav_type: '',
        customer: {
          first_name: trackingInfo.customer_first_name || '',
          last_name: ''
        },
        shop: shopData?.shops || null
      };

      console.log('✅ [SimpleTrack] SAV case data retrieved:', savCaseData);

      setSavCase(savCaseData as SAVCaseData);
      if (trackingInfo.customer_first_name) {
        setClientName(trackingInfo.customer_first_name);
      }
    } catch (error) {
      console.error('❌ [SimpleTrack] Catch error:', error);
      setError('Erreur lors du chargement du dossier.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !savCase) return;

    setIsSendingMessage(true);
    try {
      await sendMessage(newMessage, clientName || 'Client', 'client');
      setNewMessage('');
      toast({
        title: "Message envoyé",
        description: "Votre message a été envoyé au magasin",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de votre dossier...</p>
        </div>
      </div>
    );
  }

  if (error || !savCase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Dossier non trouvé</h2>
            <p className="text-gray-600 mb-4">
              {error || 'Le lien de suivi que vous avez utilisé n\'est pas valide.'}
            </p>
            <p className="text-sm text-gray-500">
              Vérifiez le lien dans votre SMS ou contactez directement le magasin.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = statusConfig[savCase.status as keyof typeof statusConfig];
  const StatusIcon = statusInfo?.icon || AlertCircle;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* En-tête avec logo/nom du magasin */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            {savCase.shop?.logo_url ? (
              <img 
                src={savCase.shop.logo_url} 
                alt="Logo du magasin" 
                className="h-12 w-12 object-contain"
              />
            ) : (
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-blue-600" />
              </div>
            )}
            <h1 className="text-3xl font-bold text-gray-800">
              {savCase.shop?.name || 'FixWay Pro'}
            </h1>
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <p className="text-gray-600">Suivi de votre dossier SAV</p>
            {isRealTimeConnected && (
              <div className="flex items-center gap-1 text-green-600 text-sm">
                <Wifi className="h-4 w-4" />
                <span>Temps réel</span>
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500">
            Propulsé par <span className="font-medium">FixWay Pro</span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Informations du dossier */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Dossier {savCase.case_number}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Statut principal */}
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <StatusIcon className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <Badge variant={statusInfo?.variant} className="text-sm mb-2">
                  {statusInfo?.label}
                </Badge>
                <p className="text-sm text-gray-600">{statusInfo?.description}</p>
              </div>

              <Separator />

              {/* Détails de l'appareil */}
              <div>
                <h4 className="font-medium mb-2">Appareil</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Marque:</span> {savCase.device_brand}</p>
                  <p><span className="font-medium">Modèle:</span> {savCase.device_model}</p>
                  {savCase.device_imei && (
                    <p><span className="font-medium">IMEI:</span> {savCase.device_imei}</p>
                  )}
                  {savCase.sku && (
                    <p><span className="font-medium">SKU:</span> {savCase.sku}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Problème */}
              <div>
                <h4 className="font-medium mb-2">Problème signalé</h4>
                <p className="text-sm text-gray-600">{savCase.problem_description}</p>
              </div>


              {savCase.total_cost > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Coût total</h4>
                    <p className="text-lg font-bold text-green-600">{savCase.total_cost}€</p>
                  </div>
                </>
              )}

              <Separator />

              {/* Informations du magasin */}
              <div>
                <h4 className="font-medium mb-2">Coordonnées du magasin</h4>
                <div className="space-y-1 text-sm">
                  {savCase.shop?.phone && (
                    <p><span className="font-medium">Téléphone:</span> {savCase.shop.phone}</p>
                  )}
                  {savCase.shop?.email && (
                    <p><span className="font-medium">Email:</span> {savCase.shop.email}</p>
                  )}
                  {savCase.shop?.address && (
                    <p><span className="font-medium">Adresse:</span> {savCase.shop.address}</p>
                  )}
                </div>
              </div>

              {/* Dates */}
              <Separator />
              <div className="text-xs text-gray-500">
                <p>Créé le: {new Date(savCase.created_at).toLocaleDateString('fr-FR')}</p>
                <p>Dernière mise à jour: {formatDistanceToNow(new Date(savCase.updated_at), { 
                  addSuffix: true, 
                  locale: fr 
                })}</p>
              </div>
            </CardContent>
          </Card>

          {/* Section de messagerie */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Messages avec le magasin
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {/* Liste des messages */}
              <ScrollArea className="h-[500px] w-full pr-4 mb-4 border rounded-lg bg-gray-50/50">
                <div className="p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>Aucun message pour le moment</p>
                      <p className="text-sm">Démarrez une conversation avec le magasin</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            message.sender_type === 'client'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <p className="text-sm">{message.message}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs opacity-70">
                              {message.sender_name}
                            </span>
                            <span className="text-xs opacity-70">
                              {formatDistanceToNow(new Date(message.created_at), { 
                                addSuffix: true, 
                                locale: fr 
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <Separator className="my-3" />

              {/* Zone de saisie */}
              <div className="space-y-3">
                <Input
                  placeholder="Votre nom (optionnel)"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Tapez votre message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1 min-h-[60px] resize-none"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isSendingMessage}
                    size="sm"
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Appuyez sur Entrée pour envoyer votre message
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}