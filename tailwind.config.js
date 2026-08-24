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
        // Stitch Material 3 Dark Theme Palette
        surface: '#0b1326',
        'surface-dim': '#0b1326',
        'surface-bright': '#31394d',
        'surface-container-lowest': '#060e20',
        'surface-container-low': '#131b2e',
        'surface-container': '#171f33',
        'surface-container-high': '#222a3d',
        'surface-container-highest': '#2d3449',
        'on-surface': '#dae2fd',
        'on-surface-variant': '#c2c6d6',
        'surface-variant': '#2d3449',
        outline: '#8c909f',
        'outline-variant': '#424754',
        primary: '#adc6ff',
        'primary-container': '#4d8eff',
        'on-primary': '#002e6a',
        brand: '#3b82f6',
        secondary: '#ddb7ff',
        'secondary-container': '#6f00be',
        'ai-purple': '#a855f7',
        tertiary: '#ffb786',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ffb4ab',
        danger: '#f43f5e',
        // Flora aliases for backward compat
        flora: {
          bg: '#0b1326',
          card: '#171f33',
          'card-hover': '#1e1f26',
          border: '#242938',
          accent: '#3b82f6',
          'accent-hover': '#2563eb',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          'text-muted': '#8b949e',
          'text-main': '#dae2fd',
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