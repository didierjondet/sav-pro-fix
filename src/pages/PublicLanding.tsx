import { useState, useEffect } from 'react';
import { Smartphone, Clock, MessageSquare, BarChart3, Users, Settings, CheckCircle, ArrowRight, Star, Shield, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function PublicLanding() {
  console.log('PublicLanding rendering - completely outside auth context');
  console.log('Current URL:', window.location.href);
  
  useEffect(() => {
    // Check if user is already authenticated and redirect
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('User is authenticated, redirecting to dashboard');
        window.location.href = '/dashboard';
      }
    };
    
    checkAuth();
  }, []);
  
  const handleAuthClick = () => {
    window.location.href = '/auth';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Smartphone className="h-8 w-8 text-blue-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">Fixway</h1>
            </div>
            <div className="flex items-center gap-4">
              <button 
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                onClick={handleAuthClick}
              >
                Connexion
              </button>
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={handleAuthClick}
              >
                Essai Gratuit
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-4 inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              Solution complète de gestion SAV
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Révolutionnez votre <span className="text-blue-600">Service Après-Vente</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Optimisez votre rendement, automatisez la communication client et offrez un suivi en temps réel. 
              La solution SAV nouvelle génération pour les professionnels du high-tech.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                className="px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-lg flex items-center justify-center mx-auto"
                onClick={handleAuthClick}
              >
                Démarrer maintenant <ArrowRight className="ml-2 h-5 w-5" />
              </button>
              <button className="px-8 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-lg">
                Voir la démo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Tout ce dont vous avez besoin pour gérer votre SAV
            </h2>
            <p className="text-xl text-gray-600">
              Une solution complète qui s'adapte à votre façon de travailler
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Gestion des réparations</h3>
              <p className="text-gray-600">Suivez vos réparations de A à Z avec un système intuitif</p>
            </div>

            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Communication client</h3>
              <p className="text-gray-600">SMS automatiques et suivi en temps réel pour vos clients</p>
            </div>

            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Statistiques avancées</h3>
              <p className="text-gray-600">Analysez vos performances et optimisez votre rentabilité</p>
            </div>
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
            Rejoignez les centaines de boutiques qui ont choisi FixWay
          </p>
          <button 
            className="px-8 py-3 bg-white text-blue-600 rounded-md hover:bg-gray-100 text-lg font-semibold"
            onClick={handleAuthClick}
          >
            Commencer maintenant
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-400">
            <p>&copy; 2024 FixWay. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}