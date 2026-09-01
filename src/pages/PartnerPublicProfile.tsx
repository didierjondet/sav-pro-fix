import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Clock, Wrench, Phone, Mail, Globe, ArrowLeft, ShieldCheck } from 'lucide-react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { usePublicPartner } from '@/hooks/usePartnerDirectory';
import { formatPartnerPrice } from '@/lib/partnerPricing';

export default function PartnerPublicProfile() {
  const { slug } = useParams<{ slug: string }>();
  const { data: partner, isLoading } = usePublicPartner(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <LandingHeader />
        <main className="container mx-auto px-4 py-16 text-center text-muted-foreground">Chargement…</main>
        <LandingFooter />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-background">
        <LandingHeader />
        <main className="container mx-auto px-4 py-16 text-center space-y-4">
          <h1 className="text-2xl font-bold">Réparateur introuvable</h1>
          <Button asChild variant="outline">
            <Link to="/partenaires"><ArrowLeft className="h-4 w-4 mr-2" /> Retour à l’annuaire</Link>
          </Button>
        </main>
        <LandingFooter />
      </div>
    );
  }

  const prices: any[] = Array.isArray(partner.public_prices) ? partner.public_prices : [];
  const location = [partner.postal_code, partner.city].filter(Boolean).join(' ');

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{`${partner.public_name}${partner.city ? ` – ${partner.city}` : ''} | Réparateur Fixway`}</title>
        <meta
          name="description"
          content={(partner.description || `Réparateur ${partner.public_name}${location ? ` à ${location}` : ''} : spécialités, délais et tarifs.`).slice(0, 155)}
        />
        <link rel="canonical" href={`https://fixway.fr/partenaires/${partner.slug}`} />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: partner.public_name,
            description: partner.description || undefined,
            telephone: partner.public_phone || undefined,
            email: partner.public_email || undefined,
            url: partner.website_url || undefined,
            address: location
              ? { '@type': 'PostalAddress', postalCode: partner.postal_code, addressLocality: partner.city }
              : undefined,
          })}
        </script>
      </Helmet>

      <LandingHeader />

      <main className="container mx-auto px-4 py-10 max-w-4xl space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/partenaires"><ArrowLeft className="h-4 w-4 mr-2" /> Annuaire</Link>
        </Button>

        <header className="flex items-start gap-4 flex-wrap">
          {partner.logo_url && (
            <img
              src={partner.logo_url}
              alt={`Logo de ${partner.public_name}`}
              loading="lazy"
              className="h-16 w-16 rounded border object-contain"
            />
          )}
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-3xl font-bold">{partner.public_name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="secondary"><ShieldCheck className="h-3 w-3 mr-1" /> Réparateur Fixway</Badge>
              {location && <Badge variant="outline"><MapPin className="h-3 w-3 mr-1" />{location}</Badge>}
              {partner.avg_delay_days != null && (
                <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{partner.avg_delay_days} j en moyenne</Badge>
              )}
              {partner.specialties && (
                <Badge variant="outline"><Wrench className="h-3 w-3 mr-1" />{partner.specialties}</Badge>
              )}
            </div>
          </div>
        </header>

        {partner.description && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Présentation</CardTitle></CardHeader>
            <CardContent><p className="whitespace-pre-wrap text-sm">{partner.description}</p></CardContent>
          </Card>
        )}

        {(partner.warranty_terms || partner.shipping_modes || partner.return_policy ||
          partner.failure_policy || partner.certifications || partner.coverage_area) && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Process et garanties</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
              {partner.coverage_area && <p><strong>Zone :</strong> {partner.coverage_area}</p>}
              {partner.shipping_modes && <p><strong>Envoi :</strong> {partner.shipping_modes}</p>}
              {partner.warranty_terms && <p><strong>Garantie :</strong> {partner.warranty_terms}</p>}
              {partner.return_policy && <p><strong>Retour :</strong> {partner.return_policy}</p>}
              {partner.failure_policy && <p><strong>Si non réparable :</strong> {partner.failure_policy}</p>}
              {partner.certifications && <p><strong>Certifications :</strong> {partner.certifications}</p>}
            </CardContent>
          </Card>
        )}

        {prices.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Tarifs</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {prices.map((line, i) => (
                <div key={i} className="flex items-center justify-between border-b py-2 last:border-0 text-sm gap-3">
                  <span>
                    {line.label}
                    {line.device_family ? ` · ${line.device_family}` : ''}
                    {line.delay_days != null ? ` · ${line.delay_days} j` : ''}
                  </span>
                  <span className="font-medium whitespace-nowrap">
                    {formatPartnerPrice(line.public_price, partner, 'ttc')}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-lg">Contact</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-4 text-sm">
            {partner.public_phone && (
              <a className="flex items-center gap-2 hover:underline" href={`tel:${partner.public_phone}`}>
                <Phone className="h-4 w-4" />{partner.public_phone}
              </a>
            )}
            {partner.public_email && (
              <a className="flex items-center gap-2 hover:underline" href={`mailto:${partner.public_email}`}>
                <Mail className="h-4 w-4" />{partner.public_email}
              </a>
            )}
            {partner.website_url && (
              <a className="flex items-center gap-2 hover:underline" href={partner.website_url}
                target="_blank" rel="noreferrer">
                <Globe className="h-4 w-4" />Site web
              </a>
            )}
          </CardContent>
        </Card>
      </main>

      <LandingFooter />
    </div>
  );
}
