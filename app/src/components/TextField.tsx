import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { colors, fonts, radii, typography } from '../theme';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string | null;
  /** Shows "n/max" on the right of the helper row. */
  counterMax?: number;
};

export function TextField({
  label,
  error,
  counterMax,
  value = '',
  ...input
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={typography.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? styles.inputError : null]}
        {...input}
      />
      {error != null || counterMax != null ? (
        <View style={styles.helper}>
          <Text accessibilityRole="alert" style={styles.error}>
            {error ?? ''}
          </Text>
          {counterMax != null ? (
            <Text
              style={styles.counter}
            >{`${value.length}/${counterMax}`}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  input: {
    height: 52,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.field,
    backgroundColor: colors.surface,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  helper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 18,
  },
  error: {
    ...typography.fieldLabel,
    fontFamily: fonts.regular,
    color: colors.danger,
    flexShrink: 1,
  },
  counter: {
    ...typography.fieldLabel,
    fontFamily: fonts.regular,
    fontVariant: ['tabular-nums'],
  },
});
