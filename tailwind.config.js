/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        animex: {
          blue: {
            50: '#EFF6FF',
            100: '#DBEAFE',
            600: '#0F4C81',
            700: '#0C3B66',
            800: '#0A2F52',
            900: '#07223D',
          },
          orange: {
            400: '#FB923C',
            500: '#F97316',
            600: '#EA580C',
          },
          green: {
            500: '#22C55E',
            600: '#166534',
          }
        }
      }
    },
  },
  plugins: [],
}
