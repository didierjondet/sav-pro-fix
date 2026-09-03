import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, Clock, Star, Euro, Recycle, ExternalLink } from 'lucide-react';
import { BUYBACK_CATEGORIES } from '@/lib/buyback';
import { formatPartnerPrice } from '@/lib/partnerPricing';

interface WebsiteData {
  shop: {
    id: string;
    name: string;
    slug: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    logo_url: string | null;
    title: string | null;
    description: string | null;
    review_link: string | null;
  };
  config: {
    tagline: string | null;
    about: string | null;
    hero_image_url: string | null;
    opening_hours: { day: string; open: string; close: string; closed?: boolean }[];
    social_links: Record<string, string>;
    show_services: boolean;
    show_reviews: boolean;
    buyback_enabled: boolean;
    buyback_categories: string[];
    buyback_intro: string | null;
  };
  photos: { url: string; caption: string | null }[];
  services: {
    name: string;
    description: string | null;
    price: number | null;
    category: string | null;
    kind?: string | null;
    delay_days?: number | null;
  }[];
  partner: {
    specialties?: string | null;
    specialty_tags?: string[] | null;
    certifications?: string | null;
    warranty_terms?: string | null;
    avg_delay_days?: number | null;
    city?: string | null;
    postal_code?: string | null;
    prices_include_vat?: boolean;
    vat_rate?: number;
    vat_exempt?: boolean;
  };
}

