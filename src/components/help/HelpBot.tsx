import React, { useState, useRef, useEffect } from 'react';
import { X, Send, RotateCcw, TicketCheck, XCircle, Mic, MicOff, Paperclip, Printer, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import FixyMascot from '@/components/help/FixyMascot';
import { useFixyReactions } from '@/hooks/useFixyReactions';

import { useHelpBot, type BotAttachmentInput } from '@/hooks/useHelpBot';
import { useAuth } from '@/contexts/AuthContext';
import { useShop } from '@/hooks/useShop';
import { useProfile } from '@/hooks/useProfile';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import OnboardingPanel from '@/components/help/OnboardingPanel';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

const ADVANCED_EXAMPLES = [
  "Génère un rapport de non-réparabilité imprimable pour le SAV #2026-05-22-001.",
  "Lis cette photo/PDF et donne-moi un diagnostic + pièces à commander.",
  "Quels RDV ai-je demain, avec le SAV associé et le technicien ?",
  "Diagnostic : iPhone 13 écran noir après chute, tests et pièces en stock ?",
  "Liste les SAV en retard, raison probable et action à faire aujourd'hui.",
  "Taux de retour de l'IMEI XXXXXXX, même panne et autres pannes.",
];

const PUBLIC_EXACT = ['/', '/landing', '/features', '/about', '/contact', '/auth', '/test'];
const PUBLIC_PREFIX = ['/track/', '/quote/', '/satisfaction/', '/rdv/', '/shop/'];

function renderSimpleMarkdown(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    let html = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="underline text-primary">$1</a>');
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
  const [shakeNow, setShakeNow] = useState(false);
  const [attachments, setAttachments] = useState<BotAttachmentInput[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { shop } = useShop();
  const { profile } = useProfile();
  const location = useLocation();
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    faqItems,
    pendingEscalation,
    sendMessage,
    clearMessages,
    incrementFAQClick,
    getUserContext,
    confirmEscalation,
    dismissEscalation,
  } = useHelpBot();

  const { pendingCount, isDismissed, isFullyConfigured, isOnboardingExpired } = useOnboardingProgress();

  const userContext = getUserContext();
  const fixyEvent = useFixyReactions();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, pendingEscalation]);

  const isPublicRoute = PUBLIC_EXACT.includes(location.pathname) || PUBLIC_PREFIX.some(p => location.pathname.startsWith(p));

  const aiModulesConfig = (shop as any)?.ai_modules_config || {};
  const helpbotEnabled = aiModulesConfig.helpbot_enabled ?? true;

  const canSeeOnboarding = !!profile && ['admin', 'shop_admin', 'super_admin'].includes(profile.role) && !isOnboardingExpired;
  const shouldAttract = canSeeOnboarding && !isFullyConfigured && pendingCount > 0 && !isDismissed && !isOpen;

  useEffect(() => {
    if (!shouldAttract) {
      setShakeNow(false);
      return;
    }
    const tick = () => {
      setShakeNow(true);
      setTimeout(() => setShakeNow(false), 1300);
    };
    tick();
    const id = setInterval(tick, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [shouldAttract]);

  const speechSupported = typeof window !== 'undefined' && (
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );

  if (!user || isPublicRoute || !helpbotEnabled) return null;

  const toggleRecording = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("La dictée vocale n'est pas disponible sur ce navigateur."); return; }
    if (isRecording) {
      try { recognitionRef.current?.stop(); } catch {}
      setIsRecording(false);
      return;
    }
    const rec = new SR();
    rec.lang = 'fr-FR';
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = '';
    rec.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setInput((finalText + interim).trim());
    };
    rec.onerror = () => { setIsRecording(false); };
    rec.onend = () => { setIsRecording(false); };
    recognitionRef.current = rec;
    setIsRecording(true);
    try { rec.start(); } catch { setIsRecording(false); }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: BotAttachmentInput[] = [];
    for (const file of Array.from(files).slice(0, 4 - attachments.length)) {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        toast.error(`Type non supporté : ${file.name}`); continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Fichier trop volumineux (max 5 Mo) : ${file.name}`); continue;
      }
      const data_base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(',')[1] || '');
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      next.push({ name: file.name, mime_type: file.type, data_base64 });
    }
    if (next.length) setAttachments(prev => [...prev, ...next]);
  };

  const printReport = (html: string) => {
    const w = window.open('', '_blank');
    if (!w) { toast.error('Ouverture bloquée par le navigateur'); return; }
    w.document.open(); w.document.write(html); w.document.close();
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || isLoading) return;
    const toSend = attachments;
    setInput('');
    setAttachments([]);
    await sendMessage(trimmed || 'Analyse les fichiers joints.', toSend);
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
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
          {fixyEvent && (
            <div
              key={fixyEvent.id}
              className="animate-mascot-bubble-in relative max-w-[200px] rounded-2xl bg-background border shadow-lg px-3 py-2 text-xs font-medium text-foreground"
            >
              {fixyEvent.bubble}
              <span className="absolute -bottom-1 right-5 w-2 h-2 bg-background border-r border-b rotate-45" />
            </div>
          )}
          <button
            onClick={() => setIsOpen(true)}
            className={`relative h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 hover:scale-105 transition-all flex items-center justify-center ${shakeNow ? 'animate-wiggle-attention' : ''}`}
            aria-label="Ouvrir l'assistant Fixy"
          >
            <FixyMascot
              size={36}
              waving={!fixyEvent}
              idle={!fixyEvent}
              reaction={fixyEvent?.reaction ?? null}
            />
            {canSeeOnboarding && pendingCount > 0 && !isFullyConfigured && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center border-2 border-background">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      )}

      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] sm:w-[380px] max-h-[calc(100vh-2rem)] sm:max-h-[560px] flex flex-col rounded-2xl border bg-background shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-primary rounded-t-2xl text-primary-foreground">
            <div className="flex items-center gap-2">
              <FixyMascot size={28} idle thinking={isLoading} />
              <span className="font-semibold text-sm">Fixy — Assistant Fixway</span>
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

          <div className="flex-1 min-h-0 max-h-[calc(100vh-12rem)] sm:max-h-[380px] overflow-y-auto helpbot-scrollbar">
            <div className="p-4 space-y-3">
              {canSeeOnboarding && (
                <OnboardingPanel
                  onAskHelp={(q) => sendMessage(q)}
                  defaultExpanded={!isFullyConfigured && messages.length === 0}
                />
              )}

              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Bonjour ! Je suis Fixy, votre technicien réparateur high-tech. Demandez-moi un diagnostic, un rapport, ou analyser une photo/PDF.
                  </p>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Essayez ces demandes avancées</p>
                    {ADVANCED_EXAMPLES.map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(ex)}
                        className="w-full text-left text-sm px-3 py-2 rounded-lg border bg-muted/50 hover:bg-muted transition-colors"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                  {faqItems.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Questions fréquentes</p>
                      {faqItems.slice(0, 3).map(faq => (
                        <button
                          key={faq.id}
                          onClick={() => handleFAQClick(faq)}
                          className="w-full text-left text-xs px-3 py-2 rounded-lg border bg-muted/30 hover:bg-muted transition-colors"
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

              {/* Escalation confirmation buttons */}
              {pendingEscalation && (
                <div className="bg-accent/60 border border-accent rounded-xl p-3 space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Souhaitez-vous créer un ticket de support pour cette demande ?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1 gap-1"
                      onClick={confirmEscalation}
                    >
                      <TicketCheck className="h-3.5 w-3.5" />
                      Oui, créer un ticket
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1"
                      onClick={dismissEscalation}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Non merci
                    </Button>
                  </div>
                </div>
              )}

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
              <div ref={bottomRef} />
            </div>
          </div>

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
