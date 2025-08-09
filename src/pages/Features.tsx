import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  QrCode, 
  MessageCircle, 
  FileText, 
  BarChart3, 
  Shield,
  Clock,
  Users,
  Zap,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

export default function Features() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // SEO
  if (typeof document !== 'undefined') {
    document.title = 'Fonctionnalités Fixway - Gestion SAV Téléphonie et High-Tech';
    const metaDesc = document.querySelector("meta[name='description']") || document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    metaDesc.setAttribute('content', 'Découvrez toutes les fonctionnalités Fixway : gestion SAV téléphonie mobile, suivi en ligne, devis automatisés, QR code client et tableau de bord complet.');
    document.head.appendChild(metaDesc);
    const canonical = document.querySelector("link[rel='canonical']") || document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', `${window.location.origin}/features`);
    document.head.appendChild(canonical);
  }

  const features = [
    {
      icon: <Smartphone className="h-8 w-8" />,
      title: "Gestion SAV Téléphonie Mobile",
      description: "Interface dédiée pour la gestion complète des réparations de smartphones, tablettes et accessoires. Suivi des pièces, temps de réparation et statuts en temps réel.",
      benefits: ["Suivi complet des réparations", "Gestion automatisée des pièces détachées", "Historique client centralisé"]
    },
    {
      icon: <QrCode className="h-8 w-8" />,
      title: "QR Code Client Intelligent",
      description: "Génération automatique de QR codes pour chaque SAV permettant aux clients de suivre l'avancement de leur réparation en temps réel depuis leur smartphone.",
      benefits: ["Suivi SAV en ligne 24h/7j", "Réduction des appels clients", "Expérience client modernisée"]
    },
    {
      icon: <FileText className="h-8 w-8" />,
      title: "Devis Automatisés",
      description: "Création rapide de devis professionnels avec calcul automatique des marges, gestion des remises et conversion directe en dossier SAV.",
      benefits: ["Devis professionnels en 1 clic", "Calcul automatique des marges", "Conversion devis vers SAV"]
    },
    {
      icon: <MessageCircle className="h-8 w-8" />,
      title: "Communication Client Intégrée",
      description: "Système de messagerie intégré et envoi d'SMS automatiques pour tenir vos clients informés à chaque étape de la réparation.",
      benefits: ["Messagerie temps réel", "SMS automatiques", "Notifications push"]
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Tableau de Bord Analytics",
      description: "Statistiques complètes sur votre activité SAV : chiffre d'affaires, délais de réparation, pièces les plus utilisées et performance globale.",
      benefits: ["Statistiques temps réel", "Analyse de rentabilité", "Suivi des performances"]
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Gestion Multi-Utilisateurs",
      description: "Système de droits granulaires permettant de gérer plusieurs techniciens avec des accès personnalisés selon leur rôle dans l'entreprise.",
      benefits: ["Comptes techniciens illimités", "Droits d'accès configurables", "Traçabilité des actions"]
    }
  ];

  const additionalFeatures = [
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Suivi des Délais SAV",
      description: "Monitoring automatique des délais de réparation avec alertes pour éviter les retards."
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Base Client Centralisée",
      description: "Historique complet de chaque client avec toutes ses réparations et préférences."
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Interface Intuitive",
      description: "Design moderne et ergonomique pensé pour les professionnels de la réparation."
    }
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
                    Fonctionnalités Fixway pour la Gestion SAV High-Tech
                  </h1>
                  <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                    Découvrez notre solution complète pour digitaliser et optimiser 
                    votre service après-vente en téléphonie mobile et high-tech
                  </p>
                  <Button size="lg" className="bg-primary hover:bg-primary/90">
                    Demander une démo <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            </section>

            {/* Main Features */}
            <section className="py-16">
              <div className="max-w-7xl mx-auto px-6">
                <h2 className="text-3xl font-bold text-center mb-12">
                  Fonctionnalités Principales pour le SAV Téléphonie
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {features.map((feature, index) => (
                    <Card key={index} className="h-full hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            {feature.icon}
                          </div>
                          <CardTitle className="text-xl">{feature.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground mb-4">
                          {feature.description}
                        </p>
                        <div className="space-y-2">
                          {feature.benefits.map((benefit, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span>{benefit}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </section>

            {/* Additional Features */}
            <section className="py-16 bg-muted/30">
              <div className="max-w-7xl mx-auto px-6">
                <h2 className="text-3xl font-bold text-center mb-12">
                  Fonctionnalités Complémentaires
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {additionalFeatures.map((feature, index) => (
                    <div key={index} className="text-center">
                      <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full text-primary">
                          {feature.icon}
                        </div>
                      </div>
                      <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* CTA Section */}
            <section className="py-16">
              <div className="max-w-4xl mx-auto px-6 text-center">
                <h2 className="text-3xl font-bold mb-6">
                  Prêt à Digitaliser Votre SAV High-Tech ?
                </h2>
                <p className="text-xl text-muted-foreground mb-8">
                  Rejoignez les professionnels qui font confiance à Fixway pour 
                  optimiser leur gestion SAV en téléphonie mobile
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" className="bg-primary hover:bg-primary/90">
                    Demander une démo gratuite
                  </Button>
                  <Button size="lg" variant="outline">
                    Voir les tarifs
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