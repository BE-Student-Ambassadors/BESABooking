/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      backgroundImage: {
        'be-pattern': "url('/BE_backdrop.png')",
      },
      colors: {
        'besaNavy': 'blue-900',         // navy blue
        'besaOrange': '#orange-300',       // orange
        'besaYellow': 'yellow-400',      // yellow
        'besaCyan': 'sky-500',        // cyan
        'besaDarkGray': 'gray-500',      // dark gray
        'besaLightGray': '#gray-300',     // light gray
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],      // body text
        // Thin - 'font-thin'
        //Light - 'font-light'
        // Regular - 'font-normal'
        // Medium - 'font-medium'
        //Bold - 'font-bold'
        //Black - 'font-black'
      },
    },
  },
  plugins: [],
};
