/** Design tokens from PRD.md › "Design tokens". Analyzer screens only. */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/analyzer/**/*.{ts,tsx}'],
  // Preflight off so the existing Paytm home mockup keeps its hand-tuned CSS.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        primary: '#002970',
        accent: '#00BAF2',
        success: '#27AE60',
        warning: '#F2994A',
        danger: '#EB5757',
        background: '#F7F9FC',
        surface: '#FFFFFF',
        text: '#101010',
        muted: '#707070',
        border: '#E0F5FD',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      fontSize: {
        12: ['12px', '16px'],
        14: ['14px', '20px'],
        16: ['16px', '22px'],
        20: ['20px', '28px'],
        28: ['28px', '34px'],
      },
      borderRadius: { card: '16px', btn: '12px', chip: '999px' },
      boxShadow: { soft: '0 2px 8px rgba(0,41,112,0.08)' },
    },
  },
  plugins: [],
};
