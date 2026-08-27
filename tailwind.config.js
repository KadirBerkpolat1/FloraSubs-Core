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
        // FloraSubs v2.0 Monochrome Studio (Black & White Minimal Pro)
        surface: '#000000',
        'surface-dim': '#050505',
        'surface-bright': '#262626',
        'surface-container-lowest': '#000000',
        'surface-container-low': '#0a0a0a',
        'surface-container': '#121212',
        'surface-container-high': '#181818',
        'surface-container-highest': '#222222',
        'on-surface': '#ffffff',
        'on-surface-variant': '#a3a3a3',
        'surface-variant': '#1c1c1c',
        outline: '#404040',
        'outline-variant': '#262626',
        // Pure White High-Contrast Primary
        primary: '#ffffff',
        'primary-container': '#e5e5e5',
        'on-primary': '#000000',
        brand: '#ffffff',
        'brand-hover': '#e5e5e5',
        'white-glow': 'rgba(255, 255, 255, 0.15)',
        // Neutral secondary scale
        secondary: '#a3a3a3',
        'secondary-container': '#262626',
        'ai-purple': '#ffffff',
        tertiary: '#737373',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        danger: '#ef4444',
        // Backward-compatible flora aliases
        flora: {
          bg: '#000000',
          card: '#121212',
          'card-hover': '#181818',
          border: '#262626',
          accent: '#ffffff',
          'accent-hover': '#e5e5e5',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          'text-muted': '#737373',
          'text-main': '#ffffff',
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