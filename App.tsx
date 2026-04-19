import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RoutePlannerScreen } from './src/screens/RoutePlannerScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <RoutePlannerScreen />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
