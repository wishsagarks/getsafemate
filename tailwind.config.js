/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        spotlight: "spotlight 2s ease .75s 1 forwards",
      },
      keyframes: {
        spotlight: {
          "0%": {
            opacity: 0,
            transform: "translate(-72%, -62%) scale(0.5)",
          },
          "100%": {
            opacity: 1,
            transform: "translate(-50%,-40%) scale(1)",
          },
        },
      },
      backgroundImage: {
        "dot-thick-neutral-300": "radial-gradient(circle, #d4d4d8 1px, transparent 1px)",
        "dot-thick-neutral-800": "radial-gradient(circle, #404040 1px, transparent 1px)",
        "dot-thick-indigo-500": "radial-gradient(circle, #6366f1 1px, transparent 1px)",
      },
      backgroundSize: {
        "dot-thick": "20px 20px",
      },
    },
  },
  plugins: [],
};