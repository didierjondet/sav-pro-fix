import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bot, User, Trash2, AlertTriangle, Search, ArrowLeft, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BotConversation {
  id: string;
  shop_id: string;
  user_id: string;
  user_name: string | null;
  messages: Array<{ role: string; content: string; timestamp?: string }>;
  escalated: boolean;
  escalation_summary: string | null;
  created_at: string;
  updated_at: string;
  shop_name?: string;
}

interface BotConversationsViewerProps {
  shopId?: string;
  shopName?: string;
}

export function BotConversationsViewer({ shopId, shopName }: BotConversationsViewerProps) {
  const [conversations, setConversations] = useState<BotConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<BotConversation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEscalated, setFilterEscalated] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<'single' | 'batch' | null>(null);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);
  const [shops, setShops] = useState<Record<string, string>>({});

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('help_bot_conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (shopId) {
        query = query.eq('shop_id', shopId);
      }
      if (filterEscalated === 'escalated') {
        query = query.eq('escalated', true);
      } else if (filterEscalated === 'normal') {
        query = query.eq('escalated', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      setConversations((data || []) as unknown as BotConversation[]);

      // Fetch shop names if not filtered by shop
      if (!shopId && data && data.length > 0) {
        const shopIds = [...new Set(data.map((c: any) => c.shop_id))];
        const { data: shopsData } = await supabase
          .from('shops')
          .select('id, name')
          .in('id', shopIds);
        if (shopsData) {
          const map: Record<string, string> = {};
          shopsData.forEach((s: any) => { map[s.id] = s.name; });
          setShops(map);
        }
      }
    } catch (e) {
      console.error('Error fetching bot conversations:', e);
    } finally {
      setLoading(false);
    }
  }, [shopId, filterEscalated]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleDelete = async () => {
    try {
      if (deleteTarget === 'single' && singleDeleteId) {
        const { error } = await supabase
          .from('help_bot_conversations')
          .delete()
          .eq('id', singleDeleteId);
        if (error) throw error;
        toast.success('Conversation supprimée');
        if (selectedConversation?.id === singleDeleteId) setSelectedConversation(null);
      } else if (deleteTarget === 'batch') {
        const ids = Array.from(selectedIds);
        const { error } = await supabase
          .from('help_bot_conversations')
          .delete()
          .in('id', ids);
        if (error) throw error;
        toast.success(`${ids.length} conversation(s) supprimée(s)`);
        setSelectedIds(new Set());
        if (selectedConversation && selectedIds.has(selectedConversation.id)) {
          setSelectedConversation(null);
        }
      }
      fetchConversations();
    } catch (e) {
      console.error('Delete error:', e);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      setSingleDeleteId(null);
    }
  };

  const filteredConversations = conversations.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const userName = (c.user_name || '').toLowerCase();
    const shop = shops[c.shop_id]?.toLowerCase() || '';
    const msgContent = (c.messages || []).some(
      m => m.content?.toLowerCase().includes(term)
    );
    return userName.includes(term) || shop.includes(term) || msgContent;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const renderMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  if (selectedConversation) {
    const msgs = selectedConversation.messages || [];
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setSelectedConversation(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-lg">
                Conversation de {selectedConversation.user_name || 'Utilisateur inconnu'}
              </CardTitle>
              {selectedConversation.escalated && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> Escaladée
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {!shopId && shops[selectedConversation.shop_id] && (
                <span className="mr-3">{shops[selectedConversation.shop_id]}</span>
              )}
              {format(new Date(selectedConversation.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
            </div>
          </div>
          {selectedConversation.escalation_summary && (
            <p className="text-sm text-orange-600 mt-1">
              Escalade : {selectedConversation.escalation_summary}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {msgs.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                  />
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversations Bot {shopName ? `— ${shopName}` : ''}
            </CardTitle>
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { setDeleteTarget('batch'); setDeleteDialogOpen(true); }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Supprimer ({selectedIds.size})
              </Button>
            )}
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterEscalated} onValueChange={setFilterEscalated}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="escalated">Escaladées</SelectItem>
                <SelectItem value="normal">Non escaladées</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune conversation trouvée
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredConversations.map(conv => {
                  const msgCount = conv.messages?.length || 0;
                  const lastMsg = conv.messages?.[conv.messages.length - 1];
                  return (
                    <div
                      key={conv.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedIds.has(conv.id)}
                        onCheckedChange={() => toggleSelect(conv.id)}
                        onClick={e => e.stopPropagation()}
                      />
                      <div
                        className="flex-1 min-w-0"
                        onClick={() => setSelectedConversation(conv)}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {conv.user_name || 'Utilisateur inconnu'}
                          </span>
                          {!shopId && shops[conv.shop_id] && (
                            <Badge variant="outline" className="text-xs">
                              {shops[conv.shop_id]}
                            </Badge>
                          )}
                          {conv.escalated && (
                            <Badge variant="destructive" className="text-xs gap-1">
                              <AlertTriangle className="h-3 w-3" /> Escalade
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {msgCount} msg
                          </span>
                        </div>
                        {lastMsg && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {lastMsg.role === 'user' ? '👤' : '🤖'} {lastMsg.content?.substring(0, 80)}...
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(conv.updated_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive flex-shrink-0"
                        onClick={e => {
                          e.stopPropagation();
                          setSingleDeleteId(conv.id);
                          setDeleteTarget('single');
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget === 'batch'
                ? `Êtes-vous sûr de vouloir supprimer ${selectedIds.size} conversation(s) ? Cette action est irréversible.`
                : 'Êtes-vous sûr de vouloir supprimer cette conversation ? Cette action est irréversible.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
