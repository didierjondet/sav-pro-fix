import React, { useState, useRef, useEffect } from 'react';
import { MessageCircleQuestion, X, Send, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHelpBot } from '@/hooks/useHelpBot';
import { useAuth } from '@/contexts/AuthContext';
import { useShop } from '@/hooks/useShop';
import { useLocation } from 'react-router-dom';

const PUBLIC_EXACT = ['/', '/landing', '/features', '/about', '/contact', '/auth', '/test', '/chrome-extension-download'];
const PUBLIC_PREFIX = ['/track/', '/quote/', '/satisfaction/', '/rdv/', '/shop/'];

function renderSimpleMarkdown(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bold
    let html = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="underline text-primary">$1</a>');
    // List items
    if (/^[-•]\s/.test(html)) {
      html = '<li class="ml-4 list-disc">' + html.replace(/^[-•]\s/, '') + '</li>';
    } else if (/^\d+\.\s/.test(html)) {
      html = '<li class="ml-4 list-decimal">' + html.replace(/^\d+\.\s/, '') + '</li>';
    }
    if (!html.trim()) return <br key={i} />;
    return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
  }).reduce<React.ReactNode[]>((acc, el, i) => {
    if (i > 0) acc.push(<br key={`br-${i}`} />);
    acc.push(el);
    return acc;
  }, []);
}

const HelpBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { user } = useAuth();
  const { shop } = useShop();
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    faqItems,
    sendMessage,
    clearMessages,
    incrementFAQClick,
    getUserContext,
  } = useHelpBot();

  const userContext = getUserContext();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const isPublicRoute = PUBLIC_EXACT.includes(location.pathname) || PUBLIC_PREFIX.some(p => location.pathname.startsWith(p));
  if (!user || isPublicRoute) return null;

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput('');
    await sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFAQClick = async (faq: { id: string; question: string }) => {
    await incrementFAQClick(faq.id);
    await sendMessage(faq.question);
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-all flex items-center justify-center"
          aria-label="Ouvrir l'assistant"
        >
          <MessageCircleQuestion className="h-6 w-6" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-[380px] max-h-[560px] flex flex-col rounded-2xl border bg-background shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-primary rounded-t-2xl text-primary-foreground">
            <div className="flex items-center gap-2">
              <MessageCircleQuestion className="h-5 w-5" />
              <span className="font-semibold text-sm">Assistant Fixway</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20" onClick={clearMessages}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-0 max-h-[380px]">
            <div ref={scrollRef} className="p-4 space-y-3">
              {(!userContext.profileComplete || !userContext.shopComplete) && messages.length === 0 && (
                <div className="bg-accent/50 border border-accent rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium text-foreground mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    Configuration incomplète
                  </div>
                  {!userContext.profileComplete && (
                    <p className="text-muted-foreground text-xs">• Complétez votre profil (nom, prénom, téléphone) dans Paramètres</p>
                  )}
                  {!userContext.shopComplete && (
                    <p className="text-muted-foreground text-xs">• Configurez votre boutique (nom, email) dans Paramètres</p>
                  )}
                </div>
              )}

              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Bonjour ! Je suis votre assistant Fixway. Comment puis-je vous aider ?
                  </p>
                  {faqItems.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Questions fréquentes</p>
                      {faqItems.slice(0, 4).map(faq => (
                        <button
                          key={faq.id}
                          onClick={() => handleFAQClick(faq)}
                          className="w-full text-left text-sm px-3 py-2 rounded-lg border bg-muted/50 hover:bg-muted transition-colors"
                        >
                          {faq.question}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0">
                        {renderSimpleMarkdown(msg.content)}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-xl px-4 py-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-3">
            <div className="flex gap-2 items-end">
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question..."
                className="min-h-[40px] max-h-[100px] resize-none text-sm"
                rows={1}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="shrink-0 h-10 w-10"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HelpBot;
