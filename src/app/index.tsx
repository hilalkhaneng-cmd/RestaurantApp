
import { Redirect } from 'expo-router';

// The root index redirects to the main tabs home screen.
export default function Index() {
  return <Redirect href="/(tabs)" />;
}