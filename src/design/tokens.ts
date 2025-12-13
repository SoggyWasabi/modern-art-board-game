// ===================
// DESIGN TOKENS
// ===================

export const tokens = {
  colors: {
    brand: {
      primary: {
        50: '#fef3e2',
        100: '#fdeacb',
        200: '#fbd7a3',
        300: '#f8bb6b',
        400: '#f59e0b',
        500: '#d97706',
        600: '#b45309',
        700: '#92400e',
        800: '#78350f',
        900: '#451a03'
      },
      secondary: {
        50: '#f0f9ff',
        100: '#e0f2fe',
        200: '#bae6fd',
        300: '#7dd3fc',
        400: '#38bdf8',
        500: '#0ea5e9',
        600: '#0284c7',
        700: '#0369a1',
        800: '#075985',
        900: '#0c4a6e'
      },
      accent: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#22c55e',
        600: '#16a34a',
        700: '#15803d',
        800: '#166534',
        900: '#14532d',
      }
    },
    neutral: {
      gray: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827'
      },
      white: '#ffffff',
      black: '#000000',
    },
    semantic: {
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    // Artist-specific colors
    artists: {
      'Manuel Carvalho': {
        50: '#fef3e2',
        500: '#f59e0b',
        900: '#78350f',
      },
      'Sigrid Thaler': {
        50: '#f0f9ff',
        500: '#0ea5e9',
        900: '#0c4a6e',
      },
      'Daniel Melim': {
        50: '#fef2f2',
        500: '#ef4444',
        900: '#7f1d1d',
      },
      'Ramon Martins': {
        50: '#f0fdf4',
        500: '#22c55e',
        900: '#14532d',
      },
      'Rafael Silveira': {
        50: '#faf5ff',
        500: '#a855f7',
        900: '#581c87',
      },
    }
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
    '4xl': '96px',
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      display: ['Playfair Display', 'Georgia', 'serif'],
      mono: ['JetBrains Mono', 'Consolas', 'monospace'],
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
      '4xl': '36px',
      '5xl': '48px',
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    card: '0 8px 16px -4px rgba(0, 0, 0, 0.15)',
    table: 'inset 0 0 40px rgba(0, 0, 0, 0.2)',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
    full: '9999px',
  },
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  // Game-specific tokens
  game: {
    cardDimensions: {
      sm: { width: '60px', height: '84px' },
      md: { width: '120px', height: '168px' },
      lg: { width: '200px', height: '280px' },
    },
    tableGreen: '#065f46',
    playerCount: [3, 4, 5] as const,
  },
}

// Export type helpers
export type ColorShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
export type Spacing = keyof typeof tokens.spacing
export type FontSize = keyof typeof tokens.typography.fontSize
export type CardSize = 'sm' | 'md' | 'lg'