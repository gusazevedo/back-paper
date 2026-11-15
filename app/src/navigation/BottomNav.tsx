import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from '../components/icons/Icon';
import { t } from '../i18n';
import { colors, elevation, fonts, radii, typography } from '../theme';
import type { RootStackParamList } from './RootStack';

const tabIcons: Record<string, IconName> = { Feed: 'feed', Profile: 'profile' };

/**
 * Floating navigation from the design: a white pill with Feed and Profile on the
 * left, and a dark square "+" button on the right that opens Publish.
 */
export function BottomNav({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const stack = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const bottom = 22 + insets.bottom;
  return (
    <View pointerEvents="box-none" style={[styles.container, { bottom }]}>
      <View
        accessibilityRole="tablist"
        style={[styles.pill, elevation.floating]}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const label = descriptors[route.key].options.title ?? route.name;
          const color = focused ? colors.text : colors.textMuted;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              style={styles.tab}
            >
              <Icon name={tabIcons[route.name] ?? 'feed'} color={color} />
              <Text
                style={[
                  typography.navLabel,
                  {
                    color,
                    fontFamily: focused ? fonts.semibold : fonts.medium,
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('publish.open')}
        onPress={() => stack.navigate('Publish')}
        style={({ pressed }) => [
          styles.fab,
          elevation.floating,
          pressed && styles.pressed,
        ]}
      >
        <Icon
          name="plus"
          size={26}
          strokeWidth={2.5}
          color={colors.textOnDark}
        />
      </Pressable>
    </View>
  );
}

/** Space a scrolling screen must leave at the bottom so content clears the floating nav. */
export const BOTTOM_NAV_CLEARANCE = 104;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  pill: {
    flexDirection: 'row',
    gap: 4,
    padding: 6,
    borderRadius: radii.nav,
    backgroundColor: colors.surface,
  },
  tab: {
    width: 72,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: radii.nav,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
});
