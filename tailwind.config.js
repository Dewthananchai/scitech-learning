/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        fun: {
          pink: '#ff6b9d',
          orange: '#ffa726',
          yellow: '#ffee58',
          green: '#66bb6a',
          teal: '#26c6da',
          blue: '#42a5f5',
          purple: '#ab47bc',
        }
      },
      fontFamily: {
        kid: ['"Noto Sans Thai Looped"', 'sans-serif'],
        thai: ['"Noto Sans Thai Looped"', 'sans-serif'],
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'slide-in': 'slideIn 0.25s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pop': 'pop 0.3s ease-out',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pop: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideIn: {
          'from': { transform: 'translateX(-100%)' },
          'to': { transform: 'translateX(0)' },
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
      },
      boxShadow: {
        'fun': '0 8px 30px rgba(59, 130, 246, 0.12)',
        'fun-lg': '0 12px 40px rgba(59, 130, 246, 0.18)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.3)',
      }
    },
  },
  plugins: [],
}
