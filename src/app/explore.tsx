
import { Redirect } from 'expo-router';

// The old explore screen now redirects to the menu tab.
export default function Explore() {
  return <Redirect href="/(tabs)/menu" />;
}
