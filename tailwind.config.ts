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
				'0%, 55%, 100%': { transform: 'rotate(0deg)' },
				'60%': { transform: 'rotate(-45deg)' },
				'67%': { transform: 'rotate(-15deg)' },
				'74%': { transform: 'rotate(-45deg)' },
				'81%': { transform: 'rotate(-15deg)' },
				'88%': { transform: 'rotate(-45deg)' },
				'95%': { transform: 'rotate(0deg)' }
			},
			'mascot-blink': {
				'0%, 92%, 100%': { transform: 'scaleY(1)' },
				'95%, 97%': { transform: 'scaleY(0.1)' }
			},
			'mascot-antenna': {
				'0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
				'50%': { opacity: '1', transform: 'scale(1.4)' }
			},
			'mascot-cheer': {
				'0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
				'20%': { transform: 'translateY(-10px) rotate(-8deg)' },
				'40%': { transform: 'translateY(-14px) rotate(8deg)' },
				'60%': { transform: 'translateY(-10px) rotate(-5deg)' },
				'80%': { transform: 'translateY(-4px) rotate(3deg)' }
			},
			'mascot-alert': {
				'0%, 100%': { transform: 'translateX(0)' },
				'15%, 45%, 75%': { transform: 'translateX(-5px)' },
				'30%, 60%, 90%': { transform: 'translateX(5px)' }
			},
			'mascot-nod': {
				'0%, 100%': { transform: 'rotate(0deg)' },
				'25%': { transform: 'rotate(-12deg)' },
				'50%': { transform: 'rotate(0deg)' },
				'75%': { transform: 'rotate(12deg)' }
			},
			'mascot-spin': {
				'0%': { transform: 'rotate(0deg) scale(1)' },
				'50%': { transform: 'rotate(180deg) scale(1.1)' },
				'100%': { transform: 'rotate(360deg) scale(1)' }
			},
			'mascot-love': {
				'0%, 100%': { transform: 'scale(1)' },
				'25%, 75%': { transform: 'scale(1.15)' },
				'50%': { transform: 'scale(0.95)' }
			},
			'mascot-bubble-in': {
				'0%': { transform: 'translateY(8px) scale(0.6)', opacity: '0' },
				'60%': { transform: 'translateY(-2px) scale(1.05)', opacity: '1' },
				'100%': { transform: 'translateY(0) scale(1)', opacity: '1' }
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
			'mascot-wave': 'mascot-wave 6s ease-in-out infinite',
			'mascot-blink': 'mascot-blink 5s ease-in-out infinite',
			'mascot-antenna': 'mascot-antenna 1.2s ease-in-out infinite',
			'mascot-cheer': 'mascot-cheer 1.4s ease-in-out',
			'mascot-alert': 'mascot-alert 0.6s ease-in-out 3',
			'mascot-nod': 'mascot-nod 1.2s ease-in-out',
			'mascot-spin': 'mascot-spin 1s ease-in-out',
			'mascot-love': 'mascot-love 1.2s ease-in-out 2',
			'mascot-bubble-in': 'mascot-bubble-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
		}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
