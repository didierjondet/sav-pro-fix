import React from 'react';

interface FixyMascotProps {
  size?: number;
  waving?: boolean;
  idle?: boolean;
  thinking?: boolean;
  className?: string;
}

/**
 * Fixy — mascotte de l'assistant Fixway.
 * Petit robot blanc/crème avec accents colorés, ombres et reflets pour ressortir
 * sur un fond bleu primary. Bras droit anime un vrai "coucou" périodique.
 */
const FixyMascot: React.FC<FixyMascotProps> = ({
  size = 40,
  waving = false,
  idle = false,
  thinking = false,
  className = '',
}) => {
  return (
    <div
      className={`inline-block ${idle ? 'animate-mascot-bounce' : ''} ${className}`}
      style={{ width: size, height: size, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 72 72"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Corps : dégradé blanc → gris clair pour donner du volume */}
          <linearGradient id="fixyBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#f1f3f8" />
            <stop offset="100%" stopColor="#d6dbe6" />
          </linearGradient>
          {/* Reflet du dôme */}
          <linearGradient id="fixyShine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          {/* Visière vitrée colorée */}
          <linearGradient id="fixyVisor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1f2a44" />
            <stop offset="100%" stopColor="#0b1226" />
          </linearGradient>
        </defs>

        {/* Ombre portée sous le robot */}
        <ellipse cx="36" cy="64" rx="20" ry="3" fill="rgba(0,0,0,0.25)" />

        {/* Antenne */}
        <line x1="36" y1="10" x2="36" y2="4" stroke="#0b1226" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
        <circle
          cx="36"
          cy="3"
          r="2.6"
          fill="#ff5d5d"
          className={thinking ? 'animate-mascot-antenna' : ''}
          style={{ transformOrigin: '36px 3px' }}
        />
        <circle cx="36" cy="3" r="1" fill="#fff" opacity="0.8" />

        {/* Corps (tête) */}
        <rect x="10" y="12" width="52" height="40" rx="16" fill="url(#fixyBody)" stroke="#aab2c2" strokeWidth="1" />
        {/* Reflet supérieur */}
        <rect x="14" y="14" width="44" height="14" rx="11" fill="url(#fixyShine)" opacity="0.7" />

        {/* Visière (zone des yeux) */}
        <rect x="16" y="22" width="40" height="18" rx="9" fill="url(#fixyVisor)" />
        <rect x="16" y="22" width="40" height="6" rx="6" fill="#ffffff" opacity="0.08" />

        {/* Yeux brillants (avec blink) */}
        <g
          className="animate-mascot-blink"
          style={{ transformOrigin: '36px 31px', transformBox: 'fill-box' }}
        >
          <circle cx="27" cy="31" r="3.4" fill="#7df9ff" />
          <circle cx="27" cy="31" r="3.4" fill="hsl(var(--primary))" opacity="0.5" />
          <circle cx="28" cy="30" r="1.2" fill="#ffffff" />
          <circle cx="45" cy="31" r="3.4" fill="#7df9ff" />
          <circle cx="45" cy="31" r="3.4" fill="hsl(var(--primary))" opacity="0.5" />
          <circle cx="46" cy="30" r="1.2" fill="#ffffff" />
        </g>

        {/* Joues roses */}
        <circle cx="18" cy="42" r="2.6" fill="#ff8fa3" opacity="0.85" />
        <circle cx="54" cy="42" r="2.6" fill="#ff8fa3" opacity="0.85" />

        {/* Sourire */}
        <path
          d="M 27 45 Q 36 51 45 45"
          stroke="#1f2a44"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Bras gauche (au repos) */}
        <g>
          <rect x="3" y="34" width="7" height="14" rx="3.5" fill="url(#fixyBody)" stroke="#aab2c2" strokeWidth="1" />
          <circle cx="6.5" cy="49" r="3.2" fill="url(#fixyBody)" stroke="#aab2c2" strokeWidth="1" />
        </g>

        {/* Bras droit qui fait COUCOU — épaule à 62,30 */}
        <g
          className={waving ? 'animate-mascot-wave' : ''}
          style={{ transformOrigin: '62px 32px', transformBox: 'fill-box' }}
        >
          <rect x="58" y="20" width="7" height="16" rx="3.5" fill="url(#fixyBody)" stroke="#aab2c2" strokeWidth="1" />
          {/* Main */}
          <circle cx="61.5" cy="17" r="4.2" fill="url(#fixyBody)" stroke="#aab2c2" strokeWidth="1" />
          {/* Petits doigts pour évoquer une main ouverte */}
          <circle cx="59.5" cy="14" r="1.1" fill="url(#fixyBody)" stroke="#aab2c2" strokeWidth="0.6" />
          <circle cx="62" cy="13.2" r="1.1" fill="url(#fixyBody)" stroke="#aab2c2" strokeWidth="0.6" />
          <circle cx="64.5" cy="14" r="1.1" fill="url(#fixyBody)" stroke="#aab2c2" strokeWidth="0.6" />
        </g>

        {/* Pieds */}
        <rect x="20" y="52" width="10" height="6" rx="2.5" fill="url(#fixyBody)" stroke="#aab2c2" strokeWidth="1" />
        <rect x="42" y="52" width="10" height="6" rx="2.5" fill="url(#fixyBody)" stroke="#aab2c2" strokeWidth="1" />

        {/* Petit logo bleu sur le torse pour rappeler la marque */}
        <circle cx="36" cy="48" r="2.2" fill="hsl(var(--primary))" />
      </svg>
    </div>
  );
};

export default FixyMascot;
