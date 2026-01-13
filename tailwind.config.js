/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#F5F7FA', // Light BG
          100: '#E1F0FA',
          300: '#CCE5F6',
          500: '#0070BA', // Action Blue
          600: '#005EA6',
          800: '#003087', // Primary Navy
          900: '#001C64', // Deep Navy (2026 Header)
          dark: '#142c8e',
          success: '#00CF92', // 2026 Green
        }
      },
      boxShadow: {
        'card': '0 0 24px rgba(0,0,0,0.06)',
        'input': 'inset 0 0 0 1px #9CA3AF',
        'input-focus': 'inset 0 0 0 2px #0070BA',
        'input-error': 'inset 0 0 0 2px #D92D20',
        'button': '0 4px 12px rgba(0, 48, 135, 0.15)',
      },
      animation: {
        'progress': 'width 1.5s ease-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
