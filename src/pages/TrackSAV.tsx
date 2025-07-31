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
import { MessageSquare, Send, Smartphone, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface SAVCaseData {
  id: string;
  case_number: string;
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
    logo_url?: string;
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
  const [clientName, setClientName] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const { messages, sendMessage, refetch: refetchMessages } = useSAVMessages(savCase?.id);

  useEffect(() => {
    if (slug) {
      fetchSAVCase();

      // Set up realtime listener for SAV case updates
      const caseChannel = supabase
        .channel(`sav-case-${slug}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'sav_cases',
            filter: `tracking_slug=eq.${slug}`
          },
          (payload) => {
            console.log('SAV case update detected:', payload);
            fetchSAVCase(); // Refetch case data when status changes
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(caseChannel);
      };
    }
  }, [slug]);

  const fetchSAVCase = async () => {
    try {
      const { data, error } = await supabase
        .from('sav_cases')
        .select(`
          *,
          customer:customers(first_name, last_name, email, phone),
          shop:shops(name, phone, email, address, logo_url)
        `)
        .eq('tracking_slug', slug)
        .single();

      if (error) throw error;
      setSavCase(data);
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
    if (!newMessage.trim() || !clientName.trim() || !savCase) return;
    
    setSending(true);
    const result = await sendMessage(newMessage.trim(), clientName.trim(), 'client');
    
    if (result?.data) {
      setNewMessage('');
      refetchMessages();
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
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">Chargement...</div>
        </div>
      </div>
    );
  }

  if (!savCase) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto text-center">
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
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-center gap-4 mb-4">
            {savCase.shop?.logo_url ? (
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
                {savCase.shop?.name || "Réparateur"}
              </h1>
              <p className="text-sm text-muted-foreground">Service Après-Vente</p>
            </div>
          </div>
          
          {/* Coordonnées du magasin */}
          {savCase.shop && (
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
            <h2 className="text-lg font-semibold">Suivi de votre dossier SAV</h2>
            <p className="text-primary font-medium">Dossier n° {savCase.case_number}</p>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-4xl mx-auto p-6 space-y-6">

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
            <ScrollArea className="h-[500px] w-full pr-4 border rounded-lg bg-gray-50/50">
              <div className="p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground">
                    Aucun message pour l'instant.
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.sender_type === 'client'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
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
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="space-y-2">
              <Input
                placeholder="Votre nom"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
              <Textarea
                placeholder="Tapez votre message ici..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || !clientName.trim() || sending}
                  size="sm"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? 'Envoi...' : 'Envoyer'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Footer */}
      <div className="bg-muted/30 border-t mt-12">
        <div className="max-w-4xl mx-auto p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Propulsé par <span className="font-semibold text-primary">fixway.fr</span>
          </p>
        </div>
      </div>
    </div>
  );
}