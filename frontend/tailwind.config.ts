import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0b1326',
        primary: {
          DEFAULT: '#e9c349',
          container: '#1f1700',
          fixed: '#ffe088',
          'fixed-dim': '#e9c349',
          on: '#3c2f00',
          'on-container': '#9d7d00',
          inverse: '#735c00',
        },
        secondary: {
          DEFAULT: '#4edea3',
          container: '#00a572',
          on: '#003824',
          'on-container': '#00311f',
        },
        tertiary: {
          DEFAULT: '#b9c7e0',
          container: '#09182a',
          on: '#233144',
        },
        error: {
          DEFAULT: '#ffb4ab',
          container: '#93000a',
          on: '#690005',
          'on-container': '#ffdad6',
        },
        surface: {
          DEFAULT: '#0b1326',
          dim: '#0b1326',
          bright: '#31394d',
          low: '#131b2e',
          base: '#171f33',
          high: '#222a3d',
          highest: '#2d3449',
          variant: '#2d3449',
          tint: '#e9c349',
        },
        'on-surface': '#dae2fd',
        'on-surface-variant': '#c6c6cd',
        'on-background': '#dae2fd',
        outline: {
          DEFAULT: '#909097',
          variant: '#45464d',
        },
      },
      fontFamily: {
        headline: ['"Newsreader"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        label: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '2px',
        md: '4px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
        full: '9999px',
      },
      boxShadow: {
        'gold-glow': '0 0 20px rgba(233, 195, 73, 0.4)',
        'gold-sm': '0 0 8px rgba(233, 195, 73, 0.3)',
        'panel': '0 4px 24px rgba(0, 0, 0, 0.4), 0 1px 4px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
} satisfies Config;