export default function ShopWebsite() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['shop-website', slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_shop_website' as any, { p_slug: slug });
      if (error) throw error;
      return (data ?? null) as unknown as WebsiteData | null;
    },
    enabled: !!slug,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!data || (data as any).status !== 'ok') {
    const disabled = (data as any)?.status === 'disabled';
    const partnerSlug = (data as any)?.partner_slug as string | null | undefined;
    const shopName = (data as any)?.shop_name as string | undefined;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-10 text-center space-y-3">
            <h1 className="text-xl font-semibold">
              {disabled ? 'Site pas encore activé' : 'Site introuvable'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {disabled
                ? `${shopName ?? 'Ce magasin'} n'a pas encore activé son site internet.`
                : "Cette adresse ne correspond à aucun professionnel Fixway."}
            </p>
            {disabled && partnerSlug ? (
              <Button asChild variant="outline">
                <Link to={`/partenaires/${partnerSlug}`}>Voir sa fiche dans l'annuaire</Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link to="/partenaires">Voir l'annuaire des réparateurs</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }


  const { shop, config, photos, services, partner } = data;
  const title = shop.title || `${shop.name} — Réparation et service après-vente`;
  const description =
    shop.description ||
    config.tagline ||
    `${shop.name}, réparateur${partner?.city ? ` à ${partner.city}` : ''} : diagnostic, réparation et rachat de matériel.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: shop.name,
    image: shop.logo_url || undefined,
    telephone: shop.phone || undefined,
    email: shop.email || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: shop.address || undefined,
      addressLocality: partner?.city || undefined,
      postalCode: partner?.postal_code || undefined,
      addressCountry: 'FR',
    },
  };

  const tags = partner?.specialty_tags ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title.slice(0, 60)}</title>
        <meta name="description" content={description.slice(0, 158)} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* En-tête */}
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col md:flex-row md:items-center gap-6">
          {shop.logo_url && (
            <img
              src={shop.logo_url}
              alt={`Logo de ${shop.name}`}
              loading="lazy"
              className="h-20 w-20 rounded-xl object-contain bg-muted p-2"
            />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold">{shop.name}</h1>
            {config.tagline && <p className="text-muted-foreground mt-1">{config.tagline}</p>}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary">{t}</Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {shop.phone && (
              <Button asChild>
                <a href={`tel:${shop.phone}`}><Phone className="h-4 w-4 mr-2" />Appeler</a>
              </Button>
            )}
            {shop.address && (
              <Button asChild variant="outline">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MapPin className="h-4 w-4 mr-2" />Itinéraire
                </a>
              </Button>
            )}
            {config.buyback_enabled && (
              <Button asChild variant="secondary">
                <Link to={`/${shop.slug}/vendre`}>
                  <Recycle className="h-4 w-4 mr-2" />Vendre mon matériel
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Présentation */}
        {(config.about || partner?.specialties || partner?.certifications) && (
          <section>
            <Card>
              <CardHeader><CardTitle>À propos</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {config.about && <p className="whitespace-pre-line">{config.about}</p>}
                {partner?.specialties && (
                  <p><span className="font-medium">Spécialités : </span>{partner.specialties}</p>
                )}
                {partner?.certifications && (
                  <p><span className="font-medium">Certifications : </span>{partner.certifications}</p>
                )}
                {partner?.warranty_terms && (
                  <p><span className="font-medium">Garantie : </span>{partner.warranty_terms}</p>
                )}
                {partner?.avg_delay_days != null && (
                  <p><span className="font-medium">Délai moyen : </span>{partner.avg_delay_days} jours</p>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Galerie */}
        {photos.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">En images</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {photos.map((p, i) => (
                <figure key={i} className="overflow-hidden rounded-lg border bg-muted">
                  <img
                    src={p.url}
                    alt={p.caption || `${shop.name} — photo ${i + 1}`}
                    loading="lazy"
                    className="h-36 w-full object-cover"
                  />
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* Services */}
        {config.show_services && services.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Nos tarifs et prestations</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {services.map((s, i) => (
                <Card key={i}>
                  <CardContent className="p-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {s.category && (
                          <Badge variant="secondary" className="text-xs">{s.category}</Badge>
                        )}
                        {s.delay_days != null && (
                          <Badge variant="outline" className="text-xs">{s.delay_days} j</Badge>
                        )}
                      </div>
                      {s.description && (
                        <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
                      )}
                    </div>
                    {s.price != null && (
                      <Badge variant="outline" className="shrink-0">
                        <Euro className="h-3 w-3 mr-1" />
                        {formatPartnerPrice(s.price, {
                          prices_include_vat: partner?.prices_include_vat ?? true,
                          vat_rate: Number(partner?.vat_rate ?? 20),
                          vat_exempt: partner?.vat_exempt ?? false,
                        }, 'ttc')}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Rachat */}
        {config.buyback_enabled && (
          <section>
            <Card className="border-primary/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Recycle className="h-5 w-5" />Nous rachetons votre matériel cassé ou défectueux
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {config.buyback_intro && (
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{config.buyback_intro}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {config.buyback_categories.map((c) => {
                    const cat = BUYBACK_CATEGORIES.find((x) => x.id === c);
                    return (
                      <Badge key={c} variant="secondary">
                        {cat ? `${cat.emoji} ${cat.label}` : c}
                      </Badge>
                    );
                  })}
                </div>
                <Button asChild>
                  <Link to={`/${shop.slug}/vendre`}>Faire une proposition de vente</Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Infos pratiques */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Infos pratiques</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                {shop.address && (
                  <p className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0" />{shop.address}</p>
                )}
                {shop.phone && (
                  <p className="flex items-center gap-2"><Phone className="h-4 w-4" />
                    <a className="hover:underline" href={`tel:${shop.phone}`}>{shop.phone}</a>
                  </p>
                )}
                {shop.email && (
                  <p className="flex items-center gap-2"><Mail className="h-4 w-4" />
                    <a className="hover:underline" href={`mailto:${shop.email}`}>{shop.email}</a>
                  </p>
                )}
                {config.show_reviews && shop.review_link && (
                  <p className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    <a className="hover:underline" href={shop.review_link} target="_blank" rel="noopener noreferrer">
                      Laisser un avis <ExternalLink className="h-3 w-3 inline" />
                    </a>
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="flex items-center gap-2 font-medium mb-2 text-sm">
                  <Clock className="h-4 w-4" />Horaires
                </p>
                <ul className="text-sm space-y-1">
                  {(config.opening_hours ?? []).map((h) => (
                    <li key={h.day} className="flex justify-between gap-4">
                      <span className="text-muted-foreground">{h.day}</span>
                      <span>{h.closed || !h.open ? 'Fermé' : `${h.open} – ${h.close}`}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        {shop.name} — site propulsé par Fixway
      </footer>
    </div>
  );
}
