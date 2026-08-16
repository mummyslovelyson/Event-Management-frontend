/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'tc-bg': '#1C232B',
        'tc-sidebar': '#161D22',
        'tc-card': '#242B32',
        'tc-text': '#EFEFF1',
        'tc-muted': '#949599',
        'tc-subtle': '#494F55',
        'tc-gold': '#D4AF37',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
