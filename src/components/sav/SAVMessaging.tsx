import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSAVMessages } from '@/hooks/useSAVMessages';
import { useProfile } from '@/hooks/useProfile';
import { MessageSquare, Send, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SMSButton } from './SMSButton';

interface SAVMessagingProps {
  savCaseId: string;
  savCaseNumber: string;
  customerPhone?: string;
  customerName?: string;
}

export function SAVMessaging({ savCaseId, savCaseNumber, customerPhone, customerName }: SAVMessagingProps) {
  const [newMessage, setNewMessage] = useState('');
  const { messages, loading, sendMessage, markAllAsRead, deleteMessage } = useSAVMessages(savCaseId);
  const { profile } = useProfile();
  const [sending, setSending] = useState(false);

  // Marquer tous les messages comme lus par le magasin au montage du composant
  useEffect(() => {
    if (savCaseId && markAllAsRead) {
      markAllAsRead('shop');
    }
  }, [savCaseId, markAllAsRead]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !profile) return;
    
    setSending(true);
    const senderName = `${profile.first_name} ${profile.last_name}`.trim() || 'Équipe SAV';
    
    const result = await sendMessage(newMessage.trim(), senderName, 'shop');
    
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

  const renderMessageWithLinks = (text: string) => {
    // Regex pour détecter les URLs (http, https, www)
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        // S'assurer que l'URL commence par http:// ou https://
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Discussion - Dossier {savCaseNumber}
          </div>
          {customerPhone && (
            <SMSButton
              customerPhone={customerPhone}
              customerName={customerName}
              caseNumber={savCaseNumber}
              caseId={savCaseId}
              size="sm"
            />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-96 w-full pr-4">
          <div className="space-y-4">
            {loading ? (
              <div className="text-center text-muted-foreground">Chargement des messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground">
                Aucun message pour l'instant. Commencez la conversation !
              </div>
            ) : (
              messages.map((message) => {
                // Calculer si le message peut être supprimé (moins d'1 minute et par le bon sender)
                const messageTime = new Date(message.created_at);
                const now = new Date();
                const canDelete = message.sender_type === 'shop' && 
                  (now.getTime() - messageTime.getTime()) < 60000; // 1 minute
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_type === 'shop' || message.sender_name.includes('📱 SMS') ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 relative ${
                        message.sender_name.includes('📱 SMS')
                          ? 'bg-green-100 border-2 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
                          : message.sender_type === 'shop'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {/* Bouton de suppression - visible si supprimable */}
                      {canDelete && (
                        <button
                          onClick={() => deleteMessage && deleteMessage(message.id)}
                          className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md border border-white transition-colors"
                          title="Supprimer le message (disponible pendant 1 minute)"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{message.sender_name}</span>
                        <Badge 
                          variant={
                            message.sender_name.includes('📱 SMS') ? 'default' :
                            message.sender_type === 'shop' ? 'secondary' : 'outline'
                          } 
                          className={`text-xs ${
                            message.sender_name.includes('📱 SMS') ? 'bg-green-500 text-white' : ''
                          }`}
                        >
                          {message.sender_name.includes('📱 SMS') ? 'SMS' : 
                           message.sender_type === 'shop' ? 'Boutique' : 'Client'}
                        </Badge>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{renderMessageWithLinks(message.message)}</p>
                      <div className="text-xs opacity-70 mt-1">
                        {formatTime(message.created_at)}
                        {message.sender_type === 'shop' && !message.read_by_client && !message.sender_name.includes('📱 SMS') && (
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
      </CardContent>
    </Card>
  );
}