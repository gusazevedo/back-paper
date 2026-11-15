import { DefaultTheme, Theme } from '@react-navigation/native';
import { TextStyle } from 'react-native';

/** Design tokens taken from the BackPapers design (claude-design). Light theme only. */
export const colors = {
  background: '#F5F5F2',
  surface: '#FFFFFF',
  surfaceMuted: '#E8E8E3',
  placeholder: '#E6E6E1',
  text: '#161614',
  textMuted: '#5E5E59',
  textOnDark: '#FFFFFF',
  primary: '#161614',
  border: '#DCDCD6',
  borderStrong: '#C9C9C2',
  borderDashed: '#A9A9A2',
  divider: '#E8E8E3',
  danger: '#B3261E',
  dangerSoft: '#D43D22',
  dangerSurface: '#FBEEEA',
  dangerText: '#8C1D18',
  hairline: '#E2E2DD',
  track: '#DCDCD6',
  overlay: 'rgba(22, 22, 20, 0.4)',
  shadow: '#161614',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const radii = {
  tile: 14,
  field: 14,
  button: 16,
  card: 18,
  nav: 22,
  sheet: 24,
  preview: 20,
  panel: 22,
  notice: 12,
  pill: 999,
};

/** Minimum touch target used across the design. */
export const touchTarget = 44;

export const fonts = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semibold: 'Inter-SemiBold',
  displayMedium: 'SpaceGrotesk-Medium',
  display: 'SpaceGrotesk-SemiBold',
};

const display = (
  fontSize: number,
  lineHeight: number,
  letterSpacingEm: number,
): TextStyle => ({
  fontFamily: fonts.display,
  fontSize,
  lineHeight,
  letterSpacing: fontSize * letterSpacingEm,
  color: colors.text,
});

export const typography = {
  /** Login hero title. */
  hero: display(40, 44, -0.03),
  /** Screen titles: Feed header, profile name, Settings, Publish. */
  title: display(24, 30, -0.02),
  /** Feed app bar title. */
  brand: display(26, 32, -0.02),
  /** Bottom sheet headings. */
  sheetTitle: display(20, 26, -0.01),
  bodyLarge: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  bodyMedium: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  bodySmall: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
  fieldLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  button: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  chip: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  navLabel: { fontFamily: fonts.medium, fontSize: 11, color: colors.textMuted },
} satisfies Record<string, TextStyle>;

/** Floating elements (nav pill, sheets' buttons) use this soft drop shadow. */
export const elevation = {
  floating: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
};

export const navigationTheme: Theme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
  },
};
