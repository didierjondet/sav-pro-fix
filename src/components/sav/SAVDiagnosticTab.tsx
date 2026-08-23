import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Loader2, Send, RefreshCw, Stethoscope, ImagePlus, X, Video } from 'lucide-react';

interface Props {
  savCase: any;
}

interface DiagAttachment {
  path: string;
  name: string;
  type: string;
}

interface DiagMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  attachments?: DiagAttachment[] | null;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 Mo

export function SAVDiagnosticTab({ savCase }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [initialAnalysis, setInitialAnalysis] = useState<string | null>(savCase.ai_diagnostic || null);
  const [generating, setGenerating] = useState(false);
  const [messages, setMessages] = useState<DiagMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const savContext = {
    problem_description: savCase.problem_description,
    device_brand: savCase.device_brand,
    device_model: savCase.device_model,
    sav_type: savCase.sav_type,
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from('sav_diagnostic_messages' as any)
      .select('*')
      .eq('sav_case_id', savCase.id)
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: true });
    setMessages((data || []) as any);
  };

  useEffect(() => {
    loadMessages();
  }, [savCase.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, initialAnalysis]);

  // Génère les URLs signées pour afficher les médias des messages
  useEffect(() => {
    const paths = messages
      .flatMap((m) => (Array.isArray(m.attachments) ? m.attachments : []))
      .map((a) => a?.path)
      .filter((p): p is string => !!p && !previews[p]);
    if (paths.length === 0) return;
    (async () => {
      const entries: Record<string, string> = {};
      for (const path of paths) {
        const { data } = await supabase.storage.from('sav-attachments').createSignedUrl(path, 3600);
        if (data?.signedUrl) entries[path] = data.signedUrl;
      }
      if (Object.keys(entries).length) setPreviews((prev) => ({ ...prev, ...entries }));
    })();
  }, [messages]);

  const handleSelectFiles = (files: FileList | null) => {
    if (!files) return;
    const accepted: File[] = [];
    Array.from(files).forEach((f) => {
      if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) {
        toast({ title: 'Format non supporté', description: `${f.name} n'est ni une photo ni une vidéo.`, variant: 'destructive' });
        return;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast({ title: 'Fichier trop lourd', description: `${f.name} dépasse 20 Mo.`, variant: 'destructive' });
        return;
      }
      accepted.push(f);
    });
    setPendingFiles((prev) => [...prev, ...accepted]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Upload des fichiers en attente + génération d'URLs signées pour l'IA
  const uploadPending = async (): Promise<{ stored: DiagAttachment[]; forAI: { url: string; type: string }[] }> => {
    if (pendingFiles.length === 0) return { stored: [], forAI: [] };
    setUploading(true);
    try {
      const stored: DiagAttachment[] = [];
      const forAI: { url: string; type: string }[] = [];
      for (const file of pendingFiles) {
        const ext = file.name.split('.').pop();
        const key = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const path = `${savCase.shop_id}/${savCase.id}/diagnostic/${key}`;
        const { error } = await supabase.storage.from('sav-attachments').upload(path, file);
        if (error) throw error;
        stored.push({ path, name: file.name, type: file.type });
        const { data: signed } = await supabase.storage.from('sav-attachments').createSignedUrl(path, 3600);
        if (signed?.signedUrl) forAI.push({ url: signed.signedUrl, type: file.type });
      }
      setPendingFiles([]);
      return { stored, forAI };
    } finally {
      setUploading(false);
    }
  };

  const generateInitial = async () => {
    if (!savCase.problem_description || savCase.problem_description.trim() === '') {
      toast({
        title: 'Description manquante',
        description: 'Renseignez la description du problème avant de lancer le diagnostic IA.',
        variant: 'destructive',
      });
      return;
    }
    setGenerating(true);
    try {
      const { stored, forAI } = await uploadPending();

      const { data, error } = await supabase.functions.invoke('ai-diagnostic-sav', {
        body: { mode: 'initial', savContext, attachments: forAI },
      });
      if (error) throw new Error(data?.error || error.message);
      if (data?.error) throw new Error(data.error);
      const text = data?.text;
      if (!text) throw new Error('Aucune réponse IA reçue');

      await supabase
        .from('sav_cases')
        .update({ ai_diagnostic: text, ai_diagnostic_generated_at: new Date().toISOString() })
        .eq('id', savCase.id);

      if (stored.length > 0) {
        await supabase.from('sav_diagnostic_messages' as any).insert({
          sav_case_id: savCase.id,
          shop_id: savCase.shop_id,
          role: 'user',
          content: 'Médias joints pour le diagnostic initial.',
          user_id: user?.id || null,
          attachments: stored as any,
        });
        loadMessages();
      }

      setInitialAnalysis(text);
      toast({ title: 'Diagnostic IA généré', description: 'Analyse des causes possibles disponible.' });
    } catch (e: any) {
      toast({ title: 'Erreur IA', description: e.message || 'Impossible de générer le diagnostic.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text && pendingFiles.length === 0) return;
    setSending(true);
    try {
      const { stored, forAI } = await uploadPending();
      const content = text || 'Analyse ces médias de l\'appareil.';

      const { data: inserted, error: insErr } = await supabase
        .from('sav_diagnostic_messages' as any)
        .insert({
          sav_case_id: savCase.id,
          shop_id: savCase.shop_id,
          role: 'user',
          content,
          user_id: user?.id || null,
          attachments: stored as any,
        })
        .select()
        .single();
      if (insErr) throw insErr;

      const nextMessages = [...messages, inserted as any];
      setMessages(nextMessages);
      setInput('');

      // Historique pour l'IA (les médias ne sont transmis que pour le message courant)
      const history: any[] = [];
      if (initialAnalysis) {
        history.push({ role: 'assistant', content: initialAnalysis });
      }
      nextMessages.forEach((m, idx) => {
        const isLast = idx === nextMessages.length - 1;
        history.push({
          role: m.role,
          content: m.content,
          ...(isLast && forAI.length > 0 ? { attachments: forAI } : {}),
        });
      });

      const { data, error } = await supabase.functions.invoke('ai-diagnostic-sav', {
        body: { mode: 'chat', savContext, messages: history },
      });
      if (error) throw new Error(data?.error || error.message);
      if (data?.error) throw new Error(data.error);
      const reply = data?.text;
      if (!reply) throw new Error('Aucune réponse IA');

      const { data: assistantRow } = await supabase
        .from('sav_diagnostic_messages' as any)
        .insert({
          sav_case_id: savCase.id,
          shop_id: savCase.shop_id,
          role: 'assistant',
          content: reply,
        })
        .select()
        .single();

      setMessages((prev) => [...prev, assistantRow as any]);
    } catch (e: any) {
      toast({ title: 'Erreur IA', description: e.message || 'Impossible d\'envoyer le message.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const MediaPicker = (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => handleSelectFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || generating || sending}
      >
        <ImagePlus className="h-4 w-4 mr-2" />
        Ajouter photo / vidéo
      </Button>
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pendingFiles.map((f, i) => (
            <div key={`${f.name}-${i}`} className="relative border rounded-md p-1 bg-muted/50">
              {f.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(f)} alt={f.name} className="h-16 w-16 object-cover rounded" />
              ) : (
                <div className="h-16 w-16 flex items-center justify-center">
                  <Video className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <button
                type="button"
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAttachments = (atts?: DiagAttachment[] | null) => {
    if (!Array.isArray(atts) || atts.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {atts.map((a) => {
          const url = previews[a.path];
          if (!url) return <div key={a.path} className="h-20 w-20 bg-muted rounded animate-pulse" />;
          return a.type?.startsWith('video/') ? (
            <video key={a.path} src={url} controls className="h-32 rounded border" />
          ) : (
            <a key={a.path} href={url} target="_blank" rel="noreferrer">
              <img src={url} alt={a.name} className="h-20 w-20 object-cover rounded border" />
            </a>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="h-4 w-4 text-primary" /> Diagnostic IA
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            L'assistant analyse la panne décrite (et les photos ou vidéos jointes) et propose des causes possibles ainsi que des pistes de réparation.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-muted rounded-md text-sm">
            <p className="text-xs uppercase text-muted-foreground mb-1">Panne décrite</p>
            <p className="whitespace-pre-wrap">{savCase.problem_description || '—'}</p>
          </div>

          {MediaPicker}

          {!initialAnalysis && (
            <Button onClick={generateInitial} disabled={generating || uploading}>
              {generating || uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Générer le diagnostic
            </Button>
          )}

          {initialAnalysis && (
            <div className="space-y-2">
              <div className="prose prose-sm max-w-none dark:prose-invert bg-background border rounded-md p-4">
                <ReactMarkdown>{initialAnalysis}</ReactMarkdown>
              </div>
              <Button variant="outline" size="sm" onClick={generateInitial} disabled={generating || uploading}>
                {generating || uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Régénérer l'analyse
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {initialAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Discussion avec l'assistant technique</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div ref={scrollRef} className="max-h-96 overflow-y-auto space-y-3 pr-1">
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Posez une question complémentaire à l'IA (ex : « quelle pièce prévoir en priorité ? ») ou joignez une photo de l'appareil.
                </p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-md text-sm ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground ml-8'
                      : 'bg-muted mr-8'
                  }`}
                >
                  {m.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                  {renderAttachments(m.attachments)}
                </div>
              ))}
            </div>

            <div className="flex gap-2 items-end">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!sending) sendMessage();
                  }
                }}
                placeholder="Posez votre question à l'IA..."
                rows={2}
                disabled={sending}
              />
              <Button onClick={sendMessage} disabled={sending || uploading || (!input.trim() && pendingFiles.length === 0)}>
                {sending || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
