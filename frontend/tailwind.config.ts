import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', ...defaultTheme.fontFamily.sans],
      },
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
