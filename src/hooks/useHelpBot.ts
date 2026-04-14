import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from './useShop';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface FAQItem {
  id: string;
  question: string;
  click_count: number;
  category: string;
}

export interface PendingEscalation {
  summary: string;
  userMessage: string;
}

export function useHelpBot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [pendingEscalation, setPendingEscalation] = useState<PendingEscalation | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const { shop } = useShop();
  const { profile } = useProfile();

  // Persist conversation to database
  const persistConversation = useCallback(async (msgs: ChatMessage[], escalated = false, escalationSummary?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !shop?.id) return;

      const userName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : null;
      const messagesJson = msgs.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp.toISOString() }));

      if (conversationId) {
        await supabase
          .from('help_bot_conversations')
          .update({
            messages: messagesJson as any,
            escalated,
            escalation_summary: escalationSummary || null,
          })
          .eq('id', conversationId);
      } else {
        const { data } = await supabase
          .from('help_bot_conversations')
          .insert({
            shop_id: shop.id,
            user_id: session.user.id,
            user_name: userName,
            messages: messagesJson as any,
            escalated,
            escalation_summary: escalationSummary || null,
          })
          .select('id')
          .single();
        if (data) setConversationId(data.id);
      }
    } catch (e) {
      console.error('Error persisting bot conversation:', e);
    }
  }, [conversationId, shop?.id, profile]);

  // Load FAQ items with session guard
  useEffect(() => {
    const loadFAQ = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data, error } = await supabase
          .from('help_bot_faq')
          .select('*')
          .order('click_count', { ascending: false });

        if (!error && data) {
          setFaqItems(data as FAQItem[]);
        }
      } catch (e) {
        console.error('FAQ load error:', e);
      }
    };
    loadFAQ();
  }, []);

  const getUserContext = useCallback(() => {
    const profileComplete = !!(profile?.first_name && profile?.last_name && profile?.phone);
    const shopComplete = !!(shop?.name && shop?.name !== 'Mon Magasin' && shop?.email);

    return {
      profileComplete,
      shopComplete,
      role: profile?.role || 'unknown',
      shopName: shop?.name || '',
    };
  }, [profile, shop]);

  const incrementFAQClick = useCallback(async (faqId: string) => {
    const item = faqItems.find(f => f.id === faqId);
    if (item) {
      await supabase
        .from('help_bot_faq')
        .update({ click_count: item.click_count + 1 })
        .eq('id', faqId);
      
      setFaqItems(prev => 
        prev.map(f => f.id === faqId ? { ...f, click_count: f.click_count + 1 } : f)
          .sort((a, b) => b.click_count - a.click_count)
      );
    }
  }, [faqItems]);

  const confirmEscalation = useCallback(async () => {
    if (!pendingEscalation) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      const shopId = shop?.id;
      
      if (shopId && userId) {
        await supabase.from('support_tickets' as any).insert({
          shop_id: shopId,
          created_by: userId,
          subject: `[Bot IA] ${pendingEscalation.userMessage.substring(0, 80)}`,
          description: `Demande transmise par l'assistant IA.\n\nQuestion :\n${pendingEscalation.userMessage}\n\nRésumé :\n${pendingEscalation.summary}`,
          priority: 'medium',
          status: 'open',
        });
        
        const ticketMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '✅ Un ticket de support a été créé. Notre équipe vous répondra rapidement.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, ticketMsg]);
        toast.success('Ticket de support créé avec succès.');
        // Mark conversation as escalated
        persistConversation(messages, true, pendingEscalation.summary);
      } else {
        toast.error('Impossible de créer le ticket. Vérifiez votre connexion.');
      }
    } catch (e) {
      console.error('Error creating support ticket:', e);
      toast.error('Erreur lors de la création du ticket.');
    } finally {
      setPendingEscalation(null);
    }
  }, [pendingEscalation, shop]);

  const dismissEscalation = useCallback(() => {
    setPendingEscalation(null);
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'D\'accord, pas de ticket créé. N\'hésitez pas à me poser d\'autres questions !',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, msg]);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      
      const { data, error } = await supabase.functions.invoke('help-bot', {
        body: {
          message: content,
          history,
          userContext: getUserContext(),
          shopId: shop?.id,
        },
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message || "Désolé, je n'ai pas pu traiter votre demande.",
        timestamp: new Date(),
      };

      const updatedMsgs = [...messages, userMessage, assistantMessage];
      setMessages(prev => [...prev, assistantMessage]);

      // Persist after each exchange
      persistConversation(updatedMsgs, false);

      // Handle escalation - propose instead of auto-creating
      if (data.escalate) {
        setPendingEscalation({
          summary: data.escalate_summary || 'Hors périmètre du logiciel',
          userMessage: content,
        });
      }
    } catch (error) {
      console.error('Help bot error:', error);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Désolé, je rencontre un problème technique. Réessayez dans quelques instants.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, getUserContext]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setPendingEscalation(null);
    setConversationId(null);
  }, []);

  return {
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
  };
}
