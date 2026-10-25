
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export default function HomeScreen() {
  const { user } = useAuth();
  const { itemCount } = useCart();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🍽️</Text>
      <Text style={styles.title}>My Restaurant</Text>
      <Text style={styles.subtitle}>
        {user ? `Welcome back, ${user.name}!` : 'Delicious food, made for you.'}
      </Text>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/(tabs)/menu')}>
        <Text style={styles.buttonText}>Explore Menu</Text>
      </TouchableOpacity>

      {user ? (
        <>
          <TouchableOpacity
            style={[styles.button, styles.outlineButton]}
            onPress={() => router.push('/(tabs)/orders')}
          >
            <Text style={styles.outlineButtonText}>My Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.outlineButton]}
            onPress={() => router.push('/(tabs)/reservations')}
          >
            <Text style={styles.outlineButtonText}>Reserve a Table</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          style={[styles.button, styles.outlineButton]}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.outlineButtonText}>Sign In / Register</Text>
        </TouchableOpacity>
      )}

      {itemCount > 0 && (
        <View style={styles.cartBadge}>
          <Text style={styles.cartBadgeText}>🛒 {itemCount} {itemCount === 1 ? 'item' : 'items'} in cart</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Popular Today</Text>

      <View style={styles.foodRow}>
        {[
          { emoji: '🍕', name: 'Pizza' },
          { emoji: '🍔', name: 'Burger' },
          { emoji: '🍝', name: 'Pasta' },
        ].map(({ emoji, name }) => (
          <TouchableOpacity
            key={name}
            style={styles.foodCard}
            onPress={() => router.push('/(tabs)/menu')}
          >
            <Text style={styles.foodEmoji}>{emoji}</Text>
            <Text style={styles.foodName}>{name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 80 },
  emoji: { fontSize: 50, marginBottom: 15 },
  title: { fontSize: 34, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 18, color: '#666', marginBottom: 30 },
  button: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  outlineButton: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#000' },
  outlineButtonText: { color: '#000', fontSize: 17, fontWeight: 'bold' },
  cartBadge: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  cartBadgeText: { fontSize: 15, color: '#333' },
  sectionTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, marginTop: 10 },
  foodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  foodCard: {
    width: '31%',
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    alignItems: 'center',
  },
  foodEmoji: { fontSize: 35, marginBottom: 8 },
  foodName: { fontSize: 15, fontWeight: '600' },
});
