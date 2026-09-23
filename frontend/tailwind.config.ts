import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        coeur: {
          50: '#fff1f3',
          100: '#ffe0e5',
          500: '#e11d48',
          600: '#be123c',
          700: '#9f1239',
        },
      },
    },
  },
  plugins: [],
};

export default config;
