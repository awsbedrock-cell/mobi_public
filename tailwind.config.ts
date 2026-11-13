import type { Config } from 'tailwindcss'

/** Maps a CSS variable holding an "R G B" triplet (see src/styles/tokens.css) to a Tailwind color. */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: token('color-primary'),
          hover: token('color-primary-hover'),
          active: token('color-primary-active'),
          soft: token('color-primary-soft'),
          muted: token('color-primary-muted'),
          fg: token('color-primary-fg'),
        },
        secondary: {
          DEFAULT: token('color-secondary'),
          soft: token('color-secondary-soft'),
          fg: token('color-secondary-fg'),
        },
        bg: {
          DEFAULT: token('color-bg'),
          subtle: token('color-bg-subtle'),
        },
        surface: {
          DEFAULT: token('color-surface'),
          raised: token('color-surface-raised'),
          muted: token('color-surface-muted'),
        },
        text: {
          DEFAULT: token('color-text'),
          muted: token('color-text-muted'),
          subtle: token('color-text-subtle'),
          inverse: token('color-text-inverse'),
        },
        border: {
          DEFAULT: token('color-border'),
          strong: token('color-border-strong'),
        },
        success: { DEFAULT: token('color-success'), soft: token('color-success-soft') },
        warning: { DEFAULT: token('color-warning'), soft: token('color-warning-soft') },
        error: { DEFAULT: token('color-error'), soft: token('color-error-soft') },
        info: { DEFAULT: token('color-info'), soft: token('color-info-soft') },
        btn: {
          primary: token('btn-primary-bg'),
          'primary-hover': token('btn-primary-bg-hover'),
          'primary-fg': token('btn-primary-fg'),
          secondary: token('btn-secondary-bg'),
          'secondary-hover': token('btn-secondary-bg-hover'),
          'secondary-fg': token('btn-secondary-fg'),
          danger: token('btn-danger-bg'),
          'danger-fg': token('btn-danger-fg'),
        },
        field: {
          DEFAULT: token('input-bg'),
          border: token('input-border'),
          focus: token('input-focus'),
          placeholder: token('input-placeholder'),
        },
        table: {
          head: token('table-head-bg'),
          'head-fg': token('table-head-fg'),
          hover: token('table-row-hover'),
          border: token('table-border'),
        },
        overlay: token('color-overlay'),
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
      },
      borderRadius: {
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        pop: 'var(--shadow-pop)',
        brand: 'var(--shadow-brand)',
      },
    },
  },
  plugins: [],
} satisfies Config
