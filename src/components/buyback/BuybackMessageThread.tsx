import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';

interface Props {
  requestId: string;
  shopId: string;
  /** Qui écrit depuis cet écran */
  as: 'customer' | 'shop';
}

interface Msg {
  id: string;
  sender: 'customer' | 'shop';
  body: string;
  created_at: string;
}

/** Fil de discussion entre un particulier et un magasin, pour une cotation */
export function BuybackMessageThread({ requestId, shopId, as }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const key = ['buyback-messages', requestId, shopId];

  const { data: messages = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buyback_messages' as any)
        .select('id, sender, body, created_at')
        .eq('request_id', requestId)
        .eq('shop_id', shopId)
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as unknown as Msg[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`buyback-msg-${requestId}-${shopId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'buyback_messages', filter: `request_id=eq.${requestId}` },
        () => qc.invalidateQueries({ queryKey: key }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, shopId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || !user) return;
    setSending(true);
    const { error } = await supabase.from('buyback_messages' as any).insert({
      request_id: requestId,
      shop_id: shopId,
      sender: as,
      body,
      sender_user_id: user.id,
    });
    setSending(false);
    if (error) {
      toast({ title: 'Message non envoyé', description: error.message, variant: 'destructive' });
      return;
    }
    setText('');
    qc.invalidateQueries({ queryKey: key });
  };

  return (
    <div className="space-y-3">
      <div className="max-h-72 overflow-y-auto space-y-2 rounded-lg border p-3 bg-muted/30">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin mx-auto" />}
        {!isLoading && messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center">Aucun message pour l'instant.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === as ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                m.sender === as ? 'bg-primary text-primary-foreground' : 'bg-background border'
              }`}
            >
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className="text-[10px] opacity-70 mt-1">
                {new Date(m.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <div className="flex gap-2">
        <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Votre message…" />
        <Button type="button" onClick={send} disabled={sending || !text.trim()} size="icon" className="shrink-0 self-end">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
