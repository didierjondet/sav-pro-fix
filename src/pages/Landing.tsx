import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  Clock, 
  MessageSquare, 
  BarChart3, 
  Users, 
  Settings,
  CheckCircle,
  ArrowRight,
  Star,
  Shield,
  Zap
} from 'lucide-react';

export default function Landing() {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Smartphone className="h-8 w-8 text-blue-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">SAV Pro</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => window.location.href = '/auth'}>
                Connexion
              </Button>
              <Button onClick={() => window.location.href = '/auth'}>
                Essai Gratuit
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge className="mb-4 bg-blue-100 text-blue-800">
              Solution complète de gestion SAV
            </Badge>
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Révolutionnez votre <span className="text-blue-600">Service Après-Vente</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Optimisez votre rendement, automatisez la communication client et offrez un suivi en temps réel. 
              La solution SAV nouvelle génération pour les professionnels du high-tech.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8" onClick={() => window.location.href = '/auth'}>
                Démarrer maintenant
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8" onClick={() => setShowDemo(true)}>
                Voir la démo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Pourquoi choisir SAV Pro ?
            </h2>
            <p className="text-lg text-gray-600">
              Des fonctionnalités pensées pour optimiser votre activité
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Zap className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Gestion optimisée</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Suivez tous vos dossiers SAV en temps réel, gérez votre stock de pièces détachées et optimisez votre planning.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <MessageSquare className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle>Communication automatique</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Envoyez automatiquement des SMS et emails à vos clients pour les tenir informés de l'avancement de leur réparation.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-purple-600 mb-4" />
                <CardTitle>Suivi client en temps réel</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Vos clients accèdent à une timeline détaillée de leur réparation et reçoivent des notifications automatiques.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Transformez votre boutique SAV
              </h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Page magasin personnalisée</h3>
                    <p className="text-gray-600">Configurez vos horaires, coordonnées et liens réseaux sociaux</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Notifications automatiques</h3>
                    <p className="text-gray-600">SMS et emails envoyés automatiquement à chaque étape</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Gestion des stocks</h3>
                    <p className="text-gray-600">Suivez vos pièces détachées et recevez des alertes de stock faible</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Statistiques avancées</h3>
                    <p className="text-gray-600">Analysez vos performances et optimisez votre activité</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Timeline client</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-4"></div>
                  <div>
                    <p className="text-sm font-medium">Appareil reçu</p>
                    <p className="text-xs text-gray-500">Il y a 2 heures</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-4"></div>
                  <div>
                    <p className="text-sm font-medium">Diagnostic en cours</p>
                    <p className="text-xs text-gray-500">En cours</p>
                  </div>
                </div>
                <div className="flex items-center opacity-50">
                  <div className="w-3 h-3 bg-gray-300 rounded-full mr-4"></div>
                  <div>
                    <p className="text-sm font-medium">Réparation</p>
                    <p className="text-xs text-gray-500">À venir</p>
                  </div>
                </div>
                <div className="flex items-center opacity-50">
                  <div className="w-3 h-3 bg-gray-300 rounded-full mr-4"></div>
                  <div>
                    <p className="text-sm font-medium">Tests et validation</p>
                    <p className="text-xs text-gray-500">À venir</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Tarifs simples et transparents
            </h2>
            <p className="text-lg text-gray-600">
              Commencez gratuitement, évoluez selon vos besoins
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Starter</CardTitle>
                <div className="text-3xl font-bold">Gratuit</div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Jusqu'à 10 dossiers SAV/mois</li>
                  <li>• 50 SMS inclus</li>
                  <li>• Support email</li>
                </ul>
                <Button className="w-full mt-4" variant="outline">
                  Commencer gratuitement
                </Button>
              </CardContent>
            </Card>

            <Card className="border-blue-500 shadow-lg">
              <CardHeader>
                <Badge className="mb-2">Populaire</Badge>
                <CardTitle>Pro</CardTitle>
                <div className="text-3xl font-bold">29€<span className="text-lg text-gray-500">/mois</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Dossiers SAV illimités</li>
                  <li>• 500 SMS inclus</li>
                  <li>• Notifications automatiques</li>
                  <li>• Statistiques avancées</li>
                </ul>
                <Button className="w-full mt-4">
                  Essayer Pro
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Enterprise</CardTitle>
                <div className="text-3xl font-bold">Sur mesure</div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Tout de Pro</li>
                  <li>• SMS illimités</li>
                  <li>• API personnalisée</li>
                  <li>• Support prioritaire</li>
                </ul>
                <Button className="w-full mt-4" variant="outline">
                  Nous contacter
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Prêt à révolutionner votre SAV ?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Rejoignez les centaines de boutiques qui ont choisi SAV Pro
          </p>
          <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
            Commencer maintenant
          </Button>
        </div>
      </section>

      {/* Footer avec lien super admin */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-400">
            <p>&copy; 2024 SAV Pro. Tous droits réservés.</p>
            <button
              onClick={() => window.location.href = '/network-admin'}
              className="text-xs text-gray-600 hover:text-gray-400 mt-2 opacity-50 hover:opacity-100 transition-opacity"
            >
              Administration
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}