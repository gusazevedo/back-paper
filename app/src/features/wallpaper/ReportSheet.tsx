import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Sheet } from '../../components/Sheet';
import { t } from '../../i18n';
import { colors, fonts, radii, spacing, typography } from '../../theme';
import { REPORT_REASONS, ReportReason } from './queries';

type Props = {
  visible: boolean;
  busy?: boolean;
  onReport: (reason: ReportReason) => void;
  onCancel: () => void;
};

/** R-REP-1: pick one of the fixed reasons (no free text), then confirm. */
export function ReportSheet({ visible, busy, onReport, onCancel }: Props) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  useEffect(() => {
    if (visible) setReason(null);
  }, [visible]);

  return (
    <Sheet visible={visible} onDismiss={onCancel} title={t('report.title')}>
      <Text style={[typography.bodySmall, styles.body]}>
        {t('report.body')}
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('report.reason')}
      >
        {REPORT_REASONS.map(r => {
          const on = r === reason;
          return (
            <Pressable
              key={r}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setReason(r)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={[styles.radio, on && styles.radioOn]}>
                {on ? <View style={styles.dot} /> : null}
              </View>
              <Text style={styles.label}>{t(`report.reasons.${r}`)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Button
        label={t('report.confirm')}
        variant="danger"
        disabled={!reason || busy}
        onPress={() => reason && !busy && onReport(reason)}
      />
      <Button
        label={t('common.cancel')}
        variant="secondary"
        onPress={onCancel}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { marginBottom: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.field - 2,
  },
  pressed: { backgroundColor: colors.background },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.borderDashed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.text },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.text,
  },
  label: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
});
