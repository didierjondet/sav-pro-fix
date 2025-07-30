import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useSupportMessages } from '@/hooks/useSupportMessages';
import { useSupport, SupportTicket } from '@/hooks/useSupport';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ArrowLeft,
  Send,
  User,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Pause,
  MessageSquare
} from 'lucide-react';

interface SupportTicketManagerProps {
  ticket: SupportTicket;
  onBack: () => void;
}

const statusConfig = {
  'open': { color: 'bg-red-100 text-red-800', icon: AlertTriangle, label: 'Ouvert' },
  'in_progress': { color: 'bg-yellow-100 text-yellow-800', icon: Pause, label: 'En cours' },
  'resolved': { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Résolu' },
  'closed': { color: 'bg-gray-100 text-gray-800', icon: XCircle, label: 'Fermé' }
};

const priorityConfig = {
  'low': { color: 'bg-blue-100 text-blue-800', label: 'Faible' },
  'medium': { color: 'bg-yellow-100 text-yellow-800', label: 'Moyenne' },
  'high': { color: 'bg-orange-100 text-orange-800', label: 'Haute' },
  'urgent': { color: 'bg-red-100 text-red-800', label: 'Urgente' }
};

export default function SupportTicketManager({ ticket, onBack }: SupportTicketManagerProps) {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { messages, loading, sendMessage, markAsRead } = useSupportMessages(ticket.id);
  const { updateTicketStatus } = useSupport();
  const { toast } = useToast();

  useEffect(() => {
    // Mark messages as read by admin when component mounts
    markAsRead(true);
  }, [ticket.id]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const result = await sendMessage(newMessage.trim(), 'admin');
    
    if (result?.error) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    } else {
      setNewMessage('');
      toast({
        title: "Message envoyé",
        description: "Votre réponse a été envoyée au magasin",
      });
    }
    
    setSending(false);
  };

  const handleStatusChange = async (newStatus: SupportTicket['status']) => {
    const result = await updateTicketStatus(ticket.id, newStatus);
    
    if (result?.error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Statut mis à jour",
        description: `Le ticket est maintenant "${statusConfig[newStatus].label}"`,
      });
    }
  };

  const StatusIcon = statusConfig[ticket.status].icon;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{ticket.subject}</h2>
            <p className="text-slate-600">
              Ticket de {ticket.shop?.name} • Créé {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: fr })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge className={priorityConfig[ticket.priority].color}>
            {priorityConfig[ticket.priority].label}
          </Badge>
          <div className="flex items-center gap-2">
            <StatusIcon className="h-4 w-4" />
            <Select
              value={ticket.status}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Ouvert</SelectItem>
                <SelectItem value="in_progress">En cours</SelectItem>
                <SelectItem value="resolved">Résolu</SelectItem>
                <SelectItem value="closed">Fermé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Description initiale */}
              <div className="bg-slate-50 p-4 rounded-lg border-l-4 border-slate-300">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-slate-600" />
                  <span className="font-medium text-slate-900">
                    {ticket.creator?.first_name} {ticket.creator?.last_name}
                  </span>
                  <span className="text-sm text-slate-500">
                    {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: fr })}
                  </span>
                </div>
                <p className="text-slate-700 whitespace-pre-wrap">{ticket.description}</p>
              </div>

              {/* Messages */}
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                          message.sender_type === 'admin'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-slate-100 text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {message.sender_type === 'admin' ? (
                            <Shield className="h-3 w-3" />
                          ) : (
                            <User className="h-3 w-3" />
                          )}
                          <span className="text-xs opacity-75">
                            {message.sender_type === 'admin' ? 'Support' : 'Magasin'}
                          </span>
                          <span className="text-xs opacity-75 ml-auto">
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: fr })}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{message.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Zone de saisie */}
              <div className="border-t pt-4">
                <div className="flex gap-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Tapez votre réponse..."
                    className="flex-1 min-h-[80px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Utilisez Ctrl+Entrée pour envoyer rapidement
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informations du ticket */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informations du ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Magasin</label>
                <p className="font-medium">{ticket.shop?.name}</p>
                {ticket.shop?.email && (
                  <p className="text-sm text-slate-500">{ticket.shop.email}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Créé par</label>
                <p className="font-medium">
                  {ticket.creator?.first_name} {ticket.creator?.last_name}
                </p>
                {ticket.creator?.email && (
                  <p className="text-sm text-slate-500">{ticket.creator.email}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Priorité</label>
                <Badge className={priorityConfig[ticket.priority].color}>
                  {priorityConfig[ticket.priority].label}
                </Badge>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Statut</label>
                <div className="flex items-center gap-2">
                  <StatusIcon className="h-4 w-4" />
                  <Badge className={statusConfig[ticket.status].color}>
                    {statusConfig[ticket.status].label}
                  </Badge>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Créé le</label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <p className="text-sm">
                    {new Date(ticket.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {ticket.resolved_at && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Résolu le</label>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <p className="text-sm">
                      {new Date(ticket.resolved_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}