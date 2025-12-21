import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { TaskListScreen } from './src/screens/TaskListScreen';
import { TaskDetailScreen } from './src/screens/TaskDetailScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { FloatingChat } from './src/components/FloatingChat';
import { TaskProvider } from './src/context/TaskContext';
import { View, StyleSheet } from 'react-native';
import { Provider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor, RootState } from './src/store/store';
import { navigationRef } from './src/services/NavigationService';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const hasCompletedOnboarding = useSelector(
    (state: RootState) => state.user.hasCompletedOnboarding,
  );

  return (
    <View style={styles.container}>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName={hasCompletedOnboarding ? 'Dashboard' : 'Onboarding'}
        >
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="TaskList"
            component={TaskListScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="TaskDetail"
            component={TaskDetailScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>

      {hasCompletedOnboarding && <FloatingChat />}
    </View>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <TaskProvider>
          <AppNavigator />
        </TaskProvider>
      </PersistGate>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
