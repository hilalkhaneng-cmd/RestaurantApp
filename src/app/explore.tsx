import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const foods = [
  {
    name: 'Classic Burger',
    description: 'Beef patty, cheese, lettuce and special sauce',
    price: '$8.99',
    emoji: '🍔',
  },
  {
    name: 'Margherita Pizza',
    description: 'Tomato, mozzarella and fresh basil',
    price: '$10.99',
    emoji: '🍕',
  },
  {
    name: 'Creamy Pasta',
    description: 'Creamy sauce, parmesan and herbs',
    price: '$9.99',
    emoji: '🍝',
  },
  {
    name: 'Fried Chicken',
    description: 'Crispy chicken served with fries',
    price: '$11.99',
    emoji: '🍗',
  },
];

export default function MenuScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Our Menu</Text>

      <Text style={styles.subtitle}>
        Choose something delicious
      </Text>

      <View style={styles.categoryRow}>
        <TouchableOpacity style={styles.categoryActive}>
          <Text style={styles.categoryActiveText}>All</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.category}>
          <Text style={styles.categoryText}>Burgers</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.category}>
          <Text style={styles.categoryText}>Pizza</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.category}>
          <Text style={styles.categoryText}>Pasta</Text>
        </TouchableOpacity>
      </View>

      {foods.map((food) => (
        <View style={styles.foodCard} key={food.name}>
          <View style={styles.foodImage}>
            <Text style={styles.foodEmoji}>{food.emoji}</Text>
          </View>

          <View style={styles.foodInfo}>
            <Text style={styles.foodName}>{food.name}</Text>

            <Text style={styles.description}>
              {food.description}
            </Text>

            <Text style={styles.price}>{food.price}</Text>

            <TouchableOpacity style={styles.addButton}>
              <Text style={styles.addButtonText}>+ Add to Cart</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },

  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 55,
  },

  subtitle: {
    fontSize: 16,
    color: '#777',
    marginTop: 5,
    marginBottom: 25,
  },

  categoryRow: {
    flexDirection: 'row',
    marginBottom: 25,
  },

  categoryActive: {
    backgroundColor: '#000',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },

  categoryActiveText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  category: {
    backgroundColor: '#f1f1f1',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },

  categoryText: {
    color: '#333',
  },

  foodCard: {
    flexDirection: 'row',
    backgroundColor: '#f7f7f7',
    borderRadius: 18,
    padding: 15,
    marginBottom: 15,
  },

  foodImage: {
    width: 90,
    height: 90,
    borderRadius: 15,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },

  foodEmoji: {
    fontSize: 45,
  },

  foodInfo: {
    flex: 1,
  },

  foodName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },

  description: {
    fontSize: 12,
    color: '#777',
    marginBottom: 8,
  },

  price: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  addButton: {
    backgroundColor: '#000',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },

  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});