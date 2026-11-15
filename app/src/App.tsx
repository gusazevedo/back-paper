import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootTabs } from './navigation/RootTabs';
import { navigationTheme } from './theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <NavigationContainer theme={navigationTheme}>
        <RootTabs />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
