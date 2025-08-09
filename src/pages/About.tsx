import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Target, 
  Award, 
  Lightbulb,
  ArrowRight,
  CheckCircle,
  Smartphone,
  Building2
} from 'lucide-react';

export default function About() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // SEO
  if (typeof document !== 'undefined') {
    document.title = 'À Propos de Fixway - Expert en Gestion SAV Téléphonie Mobile';
    const metaDesc = document.querySelector("meta[name='description']") || document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    metaDesc.setAttribute('content', 'Fixway, solution SaaS française spécialisée dans la gestion SAV pour professionnels de la téléphonie mobile et du high-tech. Expertise et innovation au service des réparateurs.');
    document.head.appendChild(metaDesc);
    const canonical = document.querySelector("link[rel='canonical']") || document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', `${window.location.origin}/about`);
    document.head.appendChild(canonical);
  }

  const values = [
    {
      icon: <Lightbulb className="h-8 w-8" />,
      title: "Innovation",
      description: "Nous développons en permanence de nouvelles fonctionnalités pour répondre aux besoins évolutifs du marché de la réparation mobile."
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Proximité Client",
      description: "Notre équipe accompagne chaque professionnel dans la digitalisation de son SAV avec un support technique réactif."
    },
    {
      icon: <Award className="h-8 w-8" />,
      title: "Excellence",
      description: "Nous visons l'excellence dans chaque fonctionnalité pour offrir la meilleure expérience utilisateur possible."
    }
  ];

  const stats = [
    { number: "500+", label: "Professionnels utilisateurs" },
    { number: "10000+", label: "SAV gérés par mois" },
    { number: "99.9%", label: "Disponibilité du service" },
    { number: "24h", label: "Support technique" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} isMobileMenuOpen={sidebarOpen} />
          <main className="flex-1 overflow-y-auto">
            {/* Hero Section */}
            <section className="bg-gradient-to-r from-primary/10 to-secondary/10 py-16">
              <div className="max-w-7xl mx-auto px-6">
                <div className="text-center">
                  <h1 className="text-4xl font-bold mb-6">
                    À Propos de Fixway
                  </h1>
                  <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                    La solution française de référence pour la gestion SAV en téléphonie mobile et high-tech
                  </p>
                  <Button size="lg" className="bg-primary hover:bg-primary/90">
                    Demander une démo <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            </section>

            {/* Our Story */}
            <section className="py-16">
              <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  <div>
                    <h2 className="text-3xl font-bold mb-6">Notre Histoire</h2>
                    <p className="text-muted-foreground mb-6 text-lg">
                      Fixway est née de la volonté de digitaliser et simplifier la gestion SAV 
                      pour les professionnels de la téléphonie mobile et du high-tech. 
                      Constatant les difficultés rencontrées par les réparateurs pour gérer 
                      efficacement leur service après-vente, nous avons développé une solution 
                      SaaS complète et intuitive.
                    </p>
                    <p className="text-muted-foreground mb-6">
                      Depuis notre création, nous accompagnons les professionnels dans leur 
                      transformation numérique en proposant des outils modernes : suivi SAV en ligne, 
                      QR codes clients, gestion automatisée des devis et tableau de bord analytics.
                    </p>
                    <div className="flex items-center gap-2 text-primary font-semibold">
                      <CheckCircle className="h-5 w-5" />
                      <span>Solution 100% française</span>
                    </div>
                  </div>
                  <div className="bg-muted/30 p-8 rounded-lg">
                    <div className="grid grid-cols-2 gap-6">
                      {stats.map((stat, index) => (
                        <div key={index} className="text-center">
                          <div className="text-3xl font-bold text-primary mb-2">
                            {stat.number}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {stat.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Our Mission */}
            <section className="py-16 bg-muted/30">
              <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold mb-6">Notre Mission</h2>
                  <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                    Démocratiser la gestion SAV professionnelle en téléphonie mobile 
                    grâce à des outils technologiques accessibles et performants
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {values.map((value, index) => (
                    <Card key={index} className="text-center h-full">
                      <CardHeader>
                        <div className="flex justify-center mb-4">
                          <div className="p-3 bg-primary/10 rounded-full text-primary">
                            {value.icon}
                          </div>
                        </div>
                        <CardTitle className="text-xl">{value.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">{value.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </section>

            {/* Target Audience */}
            <section className="py-16">
              <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold mb-6">Nos Clients</h2>
                  <p className="text-xl text-muted-foreground">
                    Fixway s'adresse aux professionnels de la réparation et du SAV high-tech
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="text-center">
                    <div className="flex justify-center mb-4">
                      <div className="p-4 bg-primary/10 rounded-lg">
                        <Smartphone className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <h3 className="font-semibold mb-2">Réparateurs Mobile</h3>
                    <p className="text-sm text-muted-foreground">
                      Spécialistes de la réparation smartphone et tablette
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex justify-center mb-4">
                      <div className="p-4 bg-primary/10 rounded-lg">
                        <Building2 className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <h3 className="font-semibold mb-2">Magasins High-Tech</h3>
                    <p className="text-sm text-muted-foreground">
                      Boutiques proposant un service SAV complet
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex justify-center mb-4">
                      <div className="p-4 bg-primary/10 rounded-lg">
                        <Target className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <h3 className="font-semibold mb-2">SAV Spécialisés</h3>
                    <p className="text-sm text-muted-foreground">
                      Centres de réparation multi-marques
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex justify-center mb-4">
                      <div className="p-4 bg-primary/10 rounded-lg">
                        <Users className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <h3 className="font-semibold mb-2">Franchises</h3>
                    <p className="text-sm text-muted-foreground">
                      Réseaux de magasins avec besoins centralisés
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Expertise */}
            <section className="py-16 bg-muted/30">
              <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold mb-6">Notre Expertise SAV High-Tech</h2>
                  <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                    Une connaissance approfondie du secteur de la réparation mobile 
                    et des besoins spécifiques des professionnels
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                      <div>
                        <h3 className="font-semibold mb-2">Connaissance Métier</h3>
                        <p className="text-muted-foreground">
                          Expertise du monde de la réparation mobile et des processus SAV spécifiques
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                      <div>
                        <h3 className="font-semibold mb-2">Innovation Technologique</h3>
                        <p className="text-muted-foreground">
                          Développement de fonctionnalités avancées comme le suivi QR code et l'analytics
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                      <div>
                        <h3 className="font-semibold mb-2">Support Dédié</h3>
                        <p className="text-muted-foreground">
                          Accompagnement personnalisé pour la prise en main et l'optimisation
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                      <div>
                        <h3 className="font-semibold mb-2">Sécurité & Fiabilité</h3>
                        <p className="text-muted-foreground">
                          Infrastructure sécurisée et disponibilité 99.9% pour vos données SAV
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                      <div>
                        <h3 className="font-semibold mb-2">Évolution Continue</h3>
                        <p className="text-muted-foreground">
                          Mises à jour régulières basées sur les retours terrain des professionnels
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                      <div>
                        <h3 className="font-semibold mb-2">Compliance & Normes</h3>
                        <p className="text-muted-foreground">
                          Respect des réglementations françaises et européennes en matière de données
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* CTA Section */}
            <section className="py-16">
              <div className="max-w-4xl mx-auto px-6 text-center">
                <h2 className="text-3xl font-bold mb-6">
                  Rejoignez les Professionnels Qui Nous Font Confiance
                </h2>
                <p className="text-xl text-muted-foreground mb-8">
                  Découvrez comment Fixway peut transformer votre gestion SAV 
                  et améliorer votre productivité
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" className="bg-primary hover:bg-primary/90">
                    Demander une démo gratuite
                  </Button>
                  <Button size="lg" variant="outline">
                    Contactez notre équipe
                  </Button>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

