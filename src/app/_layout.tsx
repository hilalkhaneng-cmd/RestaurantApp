import { Tabs } from 'expo-router';
import { CartProvider } from '../context/CartContext';

export default function Layout() {
  return (
    <CartProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarLabel: 'Home',
            tabBarIcon: () => '🏠',
          }}
        />

        <Tabs.Screen
          name="explore"
          options={{
            title: 'Menu',
            tabBarLabel: 'Menu',
            tabBarIcon: () => '🍔',
          }}
        />
      </Tabs>
    </CartProvider>
  );
}