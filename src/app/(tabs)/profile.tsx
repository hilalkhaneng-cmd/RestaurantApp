
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export default function ProfileScreen() {
  const { user, logout, isManager } = useAuth();
  const { itemCount, total, clearCart } = useCart();

  if (!user) {
    return (
      <View style={styles.authPrompt}>
        <Text style={styles.authEmoji}>👤</Text>
        <Text style={styles.authTitle}>You're not signed in</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.outline]}
          onPress={() => router.push('/(auth)/register')}
        >
          <Text style={styles.outlineText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const doLogout = async () => {
    clearCart();
    await logout();
    router.replace('/(auth)/login');
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      // Alert.alert is a no-op stub in react-native-web; use the native browser dialog instead.
      if (window.confirm('Are you sure you want to sign out?')) {
        doLogout();
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: doLogout },
      ]);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <Text style={styles.avatar}>
          {isManager ? '👔' : '👤'}
        </Text>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={[styles.badge, isManager ? styles.managerBadge : styles.customerBadge]}>
          <Text style={styles.badgeText}>
            {isManager ? '⭐ Manager' : 'Customer'}
          </Text>
        </View>
      </View>

      {/* Cart summary */}
      {itemCount > 0 && (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🛒 Cart</Text>
          <Text style={styles.infoText}>{itemCount} {itemCount === 1 ? 'item' : 'items'} — ${total.toFixed(2)}</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.smallButton}
              onPress={() => router.push('/(tabs)/orders')}
            >
              <Text style={styles.smallButtonText}>View & Place Order</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallButton, styles.dangerButton]}
              onPress={() => Alert.alert('Clear Cart', 'Remove all items from your cart?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: clearCart },
              ])}
            >
              <Text style={styles.smallButtonText}>Clear Cart</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Quick links */}
      {[
        { label: '🍽️ Browse Menu', route: '/(tabs)/menu' },
        { label: '📋 My Orders', route: '/(tabs)/orders' },
        { label: '🪑 Reservations', route: '/(tabs)/reservations' },
      ].map(({ label, route }) => (
        <TouchableOpacity
          key={route}
          style={styles.link}
          onPress={() => router.push(route as any)}
        >
          <Text style={styles.linkText}>{label}</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      ))}

      {isManager && (
        <View style={styles.managerSection}>
          <Text style={styles.managerTitle}>Manager Actions</Text>
          <Text style={styles.managerNote}>
            As a manager, you can:
            {'\n'}• View all customer orders
            {'\n'}• View and manage all reservations
            {'\n'}• Add, update, or delete menu items via the API
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', marginTop: 55, marginBottom: 20 },
  authPrompt: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  authEmoji: { fontSize: 60, marginBottom: 16 },
  authTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, color: '#333' },
  card: { backgroundColor: '#f7f7f7', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20 },
  avatar: { fontSize: 60, marginBottom: 12 },
  name: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  email: { fontSize: 15, color: '#666', marginBottom: 12 },
  badge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  managerBadge: { backgroundColor: '#000' },
  customerBadge: { backgroundColor: '#555' },
  badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  infoCard: { backgroundColor: '#f0f0f0', borderRadius: 14, padding: 16, marginBottom: 16 },
  infoTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  infoText: { fontSize: 14, color: '#444', marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10 },
  smallButton: { flex: 1, backgroundColor: '#000', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  dangerButton: { backgroundColor: '#ef4444' },
  smallButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  link: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  linkText: { fontSize: 16, color: '#333' },
  arrow: { fontSize: 22, color: '#ccc' },
  managerSection: { backgroundColor: '#f7f0ff', borderRadius: 14, padding: 16, marginTop: 16, marginBottom: 8 },
  managerTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#5b21b6' },
  managerNote: { fontSize: 14, color: '#5b21b6', lineHeight: 22 },
  logoutButton: {
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 },
  button: { backgroundColor: '#000', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 12, marginBottom: 14, minWidth: 220, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  outline: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#000' },
  outlineText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
});
