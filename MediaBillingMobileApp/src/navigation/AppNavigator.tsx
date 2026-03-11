import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import LoginScreen from '../screens/LoginScreen';
import InvoiceExtractorScreen from '../screens/InvoiceExtractorScreen';
import ReconciliationReportScreen from '../screens/ReconciliationReportScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="InvoiceExtractor"
          component={InvoiceExtractorScreen}
          options={{
            title: 'Invoice Extractor',
            headerBackVisible: true,
          }}
        />
        <Stack.Screen
          name="ReconciliationReport"
          component={ReconciliationReportScreen}
          options={{
            title: 'Reconciliation Report',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
