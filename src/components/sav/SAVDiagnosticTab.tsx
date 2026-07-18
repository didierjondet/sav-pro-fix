import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Loader2, Send, RefreshCw, Stethoscope } from 'lucide-react';

interface Props {
  savCase: any;
}

interface DiagMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export function SAVDiagnosticTab({ savCase }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [initialAnalysis, setInitialAnalysis] = useState<string | null>(savCase.ai_diagnostic || null);
  const [generating, setGenerating] = useState(false);
  const [messages, setMessages] = useState<DiagMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
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
      const { data, error } = await supabase.functions.invoke('ai-diagnostic-sav', {
        body: { mode: 'initial', savContext },
      });
      if (error) throw new Error(data?.error || error.message);
      if (data?.error) throw new Error(data.error);
      const text = data?.text;
      if (!text) throw new Error('Aucune réponse IA reçue');

      await supabase
        .from('sav_cases')
        .update({ ai_diagnostic: text, ai_diagnostic_generated_at: new Date().toISOString() })
        .eq('id', savCase.id);

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
    if (!text) return;
    setSending(true);
    try {
      // Persist user message
      const { data: inserted, error: insErr } = await supabase
        .from('sav_diagnostic_messages' as any)
        .insert({
          sav_case_id: savCase.id,
          shop_id: savCase.shop_id,
          role: 'user',
          content: text,
          created_by: user?.id || null,
        })
        .select()
        .single();
      if (insErr) throw insErr;

      const nextMessages = [...messages, inserted as any];
      setMessages(nextMessages);
      setInput('');

      // Build history for AI (include initial analysis as assistant seed if present)
      const history: { role: string; content: string }[] = [];
      if (initialAnalysis) {
        history.push({ role: 'assistant', content: initialAnalysis });
      }
      nextMessages.forEach((m) => history.push({ role: m.role, content: m.content }));

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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="h-4 w-4 text-primary" /> Diagnostic IA
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            L'assistant analyse la panne décrite et propose des causes possibles ainsi que des pistes de réparation.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-muted rounded-md text-sm">
            <p className="text-xs uppercase text-muted-foreground mb-1">Panne décrite</p>
            <p className="whitespace-pre-wrap">{savCase.problem_description || '—'}</p>
          </div>

          {!initialAnalysis && (
            <Button onClick={generateInitial} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Générer le diagnostic
            </Button>
          )}

          {initialAnalysis && (
            <div className="space-y-2">
              <div className="prose prose-sm max-w-none dark:prose-invert bg-background border rounded-md p-4">
                <ReactMarkdown>{initialAnalysis}</ReactMarkdown>
              </div>
              <Button variant="outline" size="sm" onClick={generateInitial} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
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
                  Posez une question complémentaire à l'IA (ex : « quelle pièce prévoir en priorité ? »).
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
              <Button onClick={sendMessage} disabled={sending || !input.trim()}>
                {sending ? <Loader2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
