import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { TaskListScreen } from './src/screens/TaskListScreen';
import { TaskDetailScreen } from './src/screens/TaskDetailScreen';
import { FloatingChat } from './src/components/FloatingChat';
import { TaskProvider } from './src/context/TaskContext';
import { View, StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store/store';

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <TaskProvider>
          <View style={styles.container}>
            <NavigationContainer>
              <Stack.Navigator initialRouteName="Dashboard">
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

            <FloatingChat />
          </View>
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
