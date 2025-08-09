import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  QrCode, 
  MessageCircle, 
  BarChart3,
  CheckCircle,
  ArrowRight,
  Menu,
  X,
  Star,
  Users,
  Shield,
  Zap
} from 'lucide-react';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // SEO optimisé
  if (typeof document !== 'undefined') {
    document.title = 'Fixway – Gestion SAV High-Tech et Téléphonie Mobile';
    const metaDesc = document.querySelector("meta[name='description']") || document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    metaDesc.setAttribute('content', 'Solution SaaS pour gérer vos SAV en téléphonie mobile et high-tech : suivi en ligne, devis, QR code client, gestion complète.');
    document.head.appendChild(metaDesc);
    
    // Ajout des meta tags supplémentaires
    const keywords = document.querySelector("meta[name='keywords']") || document.createElement('meta');
    keywords.setAttribute('name', 'keywords');
    keywords.setAttribute('content', 'SAV téléphonie, gestion SAV high-tech, suivi SAV en ligne, logiciel réparation mobile, QR code client');
    document.head.appendChild(keywords);
    
    const canonical = document.querySelector("link[rel='canonical']") || document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', `${window.location.origin}/`);
    document.head.appendChild(canonical);
  }

  const navigation = [
    { name: 'Fonctionnalités', href: '/features' },
    { name: 'À propos', href: '/about' },
    { name: 'Contact', href: '/contact' },
    { name: 'Connexion', href: '/auth' }
  ];

  const features = [
    {
      icon: <Smartphone className="h-8 w-8" />,
      title: "SAV Téléphonie Mobile",
      description: "Gestion complète des réparations smartphones et high-tech avec suivi en temps réel"
    },
    {
      icon: <QrCode className="h-8 w-8" />,
      title: "Suivi Client QR Code",
      description: "Vos clients suivent leurs SAV en ligne 24h/7j grâce au QR code intelligent"
    },
    {
      icon: <MessageCircle className="h-8 w-8" />,
      title: "Communication Intégrée",
      description: "Messagerie et SMS automatiques pour tenir vos clients informés"
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Analytics SAV",
      description: "Tableau de bord complet pour analyser vos performances et rentabilité"
    }
  ];

  const benefits = [
    "Réduction des appels clients de 70%",
    "Gain de temps sur la gestion administrative",
    "Amélioration de la satisfaction client",
    "Suivi précis de la rentabilité par SAV"
  ];

  const testimonials = [
    {
      name: "Jean Dupont",
      company: "TechRepair Pro",
      text: "Fixway a révolutionné notre gestion SAV. Nos clients adorent pouvoir suivre leurs réparations en ligne !"
    },
    {
      name: "Marie Martin",
      company: "Mobile Solutions",
      text: "Excellent outil pour les professionnels. Interface intuitive et gain de productivité remarquable."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold text-primary">
                Fixway
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.name}
                </Link>
              ))}
              <Button asChild>
                <Link to="/contact">Demander une démo</Link>
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-muted-foreground hover:text-foreground"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-background border-t">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="block px-3 py-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Gestion SAV High-Tech et Téléphonie Mobile
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-4xl mx-auto">
            Fixway digitalise votre service après-vente avec des outils modernes : 
            suivi SAV en ligne, QR code client, devis automatisés et analytics complets. 
            La solution SaaS de référence pour les professionnels de la réparation mobile.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-primary hover:bg-primary/90">
              <Link to="/contact">
                Demander une démo gratuite <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/features">Découvrir les fonctionnalités</Link>
            </Button>
          </div>
          <div className="mt-8 flex justify-center items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Démo gratuite • Pas d'engagement • Solution française</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Fonctionnalités SAV Téléphonie Mobile
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Optimisez votre gestion SAV high-tech avec nos outils spécialement 
              conçus pour les professionnels de la réparation mobile
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-primary/10 rounded-full text-primary">
                      {feature.icon}
                    </div>
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Pourquoi Choisir Fixway pour Votre SAV High-Tech ?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Fixway révolutionne la gestion SAV en téléphonie mobile grâce à 
                une approche digitale complète qui améliore l'expérience client 
                et optimise votre productivité.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-lg">{benefit}</span>
                  </div>
                ))}
              </div>
              <Button size="lg" className="mt-8" asChild>
                <Link to="/contact">Découvrir Fixway</Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">500+</div>
                <div className="text-muted-foreground">Professionnels</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">10k+</div>
                <div className="text-muted-foreground">SAV gérés/mois</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">99.9%</div>
                <div className="text-muted-foreground">Disponibilité</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">24h</div>
                <div className="text-muted-foreground">Support</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ils Utilisent Fixway pour Leur Gestion SAV
            </h2>
            <p className="text-xl text-muted-foreground">
              Découvrez pourquoi les professionnels font confiance à Fixway
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 italic">"{testimonial.text}"</p>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.company}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary/5">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Prêt à Révolutionner Votre Gestion SAV ?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Rejoignez les centaines de professionnels qui utilisent Fixway 
            pour optimiser leur service après-vente en téléphonie mobile
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-primary hover:bg-primary/90">
              <Link to="/contact">Demander une démo</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/about">En savoir plus</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold text-primary mb-4">Fixway</div>
              <p className="text-muted-foreground mb-4">
                Solution SaaS pour la gestion SAV téléphonie mobile et high-tech
              </p>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-sm">Solution française</span>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Produit</h3>
              <div className="space-y-2">
                <Link to="/features" className="block text-muted-foreground hover:text-foreground">
                  Fonctionnalités
                </Link>
                <Link to="/about" className="block text-muted-foreground hover:text-foreground">
                  À propos
                </Link>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <div className="space-y-2">
                <Link to="/contact" className="block text-muted-foreground hover:text-foreground">
                  Contact
                </Link>
                <a href="mailto:support@fixway.fr" className="block text-muted-foreground hover:text-foreground">
                  Support technique
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Entreprise</h3>
              <div className="space-y-2">
                <span className="block text-muted-foreground">Paris, France</span>
                <span className="block text-muted-foreground">contact@fixway.fr</span>
              </div>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 Fixway. Tous droits réservés. Solution française de gestion SAV téléphonie mobile.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

