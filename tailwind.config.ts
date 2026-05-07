import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue:  '#1C22FF',
          dark:  '#200000',
          cream: '#F6F4F2',
          gold:  '#B17404',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      keyframes: {
        'splash-logo': {
          '0%':   { opacity: '0', transform: 'scale(0.65)' },
          '55%':  { opacity: '1', transform: 'scale(1.06)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'splash-logo': 'splash-logo 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) 0.25s both',
      },
    },
  },
  plugins: [],
}
export default config
