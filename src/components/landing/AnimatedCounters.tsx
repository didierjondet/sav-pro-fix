import { useState, useEffect, useRef } from 'react';
import { Phone, TrendingUp, Clock, Settings } from 'lucide-react';

const counters = [
  {
    icon: Phone,
    value: 80,
    suffix: "%",
    prefix: "-",
    label: "d'appels clients",
    description: "Moins d'interruptions au comptoir"
  },
  {
    icon: TrendingUp,
    value: 35,
    suffix: "%",
    prefix: "+",
    label: "de marge visible",
    description: "Rentabilité enfin mesurable"
  },
  {
    icon: Clock,
    value: 2,
    suffix: " min",
    prefix: "",
    label: "pour créer un SAV",
    description: "Simplicité et rapidité"
  },
  {
    icon: Settings,
    value: 100,
    suffix: "%",
    prefix: "",
    label: "configurable",
    description: "Adapté à votre métier"
  }
];

function useCountUp(end: number, isVisible: boolean, duration: number = 2000) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (!isVisible) return;
    
    let startTime: number | null = null;
    const startValue = 0;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * (end - startValue) + startValue));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [end, isVisible, duration]);
  
  return count;
}

export function AnimatedCounters() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    
    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <section 
      ref={sectionRef}
      className="py-20 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Des résultats <span className="text-amber-400">concrets</span>
          </h2>
          <p className="text-xl text-gray-400">
            Nos utilisateurs constatent des améliorations dès le premier mois
          </p>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {counters.map((counter, index) => (
            <CounterCard key={index} counter={counter} isVisible={isVisible} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CounterCard({ 
  counter, 
  isVisible, 
  index 
}: { 
  counter: typeof counters[0]; 
  isVisible: boolean;
  index: number;
}) {
  const count = useCountUp(counter.value, isVisible);
  
  return (
    <div 
      className="relative group"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center hover:bg-white/10 transition-all duration-300 hover:-translate-y-2">
        {/* Icon */}
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
          <counter.icon className="h-7 w-7 text-white" />
        </div>
        
        {/* Counter */}
        <div className="text-4xl sm:text-5xl font-black text-white mb-2">
          <span className="text-amber-400">{counter.prefix}</span>
          {count}
          <span className="text-amber-400">{counter.suffix}</span>
        </div>
        
        {/* Label */}
        <div className="text-lg font-semibold text-white mb-2">
          {counter.label}
        </div>
        
        {/* Description */}
        <div className="text-sm text-gray-400">
          {counter.description}
        </div>
      </div>
    </div>
  );
}
