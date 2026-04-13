/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        display: ['Clash Display', 'Space Grotesk', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0edff',
          100: '#e0d9ff',
          200: '#c2b4ff',
          300: '#a48eff',
          400: '#8669ff',
          500: '#6843ff',
          600: '#5535cc',
          700: '#422899',
          800: '#2e1a66',
          900: '#1b0d33',
        },
        neon: {
          green: '#00ff88',
          pink: '#ff2d78',
          blue: '#00d4ff',
          yellow: '#ffd60a',
          orange: '#ff6b35',
        },
      },
      animation: {
        'bounce-in': 'bounceIn 0.6s cubic-bezier(0.36,0.07,0.19,0.97)',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.22,1,0.36,1)',
        'fade-in': 'fadeIn 0.3s ease',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'ping-slow': 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'count-down': 'countDown 1s ease-in-out',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.22,1,0.36,1)',
        'slide-right': 'slideRight 0.4s cubic-bezier(0.22,1,0.36,1)',
        'ticker': 'ticker 0.5s cubic-bezier(0.22,1,0.36,1)',
      },
      keyframes: {
        bounceIn: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '60%': { transform: 'scale(1.2)' },
          '80%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        glow: {
          from: { boxShadow: '0 0 20px rgba(104,67,255,0.4)' },
          to: { boxShadow: '0 0 40px rgba(104,67,255,0.8), 0 0 80px rgba(104,67,255,0.3)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        countDown: {
          '0%': { transform: 'scale(1.5)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scaleIn: {
          from: { transform: 'scale(0.92)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        slideRight: {
          from: { transform: 'translateX(-16px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        ticker: {
          from: { transform: 'translateY(-100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='.04'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}
