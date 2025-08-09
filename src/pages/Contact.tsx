import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock,
  ArrowRight,
  Send,
  MessageCircle,
  Calendar
} from 'lucide-react';

export default function Contact() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: ''
  });

  // SEO
  if (typeof document !== 'undefined') {
    document.title = 'Contact Fixway - Demander une Démo SAV Téléphonie Mobile';
    const metaDesc = document.querySelector("meta[name='description']") || document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    metaDesc.setAttribute('content', 'Contactez Fixway pour une démonstration de notre solution SAV téléphonie mobile. Support technique, devis personnalisé et accompagnement pour professionnels.');
    document.head.appendChild(metaDesc);
    const canonical = document.querySelector("link[rel='canonical']") || document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', `${window.location.origin}/contact`);
    document.head.appendChild(canonical);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Logique d'envoi du formulaire
    console.log('Form submitted:', formData);
  };

  const contactInfo = [
    {
      icon: <Phone className="h-6 w-6" />,
      title: "Téléphone",
      details: "+33 1 XX XX XX XX",
      description: "Du lundi au vendredi de 9h à 18h"
    },
    {
      icon: <Mail className="h-6 w-6" />,
      title: "Email",
      details: "contact@fixway.fr",
      description: "Réponse sous 24h ouvrées"
    },
    {
      icon: <MapPin className="h-6 w-6" />,
      title: "Adresse",
      details: "Paris, France",
      description: "Siège social Fixway"
    }
  ];

  const services = [
    {
      icon: <MessageCircle className="h-6 w-6" />,
      title: "Support Technique",
      description: "Assistance pour l'utilisation de Fixway"
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: "Démonstration",
      description: "Présentation personnalisée de la solution"
    },
    {
      icon: <Send className="h-6 w-6" />,
      title: "Devis sur Mesure",
      description: "Tarification adaptée à vos besoins"
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
                    Contactez Fixway
                  </h1>
                  <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                    Demandez une démonstration personnalisée de notre solution SAV téléphonie mobile 
                    ou obtenez des informations sur nos services
                  </p>
                  <Button size="lg" className="bg-primary hover:bg-primary/90">
                    Demander une démo <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            </section>

            {/* Contact Form & Info */}
            <section className="py-16">
              <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Contact Form */}
                  <div>
                    <h2 className="text-3xl font-bold mb-6">Demander une Démonstration</h2>
                    <p className="text-muted-foreground mb-8">
                      Remplissez ce formulaire pour programmer une démonstration personnalisée 
                      de Fixway adaptée à vos besoins en gestion SAV téléphonie mobile.
                    </p>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Formulaire de Contact</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="name">Nom complet *</Label>
                              <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                placeholder="Votre nom"
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="email">Email professionnel *</Label>
                              <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                placeholder="votre@email.fr"
                                required
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="phone">Téléphone</Label>
                              <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                placeholder="01 XX XX XX XX"
                              />
                            </div>
                            <div>
                              <Label htmlFor="company">Entreprise *</Label>
                              <Input
                                id="company"
                                value={formData.company}
                                onChange={(e) => setFormData({...formData, company: e.target.value})}
                                placeholder="Nom de votre entreprise"
                                required
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor="message">Message</Label>
                            <Textarea
                              id="message"
                              value={formData.message}
                              onChange={(e) => setFormData({...formData, message: e.target.value})}
                              placeholder="Décrivez vos besoins en gestion SAV téléphonie mobile..."
                              rows={4}
                            />
                          </div>
                          
                          <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                            <Send className="mr-2 h-4 w-4" />
                            Envoyer ma demande
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h2 className="text-3xl font-bold mb-6">Nos Coordonnées</h2>
                    <p className="text-muted-foreground mb-8">
                      Notre équipe est à votre disposition pour répondre à toutes vos questions 
                      sur Fixway et la gestion SAV high-tech.
                    </p>

                    <div className="space-y-6 mb-8">
                      {contactInfo.map((info, index) => (
                        <Card key={index}>
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                {info.icon}
                              </div>
                              <div>
                                <h3 className="font-semibold mb-1">{info.title}</h3>
                                <p className="text-lg font-medium mb-1">{info.details}</p>
                                <p className="text-sm text-muted-foreground">{info.description}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Services */}
                    <h3 className="text-xl font-semibold mb-4">Nos Services</h3>
                    <div className="space-y-4">
                      {services.map((service, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            {service.icon}
                          </div>
                          <div>
                            <h4 className="font-medium">{service.title}</h4>
                            <p className="text-sm text-muted-foreground">{service.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Business Hours */}
            <section className="py-16 bg-muted/30">
              <div className="max-w-7xl mx-auto px-6">
                <div className="text-center">
                  <h2 className="text-3xl font-bold mb-6">Horaires de Support</h2>
                  <div className="max-w-2xl mx-auto">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-center gap-3 mb-4">
                          <Clock className="h-6 w-6 text-primary" />
                          <h3 className="text-xl font-semibold">Support Technique Fixway</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                          <div>
                            <p className="font-medium">Lundi - Vendredi</p>
                            <p className="text-muted-foreground">9h00 - 18h00</p>
                          </div>
                          <div>
                            <p className="font-medium">Weekend</p>
                            <p className="text-muted-foreground">Support email uniquement</p>
                          </div>
                        </div>
                        <div className="mt-4 p-4 bg-primary/10 rounded-lg">
                          <p className="text-sm text-center">
                            <strong>Temps de réponse garanti :</strong> 
                            2h en journée, 24h maximum pour toute demande de support
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </section>

            {/* Map Section */}
            <section className="py-16">
              <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-4">Notre Localisation</h2>
                  <p className="text-muted-foreground">
                    Fixway est basé à Paris, au cœur de l'écosystème tech français
                  </p>
                </div>
                
                <div className="bg-muted/30 rounded-lg p-8 text-center">
                  <MapPin className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h3 className="text-xl font-semibold mb-2">Siège Social Fixway</h3>
                  <p className="text-muted-foreground mb-4">Paris, France</p>
                  <p className="text-sm text-muted-foreground">
                    Adresse complète communiquée lors de la prise de rendez-vous
                  </p>
                </div>
              </div>
            </section>

            {/* FAQ CTA */}
            <section className="py-16 bg-primary/5">
              <div className="max-w-4xl mx-auto px-6 text-center">
                <h2 className="text-3xl font-bold mb-6">
                  Des Questions sur la Gestion SAV Téléphonie ?
                </h2>
                <p className="text-xl text-muted-foreground mb-8">
                  Notre équipe d'experts Fixway est là pour vous accompagner dans 
                  la digitalisation de votre service après-vente
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" className="bg-primary hover:bg-primary/90">
                    Programmer une démo
                  </Button>
                  <Button size="lg" variant="outline">
                    Voir nos fonctionnalités
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