/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'primary': '#F777F7',
        'secondary': '#000000',
        'tertiary': '#222222',
        'quaternary': '#333333',
        'quinary': '#444444',
      },
    },
  },
  plugins: [],
};
