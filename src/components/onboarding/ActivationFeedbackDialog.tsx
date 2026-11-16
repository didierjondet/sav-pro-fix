import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useShop } from '@/hooks/useShop';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { SIGNUP_QUESTIONS, BLOCKER_REASONS, pickActivationPrompt } from '@/lib/activationFeedback';

const SNOOZE_KEY = 'fixway_activation_feedback_snooze';

function Choice({ options, value, onChange }: { options: readonly { value: string; label: string }[]; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Button key={o.value} type="button" size="sm" variant={value === o.value ? 'default' : 'outline'} onClick={() => onChange(o.value)}>
          {o.label}
        </Button>
      ))}
    </div>
  );
}

export default function ActivationFeedbackDialog() {
  const { shop } = useShop();
  const { user } = useAuth();
  const { profile } = useProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { data } = useQuery({
    queryKey: ['activation-feedback', user?.id, shop?.id],
    enabled: !!user && !!shop?.id && profile?.role !== 'super_admin',
    queryFn: async () => {
      const [fb, sav] = await Promise.all([
        supabase.from('onboarding_feedback' as any).select('kind').eq('user_id', user!.id),
        supabase.from('sav_cases').select('id', { count: 'exact', head: true }).eq('shop_id', shop!.id),
      ]);
      return { kinds: ((fb.data ?? []) as any[]).map((r) => r.kind as string), savCount: sav.count ?? 0 };
    },
  });

  const snoozed = typeof window !== 'undefined' && localStorage.getItem(SNOOZE_KEY) === new Date().toDateString();
  const prompt = data && shop && (shop as any).inactivity_policy_acknowledged_at && !snoozed && !dismissed
    ? pickActivationPrompt({ shopCreatedAt: (shop as any).created_at, savCount: data.savCount, answeredKinds: data.kinds })
    : null;

  useEffect(() => { setAnswers({}); setComment(''); }, [prompt]);

  const close = () => { localStorage.setItem(SNOOZE_KEY, new Date().toDateString()); setDismissed(true); };

  const submit = async () => {
    if (!prompt || !user || !shop) return;
    setSaving(true);
    const { error } = await supabase.from('onboarding_feedback' as any).insert({
      kind: prompt, shop_id: shop.id, user_id: user.id, answers, comment: comment.trim().slice(0, 1000) || null,
    });
    setSaving(false);
    if (error) return;
    window.__lovableEvents?.track?.('project.onboarding_feedback_submitted', { kind: prompt, reason: answers.reason ?? '' });
    setDismissed(true);
    qc.invalidateQueries({ queryKey: ['activation-feedback'] });
    if (prompt === 'blocker') navigate('/sav/new');
  };

  if (!prompt) return null;
  const isSignup = prompt === 'signup';
  const canSubmit = isSignup ? SIGNUP_QUESTIONS.every((q) => answers[q.key]) : !!answers.reason;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isSignup ? 'Bienvenue ! 3 questions rapides' : 'Qu’est-ce qui vous bloque ?'}</DialogTitle>
          <DialogDescription>
            {isSignup
              ? 'Vos réponses nous aident à adapter Fixway à votre atelier (10 secondes).'
              : 'Vous n’avez pas encore créé de SAV. Dites-nous pourquoi en un clic, nous améliorerons le logiciel.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {isSignup ? SIGNUP_QUESTIONS.map((q) => (
            <div key={q.key} className="space-y-2">
              <Label>{q.label}</Label>
              <Choice options={q.options} value={answers[q.key]} onChange={(v) => setAnswers((a) => ({ ...a, [q.key]: v }))} />
            </div>
          )) : (
            <Choice options={BLOCKER_REASONS} value={answers.reason} onChange={(v) => setAnswers({ reason: v })} />
          )}
          <div className="space-y-2">
            <Label>Un commentaire ? (facultatif)</Label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={2} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={close}>Plus tard</Button>
          <Button onClick={submit} disabled={!canSubmit || saving}>
            {isSignup ? 'Envoyer' : 'Envoyer et créer mon 1er SAV'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
