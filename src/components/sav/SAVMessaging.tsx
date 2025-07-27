import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSAVMessages } from '@/hooks/useSAVMessages';
import { useProfile } from '@/hooks/useProfile';
import { MessageSquare, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SAVMessagingProps {
  savCaseId: string;
  savCaseNumber: string;
}

export function SAVMessaging({ savCaseId, savCaseNumber }: SAVMessagingProps) {
  const [newMessage, setNewMessage] = useState('');
  const { messages, loading, sendMessage } = useSAVMessages(savCaseId);
  const { profile } = useProfile();
  const [sending, setSending] = useState(false);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Discussion - Dossier {savCaseNumber}
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
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_type === 'shop' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.sender_type === 'shop'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{message.sender_name}</span>
                      <Badge variant={message.sender_type === 'shop' ? 'secondary' : 'outline'} className="text-xs">
                        {message.sender_type === 'shop' ? 'Boutique' : 'Client'}
                      </Badge>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                    <div className="text-xs opacity-70 mt-1">
                      {formatTime(message.created_at)}
                      {message.sender_type === 'shop' && !message.read_by_client && (
                        <span className="ml-2">• Non lu</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
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