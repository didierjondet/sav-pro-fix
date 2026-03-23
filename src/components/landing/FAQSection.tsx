import { useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const faqItems = [
  {
    question: "Qu'est-ce qu'un logiciel SAV ?",
    answer: "Un logiciel SAV (Service Après-Vente) est un outil professionnel qui permet aux réparateurs de gérer l'ensemble de leurs dossiers de réparation : réception d'appareils, suivi des interventions, gestion du stock de pièces détachées, communication avec les clients, et facturation. FixwayPro est un logiciel SAV spécialement conçu pour les réparateurs de smartphones, consoles et appareils high-tech."
  },
  {
    question: "FixwayPro est-il vraiment un logiciel SAV gratuit ?",
    answer: "Oui, FixwayPro propose un plan entièrement gratuit qui vous permet de gérer vos dossiers SAV, créer des devis, suivre vos réparations et communiquer avec vos clients. Des plans premium sont disponibles pour les entreprises qui ont besoin de fonctionnalités avancées comme l'envoi de SMS, un nombre illimité de dossiers, ou des statistiques détaillées."
  },
  {
    question: "Quelle est la différence entre un logiciel SAV et un tableur Excel ?",
    answer: "Un tableur comme Excel nécessite une saisie manuelle fastidieuse, ne permet pas le suivi en temps réel, et n'offre aucune communication automatisée avec vos clients. Un logiciel SAV comme FixwayPro automatise la gestion complète : suivi par QR code, notifications SMS automatiques, gestion du stock, calcul des marges, et statistiques de rentabilité. Vous gagnez en moyenne 2 heures par jour."
  },
  {
    question: "Comment mes clients peuvent-ils suivre leur réparation en ligne ?",
    answer: "Avec FixwayPro, chaque dossier SAV génère automatiquement un QR code unique. Vos clients scannent ce QR code pour accéder à une page de suivi en temps réel, sans avoir besoin de créer un compte. Ils voient l'état de leur réparation, peuvent échanger des messages avec vous, et reçoivent des notifications par SMS à chaque changement de statut."
  },
  {
    question: "FixwayPro est-il adapté à mon activité de réparation ?",
    answer: "FixwayPro est conçu pour tous les professionnels de la réparation : réparateurs de smartphones (iPhone, Samsung, Huawei...), réparateurs de consoles (PS5, Xbox, Nintendo Switch), réparateurs de tablettes et ordinateurs, et tout atelier de réparation high-tech. L'application SAV est entièrement configurable selon vos types de réparation et vos processus."
  },
  {
    question: "Comment gérer mon stock de pièces détachées avec FixwayPro ?",
    answer: "FixwayPro intègre un module complet de gestion de stock : suivi des quantités en temps réel, alertes de stock bas, prix d'achat et de vente, calcul automatique des marges, et réservation de pièces pour les réparations en cours. Vous ne serez plus jamais en rupture de stock sur une pièce critique."
  },
  {
    question: "Puis-je utiliser FixwayPro sur mobile et tablette ?",
    answer: "Oui, FixwayPro est une application web responsive qui fonctionne parfaitement sur ordinateur, tablette et smartphone. Vous pouvez gérer vos dossiers SAV depuis n'importe quel appareil avec un navigateur web, sans installation nécessaire."
  },
  {
    question: "Comment FixwayPro se compare aux autres logiciels SAV du marché ?",
    answer: "Contrairement à de nombreux logiciels SAV payants et complexes, FixwayPro se distingue par sa gratuité, sa spécialisation pour les réparateurs high-tech, son interface intuitive, et ses fonctionnalités uniques comme le suivi par QR code et la messagerie client intégrée. C'est l'alternative moderne aux solutions traditionnelles coûteuses."
  }
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqItems.map(item => ({
    "@type": "Question",
    "name": item.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": item.answer
    }
  }))
};

export function FAQSection() {
  useEffect(() => {
    // Inject FAQ JSON-LD
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(faqJsonLd);
    script.id = 'faq-jsonld';
    document.head.appendChild(script);
    return () => {
      const el = document.getElementById('faq-jsonld');
      if (el) el.remove();
    };
  }, []);

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20 bg-gray-50" id="faq">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Questions fréquentes sur notre logiciel SAV
          </h2>
          <p className="text-lg text-gray-600">
            Tout ce que vous devez savoir sur FixwayPro, le logiciel SAV gratuit pour réparateurs
          </p>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
              >
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  {item.question}
                </h3>
                {openIndex === index ? (
                  <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                )}
              </button>
              {openIndex === index && (
                <div className="px-6 pb-5">
                  <p className="text-gray-600 leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
