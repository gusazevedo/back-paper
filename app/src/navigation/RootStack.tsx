import { NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { LoginScreen } from '../screens/LoginScreen';
import { PublishScreen } from '../screens/PublishScreen';
import { colors } from '../theme';
import { RootTabParamList, RootTabs } from './RootTabs';

export type RootStackParamList = {
  Login: undefined;
  Tabs: NavigatorScreenParams<RootTabParamList>;
  Publish: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/** R-AUTH-4: without a session only the Login screen exists in the navigator. */
export function RootStack() {
  const auth = useAuth();
  if (auth.status === 'loading') {
    return <View style={styles.splash} />;
  }
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {auth.status === 'signed-in' ? (
        <>
          <Stack.Screen name="Tabs" component={RootTabs} />
          <Stack.Screen
            name="Publish"
            component={PublishScreen}
            options={{
              presentation: 'fullScreenModal',
              animation: 'slide_from_bottom',
            }}
          />
        </>
      ) : (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ animation: 'fade' }}
        />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.background },
});
