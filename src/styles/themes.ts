// Sistema Completo de Design Tokens - Fintech Premium (Dark & Light)

export const darkTokens = {
  // Cores de Superfície (Preto levemente azulado, superfícies sutis)
  background: '#080B0F',
  backgroundElevated: '#0D1117',
  card: '#111720',
  surfaceInteractive: '#171E28',
  surfaceSubtle: 'rgba(255, 255, 255, 0.04)',

  // Bordas e Divisores
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.14)',
  divider: 'rgba(255, 255, 255, 0.06)',

  // Tipografia
  textPrimary: '#F5F7FA',
  textSecondary: '#98A2B3',
  textTertiary: '#667085',
  textInverse: '#080B0F',

  // Acentos Semânticos
  primary: '#2997FF',
  primaryPressed: '#147BD1',
  primaryTonal: 'rgba(41, 151, 255, 0.12)',
  primaryTonalBorder: 'rgba(41, 151, 255, 0.24)',

  positive: '#32D583',
  positiveTonal: 'rgba(50, 213, 131, 0.12)',
  positiveTonalBorder: 'rgba(50, 213, 131, 0.24)',

  negative: '#F97066',
  negativeTonal: 'rgba(249, 112, 102, 0.12)',
  negativeTonalBorder: 'rgba(249, 112, 102, 0.24)',

  warning: '#FDB022',
  warningTonal: 'rgba(253, 176, 34, 0.12)',
  warningTonalBorder: 'rgba(253, 176, 34, 0.24)',

  // Card Especial (Consultoria IA Ativa - azul profundo discreto sem neon)
  aiCardBg: '#0D1929',
  aiCardBorder: 'rgba(41, 151, 255, 0.20)',
  aiCardMetricBg: 'rgba(255, 255, 255, 0.04)',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.70)',

  // Status Bar
  statusBarStyle: 'light' as const,
  navBarBg: '#0D1117',
};

export const lightTokens = {
  // Cores de Superfície (Neutro refinado, sem branco puro em áreas amplas)
  background: '#F4F6F8',
  backgroundElevated: '#FFFFFF',
  card: '#FFFFFF',
  surfaceInteractive: '#F0F3F7',
  surfaceSubtle: 'rgba(16, 24, 40, 0.03)',

  // Bordas e Divisores
  border: 'rgba(16, 24, 40, 0.08)',
  borderStrong: 'rgba(16, 24, 40, 0.14)',
  divider: 'rgba(16, 24, 40, 0.06)',

  // Tipografia
  textPrimary: '#101828',
  textSecondary: '#475467',
  textTertiary: '#667085',
  textInverse: '#FFFFFF',

  // Acentos Semânticos
  primary: '#147BD1',
  primaryPressed: '#0D5C9E',
  primaryTonal: 'rgba(20, 123, 209, 0.10)',
  primaryTonalBorder: 'rgba(20, 123, 209, 0.22)',

  positive: '#079455',
  positiveTonal: 'rgba(7, 148, 85, 0.10)',
  positiveTonalBorder: 'rgba(7, 148, 85, 0.22)',

  negative: '#D92D20',
  negativeTonal: 'rgba(217, 45, 32, 0.10)',
  negativeTonalBorder: 'rgba(217, 45, 32, 0.22)',

  warning: '#DC6803',
  warningTonal: 'rgba(220, 104, 3, 0.10)',
  warningTonalBorder: 'rgba(220, 104, 3, 0.22)',

  // Card Especial (Consultoria IA Ativa - azul claro sofisticado)
  aiCardBg: '#EFF6FF',
  aiCardBorder: 'rgba(20, 123, 209, 0.18)',
  aiCardMetricBg: 'rgba(255, 255, 255, 0.70)',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.50)',

  // Status Bar
  statusBarStyle: 'dark' as const,
  navBarBg: '#FFFFFF',
};

// Tokens Compartilhados (Espaçamento, Radius, Tipografia, Elevação)
export const sharedTokens = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  radius: {
    sm: 8,
    md: 12,
    control: 14,
    card: 18,
    modal: 22,
    full: 9999,
  },
  typography: {
    hero: {
      fontSize: 32,
      fontWeight: '800' as const,
      letterSpacing: -1,
    },
    screenTitle: {
      fontSize: 26,
      fontWeight: '800' as const,
      letterSpacing: -0.6,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      letterSpacing: -0.3,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      letterSpacing: -0.2,
    },
    bodyLarge: {
      fontSize: 16,
      fontWeight: '500' as const,
    },
    bodyMedium: {
      fontSize: 15,
      fontWeight: '400' as const,
    },
    bodySmall: {
      fontSize: 13,
      fontWeight: '400' as const,
    },
    label: {
      fontSize: 12,
      fontWeight: '600' as const,
      letterSpacing: 0.4,
      textTransform: 'uppercase' as const,
    },
    numericTabular: {
      fontVariant: ['tabular-nums' as const],
    },
  },
  layout: {
    screenMargin: 20,
    minTouchTarget: 44,
    minControlHeight: 48,
  },
};

// Para compatibilidade com referências existentes:
export const lightTheme = {
  ...lightTokens,
  cardBackground: lightTokens.card,
  text: lightTokens.textPrimary,
};

export const darkTheme = {
  ...darkTokens,
  cardBackground: darkTokens.card,
  text: darkTokens.textPrimary,
};

export type ThemeTokens = Omit<typeof darkTokens, 'statusBarStyle'> & {
  statusBarStyle: 'light' | 'dark';
};
export type Theme = typeof lightTheme;

export const getThemeTokens = (theme: 'light' | 'dark'): ThemeTokens =>
  theme === 'dark' ? darkTokens : lightTokens;