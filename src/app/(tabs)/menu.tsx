import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../constants/api';

type MenuItem = {
  _id: string;
  id?: string;
  name: string;
  description: string;
  category: string;
  price: number;
  emoji: string;
  available: boolean;
};

export default function MenuScreen() {
  const { addToCart, itemCount } = useCart();
  const { user, token, isManager } = useAuth();

  const [foods, setFoods] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');

  // Manager creation modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCat, setNewCat] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newEmoji, setNewEmoji] = useState('🍽️');
  const [savingItem, setSavingItem] = useState(false);

  const loadMenu = useCallback(async () => {
    setError('');

    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'All') params.set('category', selectedCategory);
      if (search.trim()) params.set('search', search.trim());

      const url = `${API_ENDPOINTS.menu}?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Server error ${response.status}`);
      }

      const data: MenuItem[] = await response.json();
      setFoods(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load the menu. Please check that the server is running.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, search]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMenu();
  }, [loadMenu]);

  // Load categories
  useEffect(() => {
    fetch(API_ENDPOINTS.menuCategories)
      .then((r) => r.json())
      .then((cats: string[]) => setCategories(['All', ...cats]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    loadMenu();
  }, [loadMenu]);

  // Manager: Create item
  const handleCreateItem = async () => {
    if (!newName.trim() || !newDesc.trim() || !newCat.trim() || !newPrice.trim()) {
      Alert.alert('Validation Error', 'Please fill in name, description, category, and price.');
      return;
    }

    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Validation Error', 'Price must be a positive number.');
      return;
    }

    setSavingItem(true);
    try {
      const res = await fetch(API_ENDPOINTS.menu, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDesc.trim(),
          category: newCat.trim(),
          price: priceNum,
          emoji: newEmoji.trim() || '🍽️',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create item');

      Alert.alert('Success', `"${data.name}" added to menu!`);
      setModalVisible(false);
      setNewName('');
      setNewDesc('');
      setNewCat('');
      setNewPrice('');
      setNewEmoji('🍽️');
      loadMenu();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not create menu item');
    } finally {
      setSavingItem(false);
    }
  };

  // Manager: Delete item
  const handleDeleteItem = (item: MenuItem) => {
    const itemId = item._id || item.id;
    Alert.alert('Delete Item', `Are you sure you want to delete "${item.name}" from the menu?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(`${API_ENDPOINTS.menu}/${itemId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to delete item');
            loadMenu();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Could not delete item');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Our Menu</Text>
          <Text style={styles.subtitle}>Choose something delicious</Text>
        </View>
        {isManager && (
          <TouchableOpacity style={styles.addDishButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.addDishText}>+ Add Dish</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.cartCount}>🛒 Cart: {itemCount} {itemCount === 1 ? 'item' : 'items'}</Text>

      {/* Search Input */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search dishes (e.g. Burger, Pizza)..."
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={loadMenu}
        returnKeyType="search"
      />

      {/* Category Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        <View style={styles.categoryRow}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={selectedCategory === cat ? styles.categoryActive : styles.category}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={
                  selectedCategory === cat
                    ? styles.categoryActiveText
                    : styles.categoryText
                }
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Menu List */}
      {loading ? (
        <View style={styles.messageContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.message}>Loading real Firestore menu...</Text>
        </View>
      ) : error ? (
        <View style={styles.messageContainer}>
          <Text style={styles.errorText}>⚠️ Could not load the menu</Text>
          <Text style={styles.message}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadMenu}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : foods.length === 0 ? (
        <View style={styles.messageContainer}>
          <Text style={styles.message}>No dishes found matching your search.</Text>
        </View>
      ) : (
        foods.map((food) => {
          const itemId = food._id || food.id || '';
          return (
            <View style={styles.foodCard} key={itemId}>
              <View style={styles.foodImage}>
                <Text style={styles.foodEmoji}>{food.emoji || '🍽️'}</Text>
              </View>

              <View style={styles.foodInfo}>
                <View style={styles.cardHeader}>
                  <Text style={styles.foodName}>{food.name}</Text>
                  {isManager && (
                    <TouchableOpacity onPress={() => handleDeleteItem(food)}>
                      <Text style={styles.deleteIcon}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.description}>{food.description}</Text>
                <Text style={styles.price}>${food.price.toFixed(2)}</Text>

                {food.available === false ? (
                  <Text style={styles.unavailable}>Currently unavailable</Text>
                ) : (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() =>
                      addToCart({
                        name: food.name,
                        price: food.price,
                        emoji: food.emoji || '🍽️',
                      })
                    }
                  >
                    <Text style={styles.addButtonText}>+ Add to Cart</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}

      {/* Manager Add Dish Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Menu Item</Text>

            <TextInput
              style={styles.input}
              placeholder="Dish Name"
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              style={styles.input}
              placeholder="Description"
              value={newDesc}
              onChangeText={setNewDesc}
            />
            <TextInput
              style={styles.input}
              placeholder="Category (Burgers, Pizza, Salads, etc.)"
              value={newCat}
              onChangeText={setNewCat}
            />
            <TextInput
              style={styles.input}
              placeholder="Price (e.g. 14.99)"
              value={newPrice}
              onChangeText={setNewPrice}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Emoji (e.g. 🍕, 🍔, 🥗)"
              value={newEmoji}
              onChangeText={setNewEmoji}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveModalButton]}
                onPress={handleCreateItem}
                disabled={savingItem}
              >
                {savingItem ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveModalText}>Save Dish</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 50,
  },
  title: { fontSize: 32, fontWeight: 'bold' },
  subtitle: { fontSize: 16, color: '#777', marginTop: 4, marginBottom: 8 },
  addDishButton: {
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  addDishText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  cartCount: { fontSize: 15, marginBottom: 12 },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  categoryScroll: { marginBottom: 20, flexGrow: 0 },
  categoryRow: { flexDirection: 'row' },
  categoryActive: {
    backgroundColor: '#000',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryActiveText: { color: '#fff', fontWeight: 'bold' },
  category: {
    backgroundColor: '#f1f1f1',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryText: { color: '#333' },
  foodCard: {
    flexDirection: 'row',
    backgroundColor: '#f7f7f7',
    borderRadius: 18,
    padding: 15,
    marginBottom: 15,
  },
  foodImage: {
    width: 80,
    height: 80,
    borderRadius: 15,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  foodEmoji: { fontSize: 40 },
  foodInfo: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  foodName: { fontSize: 17, fontWeight: 'bold', marginBottom: 4, flex: 1 },
  deleteIcon: { fontSize: 16, paddingLeft: 8 },
  description: { fontSize: 12, color: '#666', marginBottom: 8 },
  price: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  addButton: {
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontWeight: 'bold' },
  unavailable: { color: '#888', fontSize: 13, fontStyle: 'italic' },
  messageContainer: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  message: { fontSize: 14, color: '#777', textAlign: 'center', marginVertical: 8 },
  errorText: { fontSize: 17, color: '#b00020', fontWeight: 'bold' },
  retryButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 4,
  },
  retryText: { color: '#fff', fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  modalButtonRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelModalButton: { backgroundColor: '#f0f0f0' },
  cancelModalText: { color: '#333', fontWeight: 'bold' },
  saveModalButton: { backgroundColor: '#000' },
  saveModalText: { color: '#fff', fontWeight: 'bold' },
});
