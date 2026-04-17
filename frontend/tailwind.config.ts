import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#F8FAFC',
        primary: {
          DEFAULT: '#1E293B',
          dim: '#334155',
          container: '#E2E8F0',
          fixed: '#E2E8F0',
          'fixed-dim': '#CBD5E1',
          on: '#F8FAFC',
          'on-container': '#334155',
          inverse: '#F1F5F9',
        },
        secondary: {
          DEFAULT: '#75777D',
          container: '#E2E8F0',
          on: '#F8FAFC',
          'on-container': '#334155',
        },
        tertiary: {
          DEFAULT: '#757491',
          container: '#E8E7F4',
          on: '#F8F7FF',
        },
        error: {
          DEFAULT: '#9f403d',
          container: '#fe8983',
          on: '#fff7f6',
          'on-container': '#752121',
        },
        surface: {
          DEFAULT: '#F8FAFC',
          dim: '#CBD5E1',
          bright: '#F8FAFC',
          low: '#F1F5F9',
          base: '#E2E8F0',
          high: '#CBD5E1',
          highest: '#B0BEC5',
          variant: '#E2E8F0',
          tint: '#1E293B',
          'container-lowest': '#ffffff',
        },
        'on-surface': '#1E293B',
        'on-surface-variant': '#334155',
        'on-background': '#1E293B',
        outline: {
          DEFAULT: '#64748B',
          variant: '#94A3B8',
        },
      },
      fontFamily: {
        headline: ['"Manrope"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        label: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        full: '9999px',
      },
      boxShadow: {
        'primary-glow': '0 0 20px rgba(84, 95, 115, 0.15)',
        'primary-sm': '0 0 8px rgba(84, 95, 115, 0.10)',
        'panel': '0 4px 32px rgba(42, 52, 57, 0.08), 0 1px 4px rgba(42, 52, 57, 0.04)',
      },
    },
  },
  plugins: [],
} satisfies Config;
