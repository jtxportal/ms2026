/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // MS 2026 téma
        wc: {
          navy:  '#04091c',
          dark:  '#080f28',
          card:  'rgba(255,255,255,0.06)',
          gold:  '#e8a020',
          teal:  '#00b4c8',
          red:   '#c41230',
        },
        pitch: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        condensed: ["'Barlow Condensed'", "'Arial Narrow'", 'Arial', 'sans-serif'],
      }
    }
  },
  plugins: []
}
