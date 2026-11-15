import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { t } from '../i18n';
import { FeedScreen } from '../screens/FeedScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { PublishScreen } from '../screens/PublishScreen';

export type RootTabParamList = {
  Feed: undefined;
  Publish: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export function RootTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{ title: t('tabs.feed') }}
      />
      <Tab.Screen
        name="Publish"
        component={PublishScreen}
        options={{ title: t('tabs.publish') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: t('tabs.profile') }}
      />
    </Tab.Navigator>
  );
}
