import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#030712',
        card: '#111827',
        'input-bg': '#1F2937',
        'text-primary': '#FFFFFF',
        'text-secondary': '#F3F4F6',
        'text-muted': '#9CA3AF',
        severity: {
          critical: '#E24B4A',
          'critical-bg': 'rgba(226,75,74,0.12)',
          'critical-text': '#F09595',
          major: '#EF9F27',
          'major-bg': 'rgba(239,159,39,0.12)',
          'major-text': '#FAC775',
          minor: '#97C459',
          'minor-bg': 'rgba(151,196,89,0.12)',
          'minor-text': '#C0DD97',
          info: '#378ADD',
          'info-bg': 'rgba(55,138,221,0.12)',
          'info-text': '#85B7EB',
        },
        score: {
          a: '#4ADE80',
          'a-bg': '#04342C',
          b: '#378ADD',
          'b-bg': '#042C53',
          c: '#EF9F27',
          'c-bg': '#412402',
          f: '#E24B4A',
          'f-bg': '#501313',
        },
      },
      borderRadius: {
        card: '10px',
        pill: '6px',
      },
      fontSize: {
        base: '13px',
        'card-title': '15px',
        'page-title': '18px',
      },
      fontFamily: {
        sans: ["'Figtree'", '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        display: ["'Familjen Grotesk'", '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ["'JetBrains Mono'", "'SF Mono'", 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
