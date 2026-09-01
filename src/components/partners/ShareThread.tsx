import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, MessagesSquare } from 'lucide-react';
import { useShareMessages } from '@/hooks/useSharedSAVs';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

interface Props {
  shareId: string;
  title?: string;
  compact?: boolean;
}

/** Fil de discussion inter-magasins (donneur d'ordre <-> partenaire). Jamais visible du client final. */
export function ShareThread({ shareId, title = 'Discussion avec le partenaire', compact }: Props) {
  const { messages, sendMessage, markRead } = useShareMessages(shareId);
  const { profile } = useProfile();
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  const submit = async () => {
    if (!value.trim()) return;
    setSending(true);
    try {
      await sendMessage(value);
      setValue('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessagesSquare className="h-4 w-4" />
        {title}
      </div>

      <div
        className={cn(
          'space-y-2 overflow-y-auto rounded-lg border p-3 bg-muted/20',
          compact ? 'max-h-56' : 'max-h-80'
        )}
      >
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Aucun message. Cet échange reste strictement entre les deux magasins.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_shop_id === profile?.shop_id;
            return (
              <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                    mine ? 'bg-primary text-primary-foreground' : 'bg-background border'
                  )}
                >
                  {!mine && m.sender_name && (
                    <div className="text-[11px] opacity-70 mb-0.5">{m.sender_name}</div>
                  )}
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  <div className="text-[10px] opacity-60 mt-1">
                    {new Date(m.created_at).toLocaleString('fr-FR')}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2">
        <Textarea
          rows={2}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Écrire au partenaire…"
          className="flex-1"
        />
        <Button onClick={submit} disabled={sending || !value.trim()} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
