/**
 * Premium Theme Configuration
 * Paleta de colores inspirada en aerolíneas premium (Emirates, Singapore Airlines, Qatar Airways)
 */

export const theme = {
  colors: {
    light: {
      // Blancos y azules claros
      background: '#FFFFFF',
      surface: '#F8FAFC',
      surfaceElevated: '#FFFFFF',
      primary: '#0066CC',
      primaryDark: '#003366',
      primaryLight: '#E6F2FF',
      primaryLighter: '#B3D9FF',
      secondary: '#003366',
      accent: '#0066CC',
      text: '#1A1A1A',
      textSecondary: '#4A5568',
      textMuted: '#718096',
      border: '#E2E8F0',
      borderLight: '#F1F5F9',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#0066CC',
    },
    dark: {
      // Azules oscuros y negro
      background: '#000000',
      surface: '#001122',
      surfaceElevated: '#003366',
      primary: '#0066CC',
      primaryDark: '#001122',
      primaryLight: '#003366',
      primaryLighter: '#004488',
      secondary: '#003366',
      accent: '#0066CC',
      text: '#FFFFFF',
      textSecondary: '#E2E8F0',
      textMuted: '#A0AEC0',
      border: '#1A202C',
      borderLight: '#2D3748',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#0066CC',
    },
  },
  gradients: {
    light: {
      primary: 'linear-gradient(135deg, #0066CC 0%, #003366 100%)',
      surface: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
      hero: 'linear-gradient(135deg, #E6F2FF 0%, #B3D9FF 50%, #FFFFFF 100%)',
    },
    dark: {
      primary: 'linear-gradient(135deg, #0066CC 0%, #001122 100%)',
      surface: 'linear-gradient(180deg, #000000 0%, #001122 100%)',
      hero: 'linear-gradient(135deg, #001122 0%, #003366 50%, #000000 100%)',
    },
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    premium: '0 25px 50px -12px rgba(0, 102, 204, 0.25)',
    dark: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
    '2xl': '4rem',
    '3xl': '6rem',
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
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
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    lineHeight: {
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
  },
  transitions: {
    fast: '150ms ease-in-out',
    normal: '300ms ease-in-out',
    slow: '500ms ease-in-out',
    bounce: '300ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

export type Theme = typeof theme;

