import { NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PublishScreen } from '../screens/PublishScreen';
import { colors } from '../theme';
import { RootTabParamList, RootTabs } from './RootTabs';

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<RootTabParamList>;
  Publish: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Tabs" component={RootTabs} />
      <Stack.Screen
        name="Publish"
        component={PublishScreen}
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
}
