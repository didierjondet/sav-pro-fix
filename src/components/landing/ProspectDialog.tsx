import { useState } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Loader2 } from 'lucide-react';

interface ProspectDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const prospectSchema = z.object({
  first_name: z.string().trim().min(1, 'Prénom requis').max(100),
  last_name: z.string().trim().min(1, 'Nom requis').max(100),
  company_name: z.string().trim().min(1, 'Nom de l\'entreprise requis').max(150),
  email: z.string().trim().email('Email invalide').max(255),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  free_message: z.string().trim().max(1000).optional().or(z.literal('')),
});

export function ProspectDialog({ isOpen, onClose }: ProspectDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    company_name: '',
    email: '',
    phone: '',
    free_message: '',
    interested_in_beta: false,
    interested_in_recontact: true,
    interested_in_demo: false,
  });

  const reset = () => {
    setForm({
      first_name: '',
      last_name: '',
      company_name: '',
      email: '',
      phone: '',
      free_message: '',
      interested_in_beta: false,
      interested_in_recontact: true,
      interested_in_demo: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = prospectSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    if (!form.interested_in_beta && !form.interested_in_recontact && !form.interested_in_demo && !form.free_message.trim()) {
      toast.error('Cochez au moins une option ou laissez-nous un message');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('prospects').insert({
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
        company_name: parsed.data.company_name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        free_message: parsed.data.free_message || null,
        interested_in_beta: form.interested_in_beta,
        interested_in_recontact: form.interested_in_recontact,
        interested_in_demo: form.interested_in_demo,
      });

      if (error) throw error;

      toast.success('Demande envoyée ! Nous vous recontacterons rapidement.');
      reset();
      onClose();
    } catch (err: any) {
      console.error('Error submitting prospect:', err);
      toast.error('Erreur lors de l\'envoi. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">Inscriptions temporairement closes</DialogTitle>
          </div>
          <DialogDescription className="text-sm leading-relaxed">
            FixwayPro est actuellement en programme bêta fermé. Laissez-nous vos coordonnées et
            nous vous recontacterons dès la sortie commerciale, ou pour organiser une démo personnalisée.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prospect-first-name">Prénom *</Label>
              <Input
                id="prospect-first-name"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prospect-last-name">Nom *</Label>
              <Input
                id="prospect-last-name"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                required
                maxLength={100}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prospect-company">Entreprise *</Label>
            <Input
              id="prospect-company"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              required
              maxLength={150}
              placeholder="Nom de votre boutique / entreprise"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prospect-email">Email *</Label>
              <Input
                id="prospect-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                maxLength={255}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prospect-phone">Téléphone</Label>
              <Input
                id="prospect-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                maxLength={30}
              />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
            <Label className="text-sm font-semibold">Vos intérêts</Label>
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  checked={form.interested_in_beta}
                  onCheckedChange={(c) => setForm({ ...form, interested_in_beta: !!c })}
                  className="mt-0.5"
                />
                <span className="text-sm">Devenir <strong>beta testeur</strong> du programme</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  checked={form.interested_in_recontact}
                  onCheckedChange={(c) => setForm({ ...form, interested_in_recontact: !!c })}
                  className="mt-0.5"
                />
                <span className="text-sm">Être <strong>recontacté</strong> à la sortie commerciale</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  checked={form.interested_in_demo}
                  onCheckedChange={(c) => setForm({ ...form, interested_in_demo: !!c })}
                  className="mt-0.5"
                />
                <span className="text-sm">Demander une <strong>démonstration</strong></span>
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prospect-message">Message ou besoin spécifique</Label>
            <Textarea
              id="prospect-message"
              value={form.free_message}
              onChange={(e) => setForm({ ...form, free_message: e.target.value })}
              maxLength={1000}
              rows={3}
              placeholder="Parlez-nous de votre activité, vos besoins…"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Envoyer ma demande
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
