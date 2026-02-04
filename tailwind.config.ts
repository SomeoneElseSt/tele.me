import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#07070b',
        panel: 'rgba(255,255,255,0.06)',
        panel2: 'rgba(255,255,255,0.08)',
        stroke: 'rgba(255,255,255,0.10)',
        stroke2: 'rgba(255,255,255,0.14)',
        text: 'rgba(255,255,255,0.92)',
        muted: 'rgba(255,255,255,0.62)',
        brand: '#7c5cff'
      },
      borderRadius: {
        xl: '18px',
        '2xl': '24px'
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.08), 0 20px 80px rgba(0,0,0,0.55)'
      }
    }
  },
  plugins: []
} satisfies Config

