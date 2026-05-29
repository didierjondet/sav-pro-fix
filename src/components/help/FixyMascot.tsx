import React from 'react';

interface FixyMascotProps {
  size?: number;
  waving?: boolean;
  idle?: boolean;
  thinking?: boolean;
  className?: string;
}

/**
 * Fixy — la mascotte de l'assistant Fixway.
 * Petit robot rond et sympa, SVG inline, animations Tailwind.
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
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Antenne */}
        <line x1="32" y1="10" x2="32" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle
          cx="32"
          cy="3"
          r="2.2"
          fill="hsl(var(--primary))"
          className={thinking ? 'animate-mascot-antenna' : ''}
          style={{ transformOrigin: '32px 3px' }}
        />

        {/* Tête (corps) */}
        <rect x="10" y="12" width="44" height="36" rx="14" fill="hsl(var(--primary))" />
        <rect x="10" y="12" width="44" height="36" rx="14" fill="url(#fixyShine)" opacity="0.25" />

        {/* Joues roses */}
        <circle cx="17" cy="33" r="2.5" fill="#ff8fa3" opacity="0.7" />
        <circle cx="47" cy="33" r="2.5" fill="#ff8fa3" opacity="0.7" />

        {/* Yeux (blink via scaleY) */}
        <g
          className="animate-mascot-blink"
          style={{ transformOrigin: '32px 28px', transformBox: 'fill-box' }}
        >
          <ellipse cx="24" cy="28" rx="3.2" ry="4" fill="white" />
          <ellipse cx="40" cy="28" rx="3.2" ry="4" fill="white" />
          <circle cx="24.8" cy="28.5" r="1.6" fill="#1a1a2e" />
          <circle cx="40.8" cy="28.5" r="1.6" fill="#1a1a2e" />
          <circle cx="25.4" cy="27.5" r="0.6" fill="white" />
          <circle cx="41.4" cy="27.5" r="0.6" fill="white" />
        </g>

        {/* Bouche (sourire) */}
        <path
          d="M 25 38 Q 32 43 39 38"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Bras gauche */}
        <rect x="4" y="32" width="6" height="12" rx="3" fill="hsl(var(--primary))" />

        {/* Bras droit qui fait coucou */}
        <g
          className={waving ? 'animate-mascot-wave' : ''}
          style={{ transformOrigin: '57px 38px', transformBox: 'fill-box' }}
        >
          <rect x="54" y="22" width="6" height="14" rx="3" fill="hsl(var(--primary))" />
          <circle cx="57" cy="20" r="3.5" fill="hsl(var(--primary))" />
        </g>

        {/* Petits pieds */}
        <rect x="20" y="48" width="8" height="5" rx="2" fill="hsl(var(--primary))" />
        <rect x="36" y="48" width="8" height="5" rx="2" fill="hsl(var(--primary))" />

        <defs>
          <linearGradient id="fixyShine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.6" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default FixyMascot;
