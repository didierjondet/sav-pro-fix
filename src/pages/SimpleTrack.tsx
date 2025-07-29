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
import { useSAVMessages } from '@/hooks/useSAVMessages';
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
  const { messages, sendMessage, markAsRead } = useSAVMessages(savCase?.id || '');

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

      const { data, error } = await supabase
        .from('sav_cases')
        .select(`
          *,
          customer:customers(first_name, last_name, email, phone),
          shop:shops(name, phone, email, address)
        `)
        .eq('tracking_slug', slug)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Aucun dossier trouvé avec ce lien de suivi.');
        } else {
          setError('Erreur lors du chargement du dossier.');
        }
        return;
      }

      setSavCase(data as SAVCaseData);
      if (data.customer) {
        setClientName(`${data.customer.first_name} ${data.customer.last_name}`);
      }
    } catch (error) {
      console.error('Error fetching SAV case:', error);
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
            <img 
              src="/lovable-uploads/3d99a913-9d52-4f6c-9a65-78b3bd561739.png" 
              alt="Logo SAV Pro Fix" 
              className="h-12 w-12 object-contain"
            />
            <h1 className="text-3xl font-bold text-gray-800">
              {savCase.shop?.name || 'SAV Pro Fix'}
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
                </div>
              </div>

              <Separator />

              {/* Problème */}
              <div>
                <h4 className="font-medium mb-2">Problème signalé</h4>
                <p className="text-sm text-gray-600">{savCase.problem_description}</p>
              </div>

              {savCase.repair_notes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Notes de réparation</h4>
                    <p className="text-sm text-gray-600">{savCase.repair_notes}</p>
                  </div>
                </>
              )}

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
          <Card className="flex flex-col h-fit max-h-[600px]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Messages avec le magasin
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
              {/* Liste des messages */}
              <ScrollArea className="flex-1 mb-4 max-h-80">
                <div className="space-y-3">
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