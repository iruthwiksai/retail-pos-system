/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dmart: {
          green: '#007A3D',
          darkgreen: '#00582B',
          lightgreen: '#E8F5E9',
          yellow: '#FFB800',
          orange: '#FF6F00',
        }
      }
    },
  },
  plugins: [],
}
