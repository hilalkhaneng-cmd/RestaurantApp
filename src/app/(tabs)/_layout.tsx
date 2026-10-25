
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#000',
      }}
    >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
              tabBarLabel: 'Home',
              tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🏠</Text>,
            }}
          />
          <Tabs.Screen
            name="menu"
            options={{
              title: 'Menu',
              tabBarLabel: 'Menu',
              tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🍽️</Text>,
            }}
          />
          <Tabs.Screen
            name="orders"
            options={{
              title: 'Orders',
              tabBarLabel: 'Orders',
              tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📋</Text>,
            }}
          />
          <Tabs.Screen
            name="reservations"
            options={{
              title: 'Reserve',
              tabBarLabel: 'Reserve',
              tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🪑</Text>,
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarLabel: 'Profile',
              tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text>,
            }}
          />
        </Tabs>
  );
}
