/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        nature: {
          50: '#f2f8f4',
          100: '#e0efe6',
          200: '#c2ddcf',
          300: '#97c3ad',
          400: '#66a284',
          500: '#438563',
          600: '#326b4f',
          700: '#295640',
          800: '#234534',
          900: '#1e392c',
          950: '#0f2017',
        },
        clay: {
          50: '#faf6f0',
          100: '#f3e9d8',
          200: '#e6d2b4',
          300: '#d7b687',
          400: '#c7985f',
          500: '#bb8347',
          600: '#a66d3b',
          700: '#885432',
          800: '#6f442f',
          900: '#5d392b',
        },
        sky: {
          50: '#f0f7fb',
          100: '#daeef5',
          200: '#b8dcec',
          300: '#88c4dc',
          400: '#54a4c6',
          500: '#3689ad',
          600: '#2c6f91',
          700: '#295a76',
          800: '#2a4d63',
          900: '#284154',
        },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 8px 24px -6px rgb(0 0 0 / 0.08), 0 2px 6px -2px rgb(0 0 0 / 0.04)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
};
