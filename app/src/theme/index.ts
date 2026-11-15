import { DefaultTheme, Theme } from '@react-navigation/native';

export const colors = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  text: '#111111',
  textMuted: '#6B6B6B',
  primary: '#111111',
  border: '#E5E5E5',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
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
