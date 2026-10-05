import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, Send, Loader2, CheckCircle2, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LegalLayout } from '@/components/legal/LegalLayout';
import { LEGAL } from '@/lib/legalInfo';

const empty = { name: '', email: '', company: '', subject: '', message: '', website: '' };

function Contact() {
  const { toast } = useToast();
  const [form, setForm] = useState(empty);
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      toast({ title: 'Merci de cocher la case de consentement', variant: 'destructive' });
      return;
    }
    if (form.message.trim().length < 5) {
      toast({ title: 'Votre message est trop court', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('contact-form', { body: { ...form, consent: true } });
      if (error || !data?.success) throw error || new Error('send failed');
      setSent(true);
      setForm(empty);
      setConsent(false);
    } catch {
      toast({
        title: "Le message n'a pas pu être envoyé",
        description: `Réessayez dans un instant ou écrivez-nous directement à ${LEGAL.email}.`,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <LegalLayout title="Contactez Fixway" description="Une question sur Fixway, le logiciel SAV des réparateurs ? Écrivez-nous, nous répondons par e-mail.">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Envoyer un message</CardTitle>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4 py-6 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
                <p className="font-medium">Message envoyé, merci !</p>
                <p className="text-sm text-muted-foreground">Nous vous répondons par e-mail dans les meilleurs délais.</p>
                <Button variant="outline" onClick={() => setSent(false)}>Envoyer un autre message</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Nom *</Label>
                    <Input id="name" value={form.name} onChange={set('name')} maxLength={100} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input id="email" type="email" value={form.email} onChange={set('email')} maxLength={255} required />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="company">Société</Label>
                    <Input id="company" value={form.company} onChange={set('company')} maxLength={150} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="subject">Sujet *</Label>
                    <Input id="subject" value={form.subject} onChange={set('subject')} maxLength={150} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea id="message" value={form.message} onChange={set('message')} rows={6} maxLength={3000} required />
                </div>
                {/* Piège anti-robot : invisible pour les humains */}
                <input
                  type="text"
                  name="website"
                  value={form.website}
                  onChange={set('website')}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="hidden"
                />
                <label className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                  <span>
                    J'accepte que mes données soient utilisées pour répondre à ma demande (
                    <Link to="/confidentialite" className="text-primary underline">politique de confidentialité</Link>).
                  </span>
                </label>
                <Button type="submit" className="w-full" disabled={sending}>
                  {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Envoyer
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="flex items-start gap-3 p-5">
              <Mail className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">E-mail</p>
                <a href={`mailto:${LEGAL.email}`} className="text-sm text-primary underline break-all">{LEGAL.email}</a>
                <p className="text-xs text-muted-foreground mt-1">Nous répondons uniquement par e-mail.</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 p-5">
              <Building2 className="mt-0.5 h-5 w-5 text-primary" />
              <div className="text-sm">
                <p className="font-medium">{LEGAL.brand} est un service de {LEGAL.company}</p>
                <p className="text-muted-foreground">{LEGAL.address}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </LegalLayout>
  );
}

export default Contact;
