import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useShop } from '@/hooks/useShop';
import { useShopWebsite, DEFAULT_OPENING_HOURS, ShopWebsiteConfig } from '@/hooks/useShopWebsite';
import { BUYBACK_CATEGORIES } from '@/lib/buyback';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getPublicAppOrigin } from '@/utils/trackingUtils';
import { Globe, Copy, ExternalLink, Trash2, Loader2, Recycle, ImagePlus } from 'lucide-react';

export function ShopWebsiteTab() {
  const { shop } = useShop();
  const { config, photos, saveConfig, addPhoto, deletePhoto } = useShopWebsite();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState<Partial<ShopWebsiteConfig>>({
    enabled: false,
    tagline: '',
    about: '',
    opening_hours: DEFAULT_OPENING_HOURS,
    show_services: true,
    show_reviews: true,
    buyback_enabled: false,
    buyback_categories: [],
    buyback_auto_accept: false,
    buyback_intro: '',
  });

  useEffect(() => {
    if (config) {
      setForm({
        ...config,
        opening_hours: config.opening_hours?.length ? config.opening_hours : DEFAULT_OPENING_HOURS,
        buyback_categories: config.buyback_categories ?? [],
      });
    }
  }, [config]);

  const siteUrl = shop?.slug ? `${getPublicAppOrigin()}/${shop.slug}` : '';

  const toggleCategory = (id: string) => {
    const current = form.buyback_categories ?? [];
    setForm({
      ...form,
      buyback_categories: current.includes(id) ? current.filter((c) => c !== id) : [...current, id],
    });
  };

  const updateHour = (index: number, patch: Partial<{ open: string; close: string; closed: boolean }>) => {
    const hours = [...(form.opening_hours ?? DEFAULT_OPENING_HOURS)];
    hours[index] = { ...hours[index], ...patch };
    setForm({ ...form, opening_hours: hours });
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length || !shop?.id) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const path = `${shop.id}/website/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
        const { error } = await supabase.storage.from('shop-assets').upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from('shop-assets').getPublicUrl(path);
        await addPhoto.mutateAsync({ url: data.publicUrl });
      }
    } catch (e: any) {
      toast({ title: 'Envoi impossible', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />Votre site internet</CardTitle>
          <CardDescription>
            Une vraie page publique pour votre magasin, à imprimer sur vos cartes de visite.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Publier mon site internet</p>
              <p className="text-sm text-muted-foreground">Votre page est accessible à tous une fois activée.</p>
            </div>
            <Switch checked={!!form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
          </div>

          {siteUrl && (
            <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
              <code className="flex-1 truncate">{siteUrl}</code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { navigator.clipboard.writeText(siteUrl); toast({ title: 'Adresse copiée' }); }}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <a href={siteUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="tagline">Accroche</Label>
            <Input
              id="tagline"
              value={form.tagline ?? ''}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              placeholder="Réparation smartphones et tablettes en 48 h"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="about">Présentation</Label>
            <Textarea
              id="about"
              rows={5}
              value={form.about ?? ''}
              onChange={(e) => setForm({ ...form, about: e.target.value })}
              placeholder="Votre histoire, votre équipe, vos engagements…"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">Afficher mes prestations et tarifs</span>
              <Switch checked={!!form.show_services} onCheckedChange={(v) => setForm({ ...form, show_services: v })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">Afficher le lien d'avis clients</span>
              <Switch checked={!!form.show_reviews} onCheckedChange={(v) => setForm({ ...form, show_reviews: v })} />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Horaires d'ouverture</Label>
            <div className="space-y-2">
              {(form.opening_hours ?? DEFAULT_OPENING_HOURS).map((h, i) => (
                <div key={h.day} className="flex items-center gap-2">
                  <span className="w-24 text-sm">{h.day}</span>
                  <Input
                    type="time"
                    className="w-32"
                    value={h.open}
                    disabled={h.closed}
                    onChange={(e) => updateHour(i, { open: e.target.value })}
                  />
                  <Input
                    type="time"
                    className="w-32"
                    value={h.close}
                    disabled={h.closed}
                    onChange={(e) => updateHour(i, { close: e.target.value })}
                  />
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Switch checked={!!h.closed} onCheckedChange={(v) => updateHour(i, { closed: v })} />
                    Fermé
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Photos du magasin</Label>
            <div className="flex items-center gap-2">
              <Input type="file" accept="image/*" multiple onChange={(e) => handleUpload(e.target.files)} />
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4 text-muted-foreground" />}
            </div>
            {photos.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {photos.map((p) => (
                  <div key={p.id} className="relative group">
                    <img src={p.url} alt={p.caption ?? 'Photo du magasin'} loading="lazy" className="h-24 w-full object-cover rounded border" />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => deletePhoto.mutate(p.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Recycle className="h-5 w-5" />Rachat de matériel</CardTitle>
          <CardDescription>
            Recevez sur votre site les propositions de vente de matériel cassé ou défectueux.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Activer la page « Vendre mon matériel »</p>
              <p className="text-sm text-muted-foreground">
                {shop?.slug ? `${getPublicAppOrigin()}/${shop.slug}/vendre` : ''}
              </p>
            </div>
            <Switch checked={!!form.buyback_enabled} onCheckedChange={(v) => setForm({ ...form, buyback_enabled: v })} />
          </div>

          <div className="space-y-2">
            <Label>Catégories acceptées</Label>
            <div className="flex flex-wrap gap-2">
              {BUYBACK_CATEGORIES.map((c) => {
                const active = (form.buyback_categories ?? []).includes(c.id);
                return (
                  <Badge
                    key={c.id}
                    variant={active ? 'default' : 'outline'}
                    className="cursor-pointer select-none py-1.5 px-3"
                    onClick={() => toggleCategory(c.id)}
                  >
                    {c.emoji} {c.label}
                  </Badge>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Ces catégories déterminent aussi les cotations du réseau qui vous seront proposées.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="buyback_intro">Message d'accueil de la page de rachat</Label>
            <Textarea
              id="buyback_intro"
              rows={3}
              value={form.buyback_intro ?? ''}
              onChange={(e) => setForm({ ...form, buyback_intro: e.target.value })}
              placeholder="Nous rachetons votre appareil même cassé : décrivez-le et recevez une offre sous 48 h."
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Cotation automatique assistée par l'IA</p>
              <p className="text-xs text-muted-foreground">
                Pré-remplit l'offre avec une fourchette basse / moyenne / haute. Vous restez libre du montant final.
              </p>
            </div>
            <Switch
              checked={!!form.buyback_auto_accept}
              onCheckedChange={(v) => setForm({ ...form, buyback_auto_accept: v })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveConfig.mutate(form)} disabled={saveConfig.isPending}>
          {saveConfig.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

export default ShopWebsiteTab;
