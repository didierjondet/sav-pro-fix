import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Copy, Globe, Info, Plus, ShieldCheck, Eye, EyeOff, Save, ExternalLink,
  Store, Users, Download, X,
} from 'lucide-react';
import { usePartnerProfile } from '@/hooks/usePartnerProfile';
import { PARTNER_SPECIALTIES, resolveSpecialtyTags } from '@/lib/partnerSpecialties';
import { useShop } from '@/hooks/useShop';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

/**
 * Section « Visibilité & annuaire » de la configuration du site internet :
 * code partenaire, choix des annuaires, identité publique, spécialités,
 * certifications et réglages de TVA.
 */
export function WebsiteDirectorySection() {
  const { partnerProfile, isLoading, saveProfile } = usePartnerProfile();
  const { shop, refetch: refetchShop } = useShop();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    public_name: '',
    logo_url: '',
    city: '',
    postal_code: '',
    coverage_area: '',
    public_phone: '',
    public_email: '',
    website_url: '',
    description: '',
    specialties: '',
    certifications: '',
    warranty_terms: '',
    shipping_modes: '',
    avg_delay_days: undefined as number | undefined,
    return_policy: '',
    failure_policy: '',
    prices_include_vat: true,
    vat_rate: 20,
    vat_exempt: false,
    visible_public: false,
    visible_pro: false,
  });
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');

  useEffect(() => {
    if (partnerProfile) {
      setForm({
        public_name: partnerProfile.public_name || '',
        logo_url: partnerProfile.logo_url || '',
        city: partnerProfile.city || '',
        postal_code: partnerProfile.postal_code || '',
        coverage_area: partnerProfile.coverage_area || '',
        public_phone: partnerProfile.public_phone || '',
        public_email: partnerProfile.public_email || '',
        website_url: partnerProfile.website_url || '',
        description: partnerProfile.description || '',
        specialties: partnerProfile.specialties || '',
        certifications: partnerProfile.certifications || '',
        warranty_terms: partnerProfile.warranty_terms || '',
        shipping_modes: partnerProfile.shipping_modes || '',
        avg_delay_days: partnerProfile.avg_delay_days ?? undefined,
        return_policy: partnerProfile.return_policy || '',
        failure_policy: partnerProfile.failure_policy || '',
        prices_include_vat: partnerProfile.prices_include_vat,
        vat_rate: Number(partnerProfile.vat_rate ?? 20),
        vat_exempt: partnerProfile.vat_exempt,
        visible_public: (partnerProfile as any).visible_public ?? false,
        visible_pro: (partnerProfile as any).visible_pro ?? false,
      });
      setTags(resolveSpecialtyTags((partnerProfile as any).specialty_tags, partnerProfile.specialties));
    } else if (shop?.name) {
      setForm((f) => ({ ...f, public_name: f.public_name || shop.name }));
    }
  }, [partnerProfile, shop?.name]);

  const partnerCode = (shop as any)?.partner_code as string | undefined;
  const optIn = !!(shop as any)?.partner_directory_opt_in;

  const missingFields = [
    !form.public_name.trim() && 'nom public',
    !form.city.trim() && 'ville',
    !form.postal_code.trim() && 'code postal',
  ].filter(Boolean) as string[];
  const wantsVisibility = form.visible_public || form.visible_pro;

  const prefillFromShop = () => {
    if (!shop) return;
    const address = ((shop as any).address || '') as string;
    const match = address.match(/(\d{5})\s+([^\n,]+)/);
    setForm((f) => ({
      ...f,
      public_name: (shop as any).name || f.public_name,
      logo_url: (shop as any).logo_url || f.logo_url,
      public_phone: (shop as any).phone || f.public_phone,
      public_email: (shop as any).email || f.public_email,
      postal_code: match?.[1] ?? f.postal_code,
      city: match?.[2]?.trim() ?? f.city,
      description: f.description || (shop as any).website_description || '',
    }));
    toast({
      title: 'Informations du magasin reprises',
      description: 'Vérifiez puis enregistrez cette section.',
    });
  };

  const copyCode = () => {
    if (!partnerCode) return;
    navigator.clipboard.writeText(partnerCode);
    toast({ title: 'Code partenaire copié' });
  };

  const toggleOptIn = async (checked: boolean) => {
    if (!shop?.id) return;
    const { error } = await supabase
      .from('shops')
      .update({ partner_directory_opt_in: checked } as any)
      .eq('id', shop.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: checked ? 'Vous apparaissez dans l’annuaire' : 'Vous n’apparaissez plus dans l’annuaire',
    });
    refetchShop();
  };

  const submit = async () => {
    if (!form.public_name.trim()) return;
    setSaving(true);
    try {
      await saveProfile({
        public_name: form.public_name.trim(),
        logo_url: form.logo_url || null,
        city: form.city.trim() || null,
        postal_code: form.postal_code.trim() || null,
        coverage_area: form.coverage_area || null,
        public_phone: form.public_phone || null,
        public_email: form.public_email || null,
        website_url: form.website_url || null,
        description: form.description || null,
        certifications: form.certifications || null,
        warranty_terms: form.warranty_terms || null,
        shipping_modes: form.shipping_modes || null,
        avg_delay_days: form.avg_delay_days ?? null,
        return_policy: form.return_policy || null,
        failure_policy: form.failure_policy || null,
        prices_include_vat: form.prices_include_vat,
        vat_rate: form.vat_rate,
        vat_exempt: form.vat_exempt,
        is_published: form.visible_public || form.visible_pro,
        visible_public: form.visible_public,
        visible_pro: form.visible_pro,
        specialty_tags: tags,
        specialties: tags.length > 0 ? tags.join(', ') : (form.specialties || null),
      } as any);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Visibilité et annuaire</CardTitle></CardHeader>
        <CardContent><div className="text-center py-4">Chargement…</div></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Code partenaire */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Mon code partenaire Fixway
          </CardTitle>
          <CardDescription>
            Communiquez ce code aux magasins qui vous confient des dossiers : en le saisissant dans leur fiche
            prestataire, leurs SAV apparaîtront automatiquement dans votre espace « SAV partenaires ».
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input readOnly value={partnerCode || '—'} className="font-mono text-lg max-w-xs" />
            <Button variant="outline" onClick={copyCode} disabled={!partnerCode}>
              <Copy className="h-4 w-4 mr-2" /> Copier
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Globe className="h-4 w-4" /> Apparaître dans l’annuaire Fixway
              </Label>
              <p className="text-xs text-muted-foreground">
                Interrupteur général : sans lui, vous n’apparaissez dans aucun annuaire
              </p>
            </div>
            <Switch checked={optIn} onCheckedChange={toggleOptIn} />
          </div>
        </CardContent>
      </Card>

      {/* Visibilité */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" /> Où souhaitez-vous apparaître ?
          </CardTitle>
          <CardDescription>
            Choisissez le ou les rôles sous lesquels vous voulez être trouvé. Les deux peuvent être activés.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" /> Magasin visible par les particuliers
              </Label>
              <p className="text-xs text-muted-foreground">
                Votre site et vos tarifs publics apparaissent dans l’annuaire grand public fixway.fr/partenaires
              </p>
            </div>
            <Switch checked={form.visible_public}
              onCheckedChange={(v) => setForm({ ...form, visible_public: v })} />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Prestataire visible par les magasins Fixway
              </Label>
              <p className="text-xs text-muted-foreground">
                Vous apparaissez dans l’annuaire professionnel avec vos tarifs pro et pouvez recevoir des SAV délégués
              </p>
            </div>
            <Switch checked={form.visible_pro}
              onCheckedChange={(v) => setForm({ ...form, visible_pro: v })} />
          </div>

          {!wantsVisibility ? (
            <div className="flex items-start gap-2 p-3 rounded-lg border bg-muted/40 text-xs text-muted-foreground">
              <EyeOff className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Aucun rôle sélectionné : vous n’apparaissez dans aucun annuaire.</span>
            </div>
          ) : !optIn ? (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-orange-300 bg-orange-50 dark:bg-orange-950/30 text-xs text-orange-800 dark:text-orange-300">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>L’interrupteur général « Apparaître dans l’annuaire Fixway » est désactivé.</span>
            </div>
          ) : missingFields.length > 0 ? (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-orange-300 bg-orange-50 dark:bg-orange-950/30 text-xs text-orange-800 dark:text-orange-300">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Pour être trouvé dans l’annuaire, complétez : {missingFields.join(', ')}. Sans ville ni code postal,
                une recherche par commune ne remontera pas votre magasin.
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-green-300 bg-green-50 dark:bg-green-950/30 text-xs text-green-800 dark:text-green-300">
              <Eye className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Vous êtes visible {form.visible_public && 'dans l’annuaire grand public'}
                {form.visible_public && form.visible_pro && ' et '}
                {form.visible_pro && 'dans l’annuaire professionnel'}.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Identité publique */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Informations publiques
            {partnerProfile?.slug && optIn && form.visible_public && (
              <Button variant="outline" size="sm" asChild>
                <a href={`/partenaires/${partnerProfile.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" /> Voir ma fiche annuaire
                </a>
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            Ces informations alimentent votre site internet et votre fiche dans les annuaires Fixway.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-3 p-3 border rounded-lg bg-muted/40">
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Info className="h-4 w-4 shrink-0" />
              Récupérez en un clic les coordonnées déjà saisies dans l’onglet « Magasin ».
            </p>
            <Button type="button" variant="outline" size="sm" onClick={prefillFromShop}>
              <Download className="h-4 w-4 mr-2" /> Reprendre les infos du magasin
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pp_name">Nom public</Label>
              <Input id="pp_name" value={form.public_name}
                onChange={(e) => setForm({ ...form, public_name: e.target.value })}
                placeholder="ex: Atelier Micro-Soudure Pro" />
            </div>
            <div>
              <Label htmlFor="pp_logo">Logo (URL)</Label>
              <Input id="pp_logo" value={form.logo_url}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                placeholder="https://…" />
            </div>
            <div>
              <Label htmlFor="pp_cp">Code postal</Label>
              <Input id="pp_cp" value={form.postal_code}
                onChange={(e) => setForm({ ...form, postal_code: e.target.value })} placeholder="75011" />
            </div>
            <div>
              <Label htmlFor="pp_city">Ville</Label>
              <Input id="pp_city" value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Paris" />
            </div>
            <div>
              <Label htmlFor="pp_area">Zone d’intervention</Label>
              <Input id="pp_area" value={form.coverage_area}
                onChange={(e) => setForm({ ...form, coverage_area: e.target.value })}
                placeholder="ex: France entière (envoi colis)" />
            </div>
            <div>
              <Label htmlFor="pp_delay">Délai moyen (jours)</Label>
              <NumberInput id="pp_delay" min="0" max="365" value={form.avg_delay_days ?? ''}
                onChange={(e) => setForm({
                  ...form,
                  avg_delay_days: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                })} placeholder="5" />
            </div>
            <div>
              <Label htmlFor="pp_phone">Téléphone public</Label>
              <Input id="pp_phone" value={form.public_phone}
                onChange={(e) => setForm({ ...form, public_phone: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="pp_email">Email public</Label>
              <Input id="pp_email" type="email" value={form.public_email}
                onChange={(e) => setForm({ ...form, public_email: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="pp_site">Autre site web (facultatif)</Label>
              <Input id="pp_site" value={form.website_url}
                onChange={(e) => setForm({ ...form, website_url: e.target.value })} placeholder="https://…" />
            </div>
          </div>

          <div>
            <Label htmlFor="pp_desc">Présentation</Label>
            <Textarea id="pp_desc" rows={4} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Votre activité, votre expérience, vos équipements…" />
          </div>

          <div className="space-y-2">
            <Label>Spécialités</Label>
            <p className="text-xs text-muted-foreground">
              Sélectionnez vos domaines d’expertise : ils servent de filtres dans les annuaires.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {PARTNER_SPECIALTIES.map((sp) => {
                const active = tags.includes(sp);
                return (
                  <Badge
                    key={sp}
                    variant={active ? 'default' : 'outline'}
                    className="cursor-pointer select-none"
                    onClick={() => setTags(active ? tags.filter((t) => t !== sp) : [...tags, sp])}
                  >
                    {sp}
                  </Badge>
                );
              })}
              {tags.filter((t) => !PARTNER_SPECIALTIES.includes(t)).map((t) => (
                <Badge key={t} variant="secondary" className="cursor-pointer select-none"
                  onClick={() => setTags(tags.filter((x) => x !== t))}>
                  {t} <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 pt-1 max-w-md">
              <Input value={customTag} onChange={(e) => setCustomTag(e.target.value)}
                placeholder="Ajouter une spécialité personnalisée" />
              <Button type="button" variant="outline"
                onClick={() => {
                  const v = customTag.trim();
                  if (v && !tags.includes(v)) setTags([...tags, v]);
                  setCustomTag('');
                }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pp_cert">Certifications</Label>
              <Input id="pp_cert" value={form.certifications}
                onChange={(e) => setForm({ ...form, certifications: e.target.value })}
                placeholder="ex: QualiRépar, IPC-7711" />
            </div>
            <div>
              <Label htmlFor="pp_ship">Modes d’envoi</Label>
              <Input id="pp_ship" value={form.shipping_modes}
                onChange={(e) => setForm({ ...form, shipping_modes: e.target.value })}
                placeholder="Dépôt, colis suivi, coursier" />
            </div>
            <div>
              <Label htmlFor="pp_war">Garanties</Label>
              <Input id="pp_war" value={form.warranty_terms}
                onChange={(e) => setForm({ ...form, warranty_terms: e.target.value })}
                placeholder="ex: 6 mois pièces et main d’œuvre" />
            </div>
            <div>
              <Label htmlFor="pp_ret">Conditions de retour</Label>
              <Input id="pp_ret" value={form.return_policy}
                onChange={(e) => setForm({ ...form, return_policy: e.target.value })}
                placeholder="ex: retour sous 48h après réparation" />
            </div>
            <div>
              <Label htmlFor="pp_fail">Politique en cas d’échec</Label>
              <Input id="pp_fail" value={form.failure_policy}
                onChange={(e) => setForm({ ...form, failure_policy: e.target.value })}
                placeholder="ex: pas de réparation, pas de frais" />
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h4 className="text-sm font-medium">TVA appliquée aux prix affichés</h4>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-normal">Entreprise non assujettie à la TVA</Label>
                <p className="text-xs text-muted-foreground">
                  Les prix seront affichés sans TVA avec la mention légale
                </p>
              </div>
              <Switch checked={form.vat_exempt}
                onCheckedChange={(v) => setForm({ ...form, vat_exempt: v })} />
            </div>

            {!form.vat_exempt && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-normal">Prix saisis TTC</Label>
                    <p className="text-xs text-muted-foreground">Sinon les prix saisis sont considérés HT</p>
                  </div>
                  <Switch checked={form.prices_include_vat}
                    onCheckedChange={(v) => setForm({ ...form, prices_include_vat: v })} />
                </div>
                <div>
                  <Label htmlFor="pp_vat">Taux de TVA (%)</Label>
                  <NumberInput id="pp_vat" min="0" max="30" value={form.vat_rate}
                    onChange={(e) => setForm({ ...form, vat_rate: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={submit} disabled={saving || !form.public_name.trim()}>
              <Save className="h-4 w-4 mr-2" /> Enregistrer ces informations
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default WebsiteDirectorySection;
