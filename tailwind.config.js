/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/ui/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Industrial Dark Theme
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        // Safety Orange
        safety: {
          50: 'var(--orange-50)',
          100: 'var(--orange-100)',
          200: 'var(--orange-200)',
          300: 'var(--orange-300)',
          400: 'var(--orange-400)',
          500: 'var(--orange-500)',
          600: 'var(--orange-600)',
          700: 'var(--orange-700)',
          800: 'var(--orange-800)',
          900: 'var(--orange-900)',
        },
        // Difficulty Colors
        beginner: 'var(--beginner)',
        advanced: 'var(--advanced)',
        extreme: 'var(--extreme)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
      },
      animation: {
        'shimmer': 'shimmer 1.5s infinite linear',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'slide-in': 'slideIn 0.3s ease-out forwards',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'pulse-slow': 'pulse 2s ease-in-out infinite',
        'bounce-subtle': 'bounce 1s ease-in-out infinite',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
    },
  },
  plugins: [],
}
