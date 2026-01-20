/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts}",
  ],
  safelist: [
    'w-28',
    'w-full',
    'h-full',
    'min-h-screen',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
      },
      colors: {
        'pp-navy': '#001C64',
        'pp-blue': '#0070BA',
        'pp-blue-hover': '#005EA6',
        'pp-bg': '#F5F7FA',
        'pp-success': '#00CF92',
        brand: {
          50: '#F5F7FA',
          100: '#E1F0FA',
          300: '#CCE5F6',
          500: '#0070BA',
          600: '#005EA6',
          800: '#003087',
          900: '#001C64',
          dark: '#142c8e',
          success: '#00CF92',
        }
      },
      borderRadius: {
        'card': '24px',
        'pill': '500px', // Large value for pill shape
      },
      boxShadow: {
        'card': '0 0 24px rgba(0,0,0,0.04)',
        'input': 'inset 0 0 0 1px #9CA3AF',
        'input-focus': 'inset 0 0 0 2px #0070BA',
        'input-error': 'inset 0 0 0 2px #D92D20',
        'button': '0 4px 12px rgba(0, 48, 135, 0.15)',
      },
      animation: {
        'progress': 'width 1.5s ease-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'slide-in-right': 'slideInRight 0.4s ease-out forwards',
        'skeleton': 'shimmer 2s infinite linear',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' }
        }
      }
    },
  },
  plugins: [],
}
