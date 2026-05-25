/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sys: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        ios: {
          bg: '#f2f2f7',
          bgDark: '#000000',
          card: '#ffffff',
          cardDark: '#1c1c1e',
          sep: '#c6c6c8',
          sepDark: '#38383a',
          accent: '#0a84ff',
          danger: '#ff3b30',
          success: '#34c759',
          warn: '#ff9500',
          muted: '#8e8e93',
        },
      },
      boxShadow: {
        ios: '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
};
