import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, MapPin, Clock, Wrench, ArrowRight } from 'lucide-react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { usePublicPartnerDirectory } from '@/hooks/usePartnerDirectory';

export default function PartnersDirectory() {
  const [search, setSearch] = useState('');
  const { data: partners = [], isLoading } = usePublicPartnerDirectory(search);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Annuaire des réparateurs Fixway | Trouver un atelier</title>
        <meta
          name="description"
          content="Trouvez un réparateur près de chez vous : spécialités, délais moyens et tarifs publics des ateliers partenaires Fixway."
        />
        <link rel="canonical" href="https://fixway.fr/partenaires" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Annuaire des réparateurs Fixway',
            itemListElement: partners.slice(0, 50).map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: p.public_name,
              url: `https://fixway.fr/partenaires/${p.slug}`,
            })),
          })}
        </script>
      </Helmet>

      <LandingHeader />

      <main className="container mx-auto px-4 py-12">
        <header className="text-center max-w-2xl mx-auto space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold">Trouver un réparateur</h1>
          <p className="text-muted-foreground">
            Ateliers et magasins utilisant Fixway : spécialités, délais et tarifs affichés en toute transparence.
          </p>
        </header>

        <div className="relative max-w-xl mx-auto mt-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ville, code postal, spécialité…"
            className="pl-9 h-12"
            aria-label="Rechercher un réparateur"
          />
        </div>

        <section className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground col-span-full text-center">Chargement…</p>
          ) : partners.length === 0 ? (
            <p className="text-sm text-muted-foreground col-span-full text-center">
              Aucun réparateur ne correspond à cette recherche.
            </p>
          ) : (
            partners.map((p) => (
              <Card key={p.slug} className="flex flex-col">
                <CardContent className="p-5 flex-1 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    {p.logo_url && (
                      <img
                        src={p.logo_url}
                        alt={`Logo de ${p.public_name}`}
                        loading="lazy"
                        className="h-10 w-10 rounded object-contain border"
                      />
                    )}
                    <div>
                      <h2 className="font-semibold leading-tight">{p.public_name}</h2>
                      {(p.city || p.postal_code) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {[p.postal_code, p.city].filter(Boolean).join(' ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {p.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{p.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2 mt-auto pt-2">
                    {p.specialties && (
                      <Badge variant="secondary" className="text-xs">
                        <Wrench className="h-3 w-3 mr-1" />{p.specialties}
                      </Badge>
                    )}
                    {p.avg_delay_days != null && (
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />{p.avg_delay_days} j
                      </Badge>
                    )}
                  </div>

                  <Button asChild variant="outline" size="sm" className="mt-2">
                    <Link to={`/partenaires/${p.slug}`}>
                      Voir la fiche <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
