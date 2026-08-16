/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'tc-bg': '#1E252B',
        'tc-sidebar': '#161D22',
        'tc-card': '#242B32',
        'tc-text': '#F2F4F5',
        'tc-muted': '#7D8387',
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
