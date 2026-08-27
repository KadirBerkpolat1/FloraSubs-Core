/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // FloraSubs v2.0 Endüstriyel Kurgu Stüdyosu Palette
        surface: '#070A0F',
        'surface-dim': '#070A0F',
        'surface-bright': '#1E283D',
        'surface-container-lowest': '#04060A',
        'surface-container-low': '#0E131F',
        'surface-container': '#141B2D',
        'surface-container-high': '#1A233A',
        'surface-container-highest': '#25314C',
        'on-surface': '#F8FAFC',
        'on-surface-variant': '#CBD5E1',
        'surface-variant': '#25314C',
        outline: '#64748B',
        'outline-variant': '#25314C',
        // Amber Primary Engine
        primary: '#F59E0B',
        'primary-container': '#D97706',
        'on-primary': '#070A0F',
        brand: '#F59E0B',
        'brand-hover': '#D97706',
        'amber-glow': 'rgba(245, 158, 11, 0.25)',
        // Accent Colors
        orange: {
          DEFAULT: '#FB923C',
          dark: '#EA580C',
        },
        cyan: {
          DEFAULT: '#06B6D4',
          dark: '#0891B2',
        },
        secondary: '#06B6D4',
        'secondary-container': '#0891B2',
        'ai-purple': '#A855F7',
        tertiary: '#FB923C',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#F43F5E',
        danger: '#F43F5E',
        // Backward-compatible flora aliases mapped to industrial palette
        flora: {
          bg: '#070A0F',
          card: '#141B2D',
          'card-hover': '#1A233A',
          border: '#25314C',
          accent: '#F59E0B',
          'accent-hover': '#D97706',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#F43F5E',
          'text-muted': '#64748B',
          'text-main': '#F8FAFC',
        }
      },
      spacing: {
        'sidebar-width': '260px',
        'toolbar-height': '48px',
        gutter: '12px',
      },
      fontSize: {
        'display-lg': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg': ['32px', { lineHeight: '40px', fontWeight: '600' }],
        'headline-md': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px' }],
        'body-md': ['14px', { lineHeight: '20px' }],
        'code-sm': ['12px', { lineHeight: '18px' }],
        'label-caps': ['11px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
}