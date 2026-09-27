import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🍽️</Text>

      <Text style={styles.title}>My Restaurant</Text>

      <Text style={styles.subtitle}>
        Delicious food, made for you.
      </Text>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Explore Menu</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Popular Today</Text>

      <View style={styles.foodRow}>
        <View style={styles.foodCard}>
          <Text style={styles.foodEmoji}>🍕</Text>
          <Text style={styles.foodName}>Pizza</Text>
        </View>

        <View style={styles.foodCard}>
          <Text style={styles.foodEmoji}>🍔</Text>
          <Text style={styles.foodName}>Burger</Text>
        </View>

        <View style={styles.foodCard}>
          <Text style={styles.foodEmoji}>🍝</Text>
          <Text style={styles.foodName}>Pasta</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: 80,
  },

  emoji: {
    fontSize: 50,
    marginBottom: 15,
  },

  title: {
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
  },

  button: {
    backgroundColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
  },

  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },

  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },

  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  foodCard: {
    width: '31%',
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    alignItems: 'center',
  },

  foodEmoji: {
    fontSize: 35,
    marginBottom: 8,
  },

  foodName: {
    fontSize: 15,
    fontWeight: '600',
  },
});