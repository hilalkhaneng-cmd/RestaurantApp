
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { API_ENDPOINTS } from '../../constants/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

type OrderStatus =
  | 'Pending'
  | 'Preparing'
  | 'Ready'
  | 'Served'
  | 'Cancelled';

type OrderItem = {
  menuItemId?: string;
  name: string;
  price: number;
  quantity: number;
};

type Order = {
  _id: string;
  id?: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  notes: string;
  createdAt: string;
  user?: { name: string; email: string };
};

const STATUS_COLORS: Record<string, string> = {
  Pending: '#f59e0b',
  Preparing: '#3b82f6',
  Ready: '#10b981',
  Served: '#6b7280',
  Cancelled: '#ef4444',
};

const NEXT_STATUS: Record<string, OrderStatus | null> = {
  Pending: 'Preparing',
  Preparing: 'Ready',
  Ready: 'Served',
  Served: null,
  Cancelled: null,
};

export default function OrdersScreen() {
  const { user, token, isManager } = useAuth();
  const { cart, total, itemCount, clearCart } = useCart();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);

  // Use browser dialogs on web and native dialogs on mobile.
  const showMessage = (title: string, message: string) => {
    if (typeof window !== 'undefined') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const loadOrders = useCallback(
    async (isPolling = false) => {
      if (!token) {
        setOrders([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!isPolling) setError('');

      try {
        const endpoint = isManager
          ? API_ENDPOINTS.orders
          : API_ENDPOINTS.ordersMy;

        const response = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(
            data.error || `Server error ${response.status}`
          );
        }

        const data: Order[] = await response.json();
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!isPolling) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load orders.'
          );
        }
      } finally {
        if (!isPolling) setLoading(false);
        setRefreshing(false);
      }
    },
    [token, isManager]
  );

  // Initial load.
  useEffect(() => {
    setLoading(true);
    void loadOrders();
  }, [loadOrders]);

  // Refresh order status every 10 seconds.
  useEffect(() => {
    if (!token) return;

    const intervalId = setInterval(() => {
      void loadOrders(true);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [token, loadOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadOrders();
  }, [loadOrders]);

  // Place an order using the existing backend API.
  const placeOrder = async () => {
    if (placing) return;

    if (!token) {
      showMessage('Sign in required', 'Please sign in before placing an order.');
      return;
    }

    if (cart.length === 0) {
      showMessage('Empty Cart', 'Add some items to your cart first.');
      return;
    }

    const confirmationMessage =
      `Place order for ${itemCount} ${
        itemCount === 1 ? 'item' : 'items'
      } totalling $${total.toFixed(2)}?`;

    if (typeof window !== 'undefined') {
      if (!window.confirm(confirmationMessage)) return;
    } else {
      // Native confirmation is handled below using Alert.alert.
      Alert.alert('Place Order', confirmationMessage, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Order Now',
          onPress: () => {
            void submitOrder();
          },
        },
      ]);
      return;
    }

    await submitOrder();
  };

  const submitOrder = async () => {
    if (placing || cart.length === 0 || !token) return;

    setPlacing(true);

    try {
      // Resolve cart item names to backend menu IDs.
      const menuResponse = await fetch(API_ENDPOINTS.menu);

      if (!menuResponse.ok) {
        throw new Error('Could not load the menu. Please try again.');
      }

      const menuItems = await menuResponse.json();

      if (!Array.isArray(menuItems)) {
        throw new Error('The menu response is invalid.');
      }

      const items = cart.map((cartItem) => {
        const found = menuItems.find(
          (menuItem: any) =>
            typeof menuItem.name === 'string' &&
            menuItem.name.toLowerCase() ===
              cartItem.name.toLowerCase()
        );

        if (!found) {
          throw new Error(
            `"${cartItem.name}" is no longer on the menu.`
          );
        }

        const menuItemId = found._id || found.id;

        if (!menuItemId) {
          throw new Error(
            `Could not identify "${cartItem.name}" on the menu.`
          );
        }

        return {
          menuItemId,
          quantity: cartItem.quantity,
        };
      });

      const response = await fetch(API_ENDPOINTS.orders, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to place order.');
      }

      // Clear the cart only after successful order creation.
      clearCart();

      const orderId = data._id || data.id || '';
      const orderNumber = orderId
        ? orderId.slice(-6).toUpperCase()
        : 'NEW';

      showMessage(
        'Order Placed! 🎉',
        `Order #${orderNumber} created. Status: ${
          data.status || 'Pending'
        }`
      );

      await loadOrders();
    } catch (err) {
      showMessage(
        'Order Error',
        err instanceof Error
          ? err.message
          : 'Failed to place order.'
      );
    } finally {
      setPlacing(false);
    }
  };

  // Customer: cancel a pending order.
  const handleCancelOrder = (orderId: string) => {
    const cancelOrder = async () => {
      try {
        const response = await fetch(
          `${API_ENDPOINTS.orders}/${orderId}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || 'Failed to cancel order.');
        }

        showMessage('Cancelled', 'Your order has been cancelled.');
        await loadOrders();
      } catch (err) {
        showMessage(
          'Error',
          err instanceof Error
            ? err.message
            : 'Could not cancel order.'
        );
      }
    };

    if (typeof window !== 'undefined') {
      if (window.confirm('Are you sure you want to cancel this pending order?')) {
        void cancelOrder();
      }
      return;
    }

    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this pending order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel Order',
          style: 'destructive',
          onPress: () => void cancelOrder(),
        },
      ]
    );
  };

  // Manager: advance an order to the next status.
  const handleAdvanceStatus = async (
    orderId: string,
    currentStatus: string
  ) => {
    const nextStatus = NEXT_STATUS[currentStatus];
    if (!nextStatus || !token) return;

    try {
      const response = await fetch(
        `${API_ENDPOINTS.orders}/${orderId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: nextStatus }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update order status.');
      }

      await loadOrders();
    } catch (err) {
      showMessage(
        'Error',
        err instanceof Error
          ? err.message
          : 'Could not update order.'
      );
    }
  };

  // Keep the sign-in prompt.
  if (!user) {
    return (
      <View style={styles.authPrompt}>
        <Text style={styles.authEmoji}>🔒</Text>
        <Text style={styles.authTitle}>Sign in to view orders</Text>
        <TouchableOpacity
          style={styles.authButton}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.authButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
    >
      <Text style={styles.title}>
        {isManager ? 'All Orders' : 'My Orders'}
      </Text>

      <Text style={styles.subtitle}>
        {isManager
          ? 'Manage customer orders (Live 10s auto-refresh)'
          : 'Track your food orders in real-time'}
      </Text>

      {/* Customer cart checkout card. */}
      {!isManager && cart.length > 0 && (
        <View style={styles.cartCard}>
          <Text style={styles.cartTitle}>
            🛒 Cart — {itemCount}{' '}
            {itemCount === 1 ? 'item' : 'items'}
          </Text>

          {cart.map((item) => (
            <Text key={item.name} style={styles.cartItem}>
              {item.emoji} {item.name} × {item.quantity} — $
              {(item.price * item.quantity).toFixed(2)}
            </Text>
          ))}

          <Text style={styles.cartTotal}>
            Total: ${total.toFixed(2)}
          </Text>

          <TouchableOpacity
            style={[
              styles.placeButton,
              placing && styles.disabled,
            ]}
            onPress={() => void placeOrder()}
            disabled={placing}
          >
            {placing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.placeButtonText}>
                Place Order
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Orders list. */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.emptyText}>Loading orders...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => void loadOrders()}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No orders found.</Text>
        </View>
      ) : (
        orders.map((order) => {
          const orderId = order._id || order.id || '';
          const shortId = orderId.slice(-8).toUpperCase();
          const nextStatus = NEXT_STATUS[order.status];

          return (
            <View key={orderId} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>#{shortId}</Text>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        STATUS_COLORS[order.status] || '#999',
                    },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {order.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              {isManager && order.user && (
                <Text style={styles.orderUser}>
                  👤 Customer: {order.user.name} ({order.user.email})
                </Text>
              )}

              {order.items?.map((item, index) => (
                <Text key={index} style={styles.orderItem}>
                  • {item.name} × {item.quantity} — $
                  {(item.price * item.quantity).toFixed(2)}
                </Text>
              ))}

              <Text style={styles.orderTotal}>
                Total: ${order.totalAmount.toFixed(2)}
              </Text>

              <Text style={styles.orderDate}>
                {new Date(order.createdAt).toLocaleString()}
              </Text>

              <View style={styles.actionRow}>
                {!isManager && order.status === 'Pending' && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancelOrder(orderId)}
                  >
                    <Text style={styles.cancelText}>
                      Cancel Order
                    </Text>
                  </TouchableOpacity>
                )}

                {isManager && nextStatus && (
                  <TouchableOpacity
                    style={styles.advanceButton}
                    onPress={() =>
                      void handleAdvanceStatus(
                        orderId,
                        order.status
                      )
                    }
                  >
                    <Text style={styles.advanceText}>
                      Mark as {nextStatus}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}

      <View style={{ height: 30 }} />
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
    marginTop: 50,
  },
  subtitle: {
    fontSize: 15,
    color: '#777',
    marginTop: 4,
    marginBottom: 16,
  },
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  authEmoji: {
    fontSize: 52,
    marginBottom: 16,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  authButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  authButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cartCard: {
    backgroundColor: '#f7f7f7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  cartTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cartItem: {
    fontSize: 14,
    color: '#444',
    marginBottom: 4,
  },
  cartTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 12,
  },
  placeButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  placeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabled: {
    opacity: 0.6,
  },
  orderCard: {
    backgroundColor: '#f7f7f7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  orderUser: {
    fontSize: 13,
    color: '#555',
    marginBottom: 8,
  },
  orderItem: {
    fontSize: 14,
    color: '#444',
    marginBottom: 3,
  },
  orderTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 8,
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  actionRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  cancelText: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 13,
  },
  advanceButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  advanceText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  errorText: {
    color: '#b00020',
    fontSize: 15,
    textAlign: 'center',
  },
  emptyText: {
    color: '#777',
    fontSize: 15,
  },
  retryButton: {
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
