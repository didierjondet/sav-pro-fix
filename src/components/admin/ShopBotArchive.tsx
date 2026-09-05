import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bot, User, ArrowLeft, Search, ShieldCheck, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BotMessage {
  role: string;
  content: string;
  timestamp?: string;
}

interface BotConversation {
  id: string;
  user_name: string | null;
  messages: BotMessage[];
  escalated: boolean;
  escalation_summary: string | null;
  created_at: string;
  updated_at: string;
}

type Topic = 'bug' | 'feature' | 'pricing' | 'onboarding';

const TOPIC_LABELS: Record<Topic, string> = {
  bug: 'Bug / blocage',
  feature: 'Fonctionnalité',
  pricing: 'Prix / abonnement',
  onboarding: 'Prise en main',
};

const TOPIC_STYLES: Record<Topic, string> = {
  bug: 'border-destructive text-destructive',
  feature: 'border-primary text-primary',
  pricing: 'border-amber-500 text-amber-600',
  onboarding: 'border-emerald-600 text-emerald-700',
};

const TOPIC_KEYWORDS: Record<Topic, string[]> = {
  bug: ['bug', 'erreur', 'ne marche pas', 'ne fonctionne pas', 'probleme', 'problème', 'plante', 'impossible', 'bloqué', 'bloque', 'panne du logiciel', 'ça bug'],
  pricing: ['prix', 'tarif', 'abonnement', 'facture', 'paiement', 'plan', 'credit sms', 'crédit sms', 'crédits', 'offre', 'essai'],
  feature: ['fonctionnalite', 'fonctionnalité', 'option', 'comment faire', 'comment puis-je', 'est-ce possible', 'peut-on', 'ajouter', 'parametre', 'paramètre', 'reglage', 'réglage', 'widget', 'devis', 'sav', 'stock', 'agenda', 'facturation'],
  onboarding: ['demarrer', 'démarrer', 'commencer', 'configurer', 'installation', 'premiere', 'première', 'tutoriel', 'debuter', 'débuter'],
};

function normalize(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function detectTopics(conversation: BotConversation): Topic[] {
  const text = normalize(
    (conversation.messages || []).map((m) => m?.content || '').join(' ') +
      ' ' + (conversation.escalation_summary || '')
  );
  const topics: Topic[] = [];
  (Object.keys(TOPIC_KEYWORDS) as Topic[]).forEach((topic) => {
    if (TOPIC_KEYWORDS[topic].some((kw) => text.includes(normalize(kw)))) topics.push(topic);
  });
  return topics;
}

interface ShopBotArchiveProps {
  shopId: string;
  shopName?: string;
}

export function ShopBotArchive({ shopId, shopName }: ShopBotArchiveProps) {
  const [conversations, setConversations] = useState<BotConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BotConversation | null>(null);
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('help_bot_conversations')
        .select('id, user_name, messages, escalated, escalation_summary, created_at, updated_at')
        .eq('shop_id', shopId)
        .order('updated_at', { ascending: false })
        .limit(200);
      if (cancelled) return;
      if (error) {
        console.error('Erreur chargement conversations bot:', error);
        setConversations([]);
      } else {
        setConversations(
          ((data as any[]) || []).map((c) => ({
            ...c,
            messages: Array.isArray(c.messages) ? (c.messages as BotMessage[]) : [],
          }))
        );
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [shopId]);

  // Seules les conversations liées à l'usage du logiciel sont archivées/affichées
  const usageConversations = useMemo(
    () =>
      conversations
        .map((c) => ({ conversation: c, topics: detectTopics(c) }))
        .filter((entry) => entry.topics.length > 0),
    [conversations]
  );

  const excludedCount = conversations.length - usageConversations.length;

  const filtered = useMemo(() => {
    const term = normalize(search.trim());
    return usageConversations.filter(({ conversation, topics }) => {
      if (topicFilter !== 'all' && !topics.includes(topicFilter as Topic)) return false;
      if (!term) return true;
      const haystack = normalize(
        (conversation.user_name || '') + ' ' + conversation.messages.map((m) => m.content || '').join(' ')
      );
      return haystack.includes(term);
    });
  }, [usageConversations, search, topicFilter]);

  if (selected) {
    const topics = detectTopics(selected);
    return (
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4" />
              {selected.user_name || 'Utilisateur'} —{' '}
              {format(new Date(selected.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <Badge key={t} variant="outline" className={TOPIC_STYLES[t]}>
                {TOPIC_LABELS[t]}
              </Badge>
            ))}
            {selected.escalated && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Escaladée
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {selected.escalation_summary && (
            <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <strong>Résumé escalade :</strong> {selected.escalation_summary}
            </div>
          )}
          <ScrollArea className="h-[420px] pr-4">
            <div className="space-y-3">
              {selected.messages.map((m, idx) => (
                <div key={idx} className="flex gap-2">
                  <div className="mt-1">
                    {m.role === 'assistant' ? (
                      <Bot className="h-4 w-4 text-primary" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 rounded-md bg-muted/50 p-2 text-sm whitespace-pre-wrap">
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-4 w-4" />
          Historique des échanges avec l'assistant {shopName ? `— ${shopName}` : ''}
        </CardTitle>
        <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Archives limitées à l'usage de Fixway Pro (bugs, blocages, fonctionnalités, prix et
            abonnement). Les échanges sans rapport avec le logiciel ne sont pas affichés
            {excludedCount > 0 ? ` (${excludedCount} conversation(s) exclue(s))` : ''}.
          </span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Rechercher dans les échanges..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={topicFilter} onValueChange={setTopicFilter}>
            <SelectTrigger className="sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les thèmes</SelectItem>
              {(Object.keys(TOPIC_LABELS) as Topic[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {TOPIC_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Aucun échange concernant l'usage de Fixway Pro pour ce magasin.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(({ conversation, topics }) => (
              <button
                key={conversation.id}
                onClick={() => setSelected(conversation)}
                className="w-full rounded-md border p-3 text-left hover:bg-accent transition-colors"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-sm">
                    {conversation.user_name || 'Utilisateur'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(conversation.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </span>
                  {topics.map((t) => (
                    <Badge key={t} variant="outline" className={`text-xs ${TOPIC_STYLES[t]}`}>
                      {TOPIC_LABELS[t]}
                    </Badge>
                  ))}
                  {conversation.escalated && (
                    <Badge variant="destructive" className="text-xs">
                      Escaladée
                    </Badge>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {conversation.messages.find((m) => m.role === 'user')?.content || '—'}
                </p>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ShopBotArchive;
