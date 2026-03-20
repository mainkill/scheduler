/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans KR', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 20px 60px rgba(14, 116, 144, 0.25)',
      },
      backgroundImage: {
        aura:
          'radial-gradient(circle at 8% 10%, rgba(14, 165, 233, 0.2), transparent 38%), radial-gradient(circle at 88% 4%, rgba(251, 146, 60, 0.2), transparent 36%), radial-gradient(circle at 24% 90%, rgba(16, 185, 129, 0.2), transparent 34%)',
      },
    },
  },
  plugins: [],
};
