import { Star, Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const testimonials = [
  {
    quote: "Avant FixwayPro, je ne savais pas combien valait mon stock. Maintenant, j'ai une vraie visibilité sur ma trésorerie. J'ai découvert que j'avais plus de 15 000€ de pièces dormantes !",
    author: "Marc D.",
    role: "Gérant boutique mobile",
    location: "Lyon",
    rating: 5,
    avatar: "MD"
  },
  {
    quote: "Les clients n'appellent plus 10 fois par jour pour savoir où en est leur réparation. Le QR code a tout changé. Mon équipe peut enfin se concentrer sur les réparations.",
    author: "Sophie L.",
    role: "Responsable SAV",
    location: "Paris",
    rating: 5,
    avatar: "SL"
  },
  {
    quote: "Le tableau de bord des retards m'a permis d'identifier un technicien en difficulté. Sans cette alerte, j'aurais perdu plusieurs clients mécontents.",
    author: "Thomas B.",
    role: "Propriétaire multi-boutiques",
    location: "Bordeaux",
    rating: 5,
    avatar: "TB"
  }
];

export function TestimonialSection() {
  return (
    <section className="py-24 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Ils ont <span className="text-blue-600">transformé</span> leur activité
          </h2>
          <p className="text-xl text-gray-600">
            Découvrez les retours de nos utilisateurs
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={index}
              className="relative bg-white border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden"
            >
              {/* Quote decoration */}
              <div className="absolute top-4 right-4 opacity-10">
                <Quote className="h-16 w-16 text-blue-600" />
              </div>
              
              <CardContent className="p-8">
                {/* Stars */}
                <div className="flex gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                
                {/* Quote */}
                <blockquote className="text-gray-700 mb-8 leading-relaxed italic">
                  "{testimonial.quote}"
                </blockquote>
                
                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.author}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                    <div className="text-xs text-gray-400">{testimonial.location}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
