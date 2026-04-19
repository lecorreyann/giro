export const colors = {
  bg: '#F7F7F8',
  surface: '#FFFFFF',
  surfaceMuted: '#F2F4F7',
  border: '#EAECF0',
  borderStrong: '#D0D5DD',
  text: '#101828',
  textMuted: '#667085',
  textFaint: '#98A2B3',
  accent: '#1570EF',
  success: '#12B76A',
  warning: '#F79009',
  danger: '#D92D20',
  dark: '#101828',
  darkMuted: '#344054',
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const type = {
  display: { fontSize: 28, fontWeight: '800' as const, color: colors.text, letterSpacing: -0.3 },
  h1: { fontSize: 22, fontWeight: '800' as const, color: colors.text, letterSpacing: -0.2 },
  h2: { fontSize: 17, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 15, fontWeight: '500' as const, color: colors.text },
  bodyStrong: { fontSize: 15, fontWeight: '700' as const, color: colors.text },
  small: { fontSize: 13, fontWeight: '500' as const, color: colors.textMuted },
  caps: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
  },
};
