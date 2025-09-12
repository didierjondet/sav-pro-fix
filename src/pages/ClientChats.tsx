import { useEffect, useMemo, useRef, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSAVUnreadMessages } from '@/hooks/useSAVUnreadMessages';
import { useProfile } from '@/hooks/useProfile';
import { SAVMessaging } from '@/components/sav/SAVMessaging';
import { MessageSquare, Volume2, VolumeX, Search, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface SelectedChat {
  id: string;
  case_number: string;
}

export default function ClientChats() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { savWithUnreadMessages, loading } = useSAVUnreadMessages();
  const { profile } = useProfile();
  const [selected, setSelected] = useState<SelectedChat | null>(null);
  const [query, setQuery] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const navigate = useNavigate();

  // SEO: title and meta
  useEffect(() => {
    document.title = 'Chat clients | Gestion SAV';
    // Meta description
    const meta = document.querySelector('meta[name="description"]') || (() => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'description');
      document.head.appendChild(m);
      return m;
    })();
    meta.setAttribute('content', "Chat clients: liste des discussions ouvertes, notifications sonores et fil de discussion en temps réel.");
    // Canonical URL
    const link = document.querySelector('link[rel="canonical"]') || (() => {
      const l = document.createElement('link');
      l.setAttribute('rel', 'canonical');
      document.head.appendChild(l);
      return l;
    })();
    link.setAttribute('href', window.location.href);
  }, []);

  // Load preference from localStorage
  useEffect(() => {
    const pref = localStorage.getItem('chatSoundEnabled');
    setSoundEnabled(pref !== 'false');
  }, []);

  // Init audio element
  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');
    audioRef.current.preload = 'auto';
  }, []);

  // Realtime sound on new client message for this shop
  useEffect(() => {
    if (!profile?.shop_id) return;

    const channel = supabase
      .channel('client-chat-sound')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sav_messages',
          filter: `shop_id=eq.${profile.shop_id}`,
        },
        (payload) => {
          try {
            // Only play for client messages and if enabled
            const row: any = (payload as any).new;
            if (row?.sender_type === 'client') {
              const pref = localStorage.getItem('chatSoundEnabled');
              const enabled = pref !== 'false';
              if (enabled && audioRef.current) {
                // Attempt to play; catch to avoid uncaught promise rejection
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(() => {});
              }
            }
          } catch {}
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.shop_id]);

  const totalUnread = useMemo(
    () => savWithUnreadMessages.reduce((sum, s) => sum + s.unread_count, 0),
    [savWithUnreadMessages]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return savWithUnreadMessages;
    return savWithUnreadMessages.filter((s) =>
      s.case_number.toLowerCase().includes(q)
    );
  }, [query, savWithUnreadMessages]);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
          <main className="flex-1 overflow-hidden p-6">
            <h1 className="sr-only">Chat clients - discussions ouvertes et fil de discussion</h1>
            <div className="max-w-7xl mx-auto h-full grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6">
              {/* Left: Open chats list */}
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Chats ouverts
                    </span>
                    {totalUnread > 0 && (
                      <Badge variant="secondary">{totalUnread}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Rechercher #numéro"
                      className="pl-9"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {loading ? 'Chargement...' : `${filtered.length} chat(s)`}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const current = localStorage.getItem('chatSoundEnabled');
                        const next = current === 'false';
                        localStorage.setItem('chatSoundEnabled', next ? 'true' : 'false');
                        setSoundEnabled(next);
                      }}
                      className="gap-2"
                    >
                      {soundEnabled ? (
                        <>
                          <Volume2 className="h-4 w-4" />
                          Son activé
                        </>
                      ) : (
                        <>
                          <VolumeX className="h-4 w-4" />
                          Son coupé
                        </>
                      )}
                    </Button>
                  </div>

                  <ScrollArea className="h-[calc(100vh-260px)] pr-3">
                    <div className="space-y-2">
                      {filtered.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-8 text-center">
                          Aucun chat en attente pour l'instant
                        </div>
                      ) : (
                        filtered.map((s) => (
                          <div
                            key={s.id}
                            className={`p-3 border rounded-lg ${
                              selected?.id === s.id ? 'bg-primary text-primary-foreground' : 'bg-background'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <Button
                                variant="ghost"
                                className={`flex-1 justify-start p-0 h-auto ${
                                  selected?.id === s.id ? 'text-primary-foreground hover:text-primary-foreground/80' : ''
                                }`}
                                onClick={() => setSelected({ id: s.id, case_number: s.case_number })}
                              >
                                <div className="flex flex-col items-start gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm">#{s.case_number}</span>
                                    {s.unread_count > 0 && (
                                      <Badge variant="destructive" className="text-xs">
                                        {s.unread_count}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs opacity-75">
                                    {s.customer?.first_name && s.customer?.last_name
                                      ? `${s.customer.first_name} ${s.customer.last_name}`
                                      : 'Client'
                                    }
                                  </div>
                                  <div className="text-xs opacity-60">
                                    {s.device_brand} {s.device_model}
                                  </div>
                                </div>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`p-1 h-8 w-8 ${
                                  selected?.id === s.id ? 'text-primary-foreground hover:text-primary-foreground/80' : ''
                                }`}
                                onClick={() => navigate(`/sav/${s.id}`)}
                                title="Voir le dossier SAV"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Right: Conversation */}
              <div className="h-full">
                {selected ? (
                  <SAVMessaging savCaseId={selected.id} savCaseNumber={selected.case_number} />
                ) : (
                  <Card className="h-full">
                    <CardContent className="h-full flex items-center justify-center text-muted-foreground">
                      Sélectionnez un chat à gauche pour afficher la discussion
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
