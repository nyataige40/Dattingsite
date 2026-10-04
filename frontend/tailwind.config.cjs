/** @type {import('@tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{jsx,js,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--color-primary))',
        'primary-50': 'rgb(var(--color-primary-100))',
        'primary-300': 'rgb(var(--color-primary-300))',
        'primary-500': 'rgb(var(--color-primary-500))',
        'primary-700': 'rgb(var(--color-primary-700))',
        'primary-900': 'rgb(var(--color-primary-900))',
        secondary: 'rgb(var(--color-secondary))',
        'secondary-500': 'rgb(var(--color-secondary-500))',
        'secondary-700': 'rgb(var(--color-secondary-700))',
        accent: 'rgb(var(--color-accent))',
        'accent-500': 'rgb(var(--color-accent-500))',
        bg: 'rgb(var(--color-bg))',
        'bg-alt': 'rgb(var(--color-bg-alt))',
        card: 'rgb(var(--color-card))',
        border: 'rgb(var(--color-border))',
        'text-secondary': 'rgb(var(--color-text-secondary))',
        success: 'rgb(var(--color-success))',
        overlay: 'rgba(var(--color-overlay))'
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        elevated: 'var(--shadow-elevated)'
      }
    }
  },
  plugins: []
}
