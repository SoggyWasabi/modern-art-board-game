// Modern Art - Premium Design System
// Inspired by luxury board game interfaces and modern web design trends

export const colors = {
  // Primary brand palette - deep, rich colors
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },

  // Luxury accents
  accent: {
    gold: '#fbbf24',
    goldDark: '#f59e0b',
    silver: '#e5e7eb',
    bronze: '#d97706',
    crystal: '#f0f9ff',
  },

  // Premium gradients
  gradients: {
    primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    luxury: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    ocean: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    sunset: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    forest: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    midnight: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    aurora: 'linear-gradient(135deg, #00c6fb 0%, #005bea 100%)',
    // Dark mode gradients
    darkLuxury: 'linear-gradient(135deg, #1a1c20 0%, #2d3436 100%)',
    darkOcean: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    royal: 'linear-gradient(135deg, #141e30 0%, #243b55 100%)',
  },

  // Artist color schemes - enhanced and more vibrant
  artists: {
    'Manuel Carvalho': {
      primary: '#ff6b35',
      secondary: '#f7931e',
      accent: '#ff9558',
      gradient: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
      glow: 'rgba(255, 107, 53, 0.3)',
    },
    'Sigrid Thaler': {
      primary: '#4ecdc4',
      secondary: '#44a08d',
      accent: '#95e1d3',
      gradient: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
      glow: 'rgba(78, 205, 196, 0.3)',
    },
    'Daniel Melim': {
      primary: '#95e77e',
      secondary: '#68b665',
      accent: '#a8e063',
      gradient: 'linear-gradient(135deg, #95e77e 0%, #68b665 100%)',
      glow: 'rgba(149, 231, 126, 0.3)',
    },
    'Ramon Martins': {
      primary: '#a8e6cf',
      secondary: '#7fcdbb',
      accent: '#b4f7ce',
      gradient: 'linear-gradient(135deg, #a8e6cf 0%, #7fcdbb 100%)',
      glow: 'rgba(168, 230, 207, 0.3)',
    },
    'Rafael Silveira': {
      primary: '#ff8cc3',
      secondary: '#ff6fab',
      accent: '#ffb3d9',
      gradient: 'linear-gradient(135deg, #ff8cc3 0%, #ff6fab 100%)',
      glow: 'rgba(255, 140, 195, 0.3)',
    },
  },

  // Auction type colors
  auctionTypes: {
    open: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    one_offer: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    hidden: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
    fixed_price: 'linear-gradient(135deg, #f2994a 0%, #f2c94c 100%)',
    double: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
  },

  // Neutral palette with warm undertones
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },

  // Status colors
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
}

// Typography system
export const typography = {
  fontFamily: {
    display: '"Playfair Display", "Georgia", serif',
    body: '"Inter", "Helvetica Neue", sans-serif',
    mono: '"Fira Code", "Monaco", monospace',
  },

  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem',
    '7xl': '4.5rem',
    '8xl': '6rem',
  },

  fontWeight: {
    thin: 100,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },

  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
}

// Spacing system
export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  32: '8rem',
  40: '10rem',
  48: '12rem',
  56: '14rem',
  64: '16rem',
}

// Advanced shadows and effects
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',

  // Premium colored shadows
  glow: {
    primary: '0 0 20px rgba(99, 102, 241, 0.3)',
    gold: '0 0 30px rgba(251, 191, 36, 0.4)',
    success: '0 0 20px rgba(16, 185, 129, 0.3)',
    danger: '0 0 20px rgba(239, 68, 68, 0.3)',
  },

  // Card-specific shadows
  card: {
    rest: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    hover: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    selected: '0 0 30px rgba(99, 102, 241, 0.3), 0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
}

// Animation settings
export const animations = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '1000ms',
  },

  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Keyframe definitions
  keyframes: {
    float: 'animation: float 3s ease-in-out infinite;',
    pulse: 'animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;',
    spin: 'animation: spin 1s linear infinite;',
    bounce: 'animation: bounce 1s infinite;',
    fadeIn: 'animation: fadeIn 0.5s ease-in-out;',
    slideUp: 'animation: slideUp 0.5s ease-out;',
    shimmer: 'animation: shimmer 2s linear infinite;',
    glow: 'animation: glow 2s ease-in-out infinite alternate;',
  },
}

// Breakpoints
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}

// Border radius
export const borderRadius = {
  none: '0',
  sm: '0.125rem',
  base: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
}

// Z-index scale
export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
}

// Premium theme presets
export const themes = {
  luxury: {
    background: colors.gradients.darkLuxury,
    card: 'rgba(255, 255, 255, 0.05)',
    cardHover: 'rgba(255, 255, 255, 0.1)',
    text: colors.neutral[50],
    textSecondary: colors.neutral[300],
    border: 'rgba(255, 255, 255, 0.1)',
    primary: colors.accent.gold,
    shadow: shadows.glow.gold,
  },

  ocean: {
    background: colors.gradients.ocean,
    card: 'rgba(255, 255, 255, 0.1)',
    cardHover: 'rgba(255, 255, 255, 0.2)',
    text: '#ffffff',
    textSecondary: '#e0f2fe',
    border: 'rgba(255, 255, 255, 0.2)',
    primary: colors.primary[400],
    shadow: shadows.glow.primary,
  },

  aurora: {
    background: colors.gradients.aurora,
    card: 'rgba(255, 255, 255, 0.1)',
    cardHover: 'rgba(255, 255, 255, 0.15)',
    text: '#ffffff',
    textSecondary: '#bfdbfe',
    border: 'rgba(255, 255, 255, 0.15)',
    primary: colors.accent.crystal,
    shadow: shadows.glow.primary,
  },
}

// Game-specific dimensions
export const gameDimensions = {
  card: {
    width: {
      sm: '60px',
      md: '80px',
      lg: '120px',
      xl: '160px',
    },
    height: {
      sm: '90px',
      md: '120px',
      lg: '180px',
      xl: '240px',
    },
    aspectRatio: '2/3',
  },

  board: {
    maxWidth: '1200px',
    padding: '2rem',
  },

  hand: {
    spacing: '0.5rem',
    fanAngle: '30deg',
  },
}

// Export default theme
export const defaultTheme = {
  ...themes.luxury,
  colors,
  typography,
  spacing,
  shadows,
  animations,
  borderRadius,
  zIndex,
}