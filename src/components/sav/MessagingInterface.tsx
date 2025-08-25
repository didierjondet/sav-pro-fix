import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, X, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMessaging, Message } from '@/hooks/useMessaging';
import { SMSButton } from './SMSButton';

interface MessagingInterfaceProps {
  // Configuration du SAV
  savCaseId?: string;
  trackingSlug?: string;
  userType: 'shop' | 'client';
  
  // Informations d'affichage
  caseNumber: string;
  senderName: string;
  
  // Props optionnelles pour le magasin
  customerPhone?: string;
  customerName?: string;
  
  // Props optionnelles pour le client
  isCaseClosed?: boolean;
  shopPhone?: string;
}

export function MessagingInterface({
  savCaseId,
  trackingSlug,
  userType,
  caseNumber,
  senderName,
  customerPhone,
  customerName,
  isCaseClosed = false,
  shopPhone
}: MessagingInterfaceProps) {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  const { 
    messages, 
    loading, 
    sendMessage, 
    deleteMessage, 
    markAllAsRead, 
    canDeleteMessage 
  } = useMessaging({ savCaseId, trackingSlug, userType });

  // Marquer tous les messages comme lus au montage
  useEffect(() => {
    if (markAllAsRead) {
      markAllAsRead();
    }
  }, [markAllAsRead]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    
    setSending(true);
    const result = await sendMessage(newMessage.trim(), senderName);
    
    if (result?.data) {
      setNewMessage('');
    }
    setSending(false);
  };

  const handleDeleteMessage = async (messageId: string) => {
    await deleteMessage(messageId);
  };

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { 
      addSuffix: true, 
      locale: fr 
    });
  };

  const renderMessageWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        const url = part.startsWith('www.') ? `https://${part}` : part;
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-blue-300 break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const getBadgeVariant = (message: Message) => {
    if (message.sender_name.includes('📱 SMS')) return 'default';
    if (userType === 'client') {
      return message.sender_type === 'client' ? 'secondary' : 'outline';
    } else {
      return message.sender_type === 'shop' ? 'secondary' : 'outline';
    }
  };

  const getBadgeText = (message: Message) => {
    if (message.sender_name.includes('📱 SMS')) return '📱 SMS';
    if (userType === 'client') {
      return message.sender_type === 'client' ? 'Vous' : 'Boutique';
    } else {
      return message.sender_type === 'shop' ? 'Boutique' : 'Client';
    }
  };

  const getMessageAlignment = (message: Message) => {
    if (userType === 'client') {
      return message.sender_type === 'client' ? 'justify-end' : 'justify-start';
    } else {
      return message.sender_type === 'shop' || message.sender_name.includes('📱 SMS') ? 'justify-end' : 'justify-start';
    }
  };

  const getMessageStyle = (message: Message) => {
    if (message.sender_name.includes('📱 SMS')) {
      return 'bg-green-50 border-2 border-green-300 text-green-900 shadow-md dark:bg-green-900/30 dark:border-green-700 dark:text-green-100';
    }
    
    if (userType === 'client') {
      return message.sender_type === 'client' 
        ? 'bg-primary text-primary-foreground'
        : 'bg-card';
    } else {
      return message.sender_type === 'shop' || message.sender_name.includes('📱 SMS')
        ? 'bg-primary text-primary-foreground'
        : 'bg-card';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Discussion - Dossier {caseNumber}
          </div>
          {userType === 'shop' && customerPhone && (
            <SMSButton
              customerPhone={customerPhone}
              customerName={customerName}
              caseNumber={caseNumber}
              caseId={savCaseId!}
              size="sm"
            />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-96 w-full pr-4">
          <div className="space-y-4">
            {loading ? (
              <div className="text-center text-muted-foreground">
                Chargement des messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground">
                Aucun message pour l'instant. Commencez la conversation !
              </div>
            ) : (
              messages.map((message) => {
                const canDelete = canDeleteMessage(message);
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${getMessageAlignment(message)}`}
                  >
                    <div className={`max-w-[80%] rounded-lg p-3 relative ${getMessageStyle(message)}`}>
                      {/* Bouton de suppression */}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md border border-white transition-colors"
                          title="Supprimer le message (disponible pendant 1 minute)"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{message.sender_name}</span>
                        <Badge 
                          variant={getBadgeVariant(message)}
                          className={`text-xs ${
                            message.sender_name.includes('📱 SMS') 
                              ? 'bg-green-600 hover:bg-green-700 text-white font-medium' 
                              : ''
                          }`}
                        >
                          {getBadgeText(message)}
                        </Badge>
                      </div>
                      
                      <p className="text-sm whitespace-pre-wrap">
                        {renderMessageWithLinks(message.message)}
                      </p>
                      
                      <div className="text-xs opacity-70 mt-1">
                        {formatTime(message.created_at)}
                        {userType === 'shop' && 
                         message.sender_type === 'shop' && 
                         !message.read_by_client && 
                         !message.sender_name.includes('📱 SMS') && (
                          <span className="ml-2">• Non lu</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Zone de saisie ou avertissement si fermé */}
        {isCaseClosed ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-5 w-5" />
              <h4 className="font-medium">Chat fermé</h4>
            </div>
            <p className="text-sm text-amber-600 mt-1">
              Ce dossier SAV est terminé. Vous ne pouvez plus envoyer de messages via ce chat. 
              Contactez directement le magasin si nécessaire.
            </p>
            {shopPhone && (
              <p className="text-xs text-amber-600 mt-2">
                📞 Téléphone du magasin : <span className="font-medium">{shopPhone}</span>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Textarea
              placeholder="Tapez votre message ici..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              rows={3}
            />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Appuyez sur Entrée pour envoyer, Shift+Entrée pour une nouvelle ligne
              </span>
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
  );
}