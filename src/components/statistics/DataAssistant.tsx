import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useShop } from '@/contexts/ShopContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bot, Send, User, Loader2, Sparkles, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const DataAssistant = () => {
  const { shop } = useShop();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll vers le bas quand les messages changent
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !shop?.id) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-data-assistant', {
        body: { question: userMessage.content, shopId: shop.id }
      });

      if (error) {
        console.error('Error calling AI assistant:', error);
        toast.error('Erreur lors de la communication avec l\'assistant');
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearConversation = () => {
    setMessages([]);
  };

  const formatMessage = (content: string) => {
    // Formatage basique markdown
    return content
      .split('\n')
      .map((line, i) => {
        // Titres
        if (line.startsWith('### ')) {
          return <h4 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(4)}</h4>;
        }
        if (line.startsWith('## ')) {
          return <h3 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(3)}</h3>;
        }
        // Listes à puces
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return <li key={i} className="ml-4 list-disc">{line.slice(2)}</li>;
        }
        // Listes numérotées
        if (/^\d+\.\s/.test(line)) {
          return <li key={i} className="ml-4 list-decimal">{line.replace(/^\d+\.\s/, '')}</li>;
        }
        // Texte en gras
        if (line.includes('**')) {
          const parts = line.split('**');
          return (
            <p key={i} className="mb-1">
              {parts.map((part, j) => 
                j % 2 === 1 ? <strong key={j}>{part}</strong> : part
              )}
            </p>
          );
        }
        // Ligne vide
        if (!line.trim()) {
          return <br key={i} />;
        }
        return <p key={i} className="mb-1">{line}</p>;
      });
  };

  const exampleQuestions = [
    "Combien de SAV ai-je traité ce mois-ci ?",
    "Quelle est ma pièce la plus utilisée ?",
    "Quel est mon taux de rentabilité ce mois ?",
    "Liste les SAV avec prise en charge du dernier mois"
  ];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Assistant IA Fixway
                <Sparkles className="h-4 w-4 text-yellow-500" />
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Posez vos questions sur vos données
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearConversation}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-3">
          {/* Zone de messages */}
          <ScrollArea 
            ref={scrollAreaRef} 
            className="h-[300px] rounded-lg border bg-background/50 p-3"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <Bot className="h-12 w-12 text-muted-foreground/40" />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Bonjour ! Je suis votre assistant IA.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Posez-moi des questions sur vos SAV, pièces, clients ou finances.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {exampleQuestions.map((q, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-1.5 px-2"
                      onClick={() => setInput(q)}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                          {formatMessage(message.content)}
                        </div>
                      ) : (
                        <p className="text-sm">{message.content}</p>
                      )}
                      <p className="text-[10px] opacity-60 mt-1">
                        {message.timestamp.toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Zone de saisie */}
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question..."
              className="min-h-[44px] max-h-[120px] resize-none"
              disabled={isLoading}
            />
            <Button 
              onClick={handleSend} 
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-[44px] w-[44px]"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
