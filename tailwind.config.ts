import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#e8edff',
          500: '#5b6cff',
          600: '#4a5ae0',
          700: '#3a47b8',
        },
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'PingFang SC',
          'Microsoft YaHei',
          'Segoe UI',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
