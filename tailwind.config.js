/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          900: '#0f1117',
          800: '#1a1c22',
          700: '#1e2028',
          600: '#242730',
          500: '#2b2e3a',
          400: '#363a48',
        },
        accent: {
          DEFAULT: '#4f8ef7',
          hover: '#6ba3ff',
          muted: '#3a6bc4',
        },
        compliant: '#22c55e',
        warning: '#f59e0b',
        noncompliant: '#ef4444',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
