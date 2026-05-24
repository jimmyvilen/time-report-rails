import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: 'oklch(var(--accent) / <alpha-value>)',
        border: 'oklch(var(--border) / <alpha-value>)',
        background: {
          DEFAULT: 'oklch(var(--background) / <alpha-value>)',
          card: 'oklch(var(--background-card) / <alpha-value>)',
          'card-hover': 'oklch(var(--background-card-hover) / <alpha-value>)',
          elevated: 'oklch(var(--background-elevated) / <alpha-value>)',
        },
        foreground: {
          DEFAULT: 'oklch(var(--foreground) / <alpha-value>)',
          muted: 'oklch(var(--foreground-muted) / <alpha-value>)',
        },
        danger: 'oklch(var(--danger) / <alpha-value>)',
        success: 'oklch(var(--success) / <alpha-value>)',
      },
      maxWidth: {
        app: '1100px',
      },
    },
  },
  plugins: [typography],
} satisfies Config
