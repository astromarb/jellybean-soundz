/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        jellybean: {
          red: '#FF3B5C',
          orange: '#FF7A00',
          amber: '#FFB800',
          yellow: '#FFE500',
          lime: '#A8FF00',
          green: '#00FF7A',
          emerald: '#00FFBF',
          teal: '#00E5FF',
          cyan: '#00C8FF',
          sky: '#0095FF',
          blue: '#0055FF',
          indigo: '#4400FF',
          violet: '#7700FF',
          purple: '#AA00FF',
          pink: '#FF00CC',
          rose: '#FF0080',
        },
      },
      boxShadow: {
        'glow-red': '0 0 20px rgba(255, 59, 92, 0.6)',
        'glow-orange': '0 0 20px rgba(255, 122, 0, 0.6)',
        'glow-yellow': '0 0 20px rgba(255, 229, 0, 0.6)',
        'glow-green': '0 0 20px rgba(0, 255, 122, 0.6)',
        'glow-blue': '0 0 20px rgba(0, 85, 255, 0.6)',
        'glow-purple': '0 0 20px rgba(170, 0, 255, 0.6)',
        'glow-pink': '0 0 20px rgba(255, 0, 204, 0.6)',
      },
    },
  },
  plugins: [],
}
