import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
			'pulse-border': {
				'0%, 100%': {
					borderColor: 'hsl(213, 94%, 87%)',
					boxShadow: '0 0 0 0 hsla(217, 91%, 60%, 0.4)'
				},
				'50%': {
					borderColor: 'hsl(217, 91%, 60%)',
					boxShadow: '0 0 12px 3px hsla(217, 91%, 60%, 0.5)'
				}
			},
			'confetti-fall': {
				'0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
				'100%': { transform: 'translateY(120vh) rotate(720deg)', opacity: '0' }
			},
			'firework-rise': {
				'0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
				'50%': { transform: 'translateY(-60vh) scale(1.5)', opacity: '0.8' },
				'100%': { transform: 'translateY(-80vh) scale(0)', opacity: '0' }
			},
			'fade-in': {
				'0%': { opacity: '0', transform: 'translateY(10px)' },
				'100%': { opacity: '1', transform: 'translateY(0)' }
			},
			'wiggle-attention': {
				'0%, 100%': { transform: 'rotate(0deg) scale(1)' },
				'10%': { transform: 'rotate(-12deg) scale(1.05)' },
				'20%': { transform: 'rotate(12deg) scale(1.05)' },
				'30%': { transform: 'rotate(-10deg) scale(1.05)' },
				'40%': { transform: 'rotate(10deg) scale(1.05)' },
				'50%': { transform: 'rotate(-6deg) scale(1.03)' },
				'60%': { transform: 'rotate(6deg) scale(1.03)' },
				'70%': { transform: 'rotate(0deg) scale(1)' }
			},
			'mascot-bounce': {
				'0%, 100%': { transform: 'translateY(0)' },
				'50%': { transform: 'translateY(-4px)' }
			},
			'mascot-wave': {
				'0%, 60%, 100%': { transform: 'rotate(0deg)' },
				'70%': { transform: 'rotate(-25deg)' },
				'80%': { transform: 'rotate(20deg)' },
				'90%': { transform: 'rotate(-15deg)' }
			},
			'mascot-blink': {
				'0%, 92%, 100%': { transform: 'scaleY(1)' },
				'95%, 97%': { transform: 'scaleY(0.1)' }
			},
			'mascot-antenna': {
				'0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
				'50%': { opacity: '1', transform: 'scale(1.4)' }
			}
		},
		animation: {
			'accordion-down': 'accordion-down 0.2s ease-out',
			'accordion-up': 'accordion-up 0.2s ease-out',
			'pulse-border': 'pulse-border 1.5s ease-in-out 3',
			'confetti': 'confetti-fall 3s ease-in forwards',
			'firework': 'firework-rise 2.5s ease-out forwards',
			'fade-in': 'fade-in 0.4s ease-out forwards',
			'wiggle-attention': 'wiggle-attention 1.2s ease-in-out',
			'mascot-bounce': 'mascot-bounce 3s ease-in-out infinite',
			'mascot-wave': 'mascot-wave 4s ease-in-out infinite',
			'mascot-blink': 'mascot-blink 5s ease-in-out infinite',
			'mascot-antenna': 'mascot-antenna 1.2s ease-in-out infinite'
		}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
