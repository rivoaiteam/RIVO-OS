/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        coral: {
          50: '#fff5f2',
          100: '#ffe8e1',
          200: '#ffd5c8',
          300: '#ffb8a3',
          400: '#ff8f6d',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        navy: {
          900: '#0a1628',
          800: '#111d32',
          700: '#1a2942',
          600: '#243553',
        },
        active: {
          bg: '#eff6ff',
          border: '#3b82f6',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'sidebar': '240px',
        'sidebar-collapsed': '64px',
        'header': '56px',
        'page-header': '64px',
        'side-panel': '420px',
      },
      boxShadow: {
        'sidebar': '1px 0 3px rgba(0, 0, 0, 0.05)',
        'panel': '-4px 0 16px rgba(0, 0, 0, 0.08)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
        'slide-out': 'slideOut 0.2s ease-in',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOut: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
