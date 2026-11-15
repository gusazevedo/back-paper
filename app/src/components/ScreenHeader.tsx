import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '../theme';
import { IconButton } from './IconButton';
import { IconName } from './icons/Icon';

type Props = {
  title?: string;
  subtitle?: string;
  leadingIcon?: Extract<IconName, 'back' | 'close'>;
  leadingLabel?: string;
  onLeadingPress?: () => void;
  leadingDisabled?: boolean;
  trailing?: ReactNode;
};

/** Back/close button + Space Grotesk title, as on Settings, Folder, Publish. */
export function ScreenHeader({
  title,
  subtitle,
  leadingIcon = 'back',
  leadingLabel,
  onLeadingPress,
  leadingDisabled,
  trailing,
}: Props) {
  return (
    <View style={styles.row}>
      {onLeadingPress ? (
        <IconButton
          icon={leadingIcon}
          accessibilityLabel={leadingLabel ?? leadingIcon}
          onPress={onLeadingPress}
          disabled={leadingDisabled}
        />
      ) : null}
      <View style={styles.titles}>
        {title ? (
          <Text accessibilityRole="header" style={typography.title}>
            {title}
          </Text>
        ) : null}
        {subtitle ? <Text style={typography.caption}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
  },
  titles: { flex: 1, minWidth: 0 },
});
