import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { API_ENDPOINTS } from '../../constants/api';

type Table = {
  _id?: string;
  tableNumber: number;
  capacity: number;
  location: string;
};

type Reservation = {
  _id: string;
  id?: string;
  tableNumber: number;
  date: string;
  time: string;
  partySize: number;
  specialRequests: string;
  status: 'Pending' | 'Confirmed' | 'Declined' | 'Cancelled' | string;
  createdAt: string;
  user?: { name: string; email: string };
};

const STATUS_COLORS: Record<string, string> = {
  Pending: '#f59e0b',
  Confirmed: '#10b981',
  Declined: '#ef4444',
  Cancelled: '#9ca3af',
};

export default function ReservationsScreen() {
  const { user, token, isManager } = useAuth();

  const [tablesList, setTablesList] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [partySize, setPartySize] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Load tables
  const loadTables = useCallback(async () => {
    try {
      const res = await fetch(API_ENDPOINTS.tables);
      if (res.ok) {
        const data = await res.json();
        setTablesList(data);
        if (data.length > 0 && selectedTable === null) {
          setSelectedTable(data[0].tableNumber);
        }
      }
    } catch {
      // fallback
    }
  }, [selectedTable]);

  // Load reservations
  const loadReservations = useCallback(async () => {
    if (!token) return;
    setError('');

    try {
      const endpoint = isManager ? API_ENDPOINTS.reservations : API_ENDPOINTS.reservationsMy;
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Server error ${response.status}`);
      }

      const data: Reservation[] = await response.json();
      setReservations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load reservations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, isManager]);

  useEffect(() => {
    loadTables();
    loadReservations();
  }, [loadTables, loadReservations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTables();
    loadReservations();
  }, [loadTables, loadReservations]);

  if (!user) {
    return (
      <View style={styles.authPrompt}>
        <Text style={styles.authEmoji}>🪑</Text>
        <Text style={styles.authTitle}>Sign in to make reservations</Text>
        <TouchableOpacity style={styles.authButton} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.authButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleReserve = async () => {
    setFormError('');

    if (!selectedTable) return setFormError('Please select a restaurant table.');
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim()))
      return setFormError('Date must be in YYYY-MM-DD format (e.g. 2026-11-20).');
    if (!time || !/^\d{2}:\d{2}$/.test(time.trim()))
      return setFormError('Time must be in HH:MM format (e.g. 19:30).');

    const party = parseInt(partySize, 10);
    if (!partySize || isNaN(party) || party < 1 || party > 20)
      return setFormError('Party size must be between 1 and 20 guests.');

    const foundTable = tablesList.find((t) => t.tableNumber === selectedTable);
    if (foundTable && party > foundTable.capacity) {
      return setFormError(
        `Table ${selectedTable} has a maximum capacity of ${foundTable.capacity} guests. Please select a larger table.`
      );
    }

    setSubmitting(true);
    try {
      const response = await fetch(API_ENDPOINTS.reservations, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tableNumber: selectedTable,
          date: date.trim(),
          time: time.trim(),
          partySize: party,
          specialRequests: specialRequests.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Reservation booking failed');

      Alert.alert(
        'Reserved! 🎉',
        `Table ${selectedTable} booked for ${date} at ${time} (Party of ${party}).`
      );
      setDate('');
      setTime('');
      setPartySize('');
      setSpecialRequests('');
      loadReservations();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Reservation failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Customer: Cancel reservation
  const cancelReservation = async (id: string) => {
    Alert.alert('Cancel Reservation', 'Are you sure you want to cancel this booking?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(`${API_ENDPOINTS.reservations}/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to cancel');
            loadReservations();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Could not cancel reservation');
          }
        },
      },
    ]);
  };

  // Manager: Update Status (Accept / Decline)
  const updateReservationStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_ENDPOINTS.reservations}/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      loadReservations();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Status update failed');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>{isManager ? 'All Reservations' : 'Reserve a Table'}</Text>
        <Text style={styles.subtitle}>
          {isManager ? 'Manage dining bookings and confirmations' : 'Book a table at My Restaurant'}
        </Text>

        {/* Booking Form — customers only */}
        {!isManager && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Book a Dining Table</Text>

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <Text style={styles.label}>Select Table</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
              {tablesList.map((t) => (
                <TouchableOpacity
                  key={t.tableNumber}
                  style={[
                    styles.tablePill,
                    selectedTable === t.tableNumber && styles.tablePillActive,
                  ]}
                  onPress={() => setSelectedTable(t.tableNumber)}
                >
                  <Text
                    style={[
                      styles.tablePillText,
                      selectedTable === t.tableNumber && styles.tablePillTextActive,
                    ]}
                  >
                    Table {t.tableNumber} ({t.capacity}p)
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="e.g. 2026-11-20"
            />

            <Text style={styles.label}>Time (HH:MM)</Text>
            <TextInput
              style={styles.input}
              value={time}
              onChangeText={setTime}
              placeholder="e.g. 19:30"
            />

            <Text style={styles.label}>Party Size (Number of guests)</Text>
            <TextInput
              style={styles.input}
              value={partySize}
              onChangeText={setPartySize}
              placeholder="e.g. 2"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Special Requests (optional)</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={specialRequests}
              onChangeText={setSpecialRequests}
              placeholder="Dietary requirements, anniversary, quiet table, etc."
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.disabled]}
              onPress={handleReserve}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Confirm Reservation</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Reservations list */}
        <Text style={styles.sectionTitle}>
          {isManager ? 'All Reservations' : 'Your Bookings'}
        </Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.emptyText}>Loading bookings...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadReservations}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : reservations.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No reservations found.</Text>
          </View>
        ) : (
          reservations.map((r) => {
            const resId = r._id || r.id || '';
            const statusKey = r.status.charAt(0).toUpperCase() + r.status.slice(1).toLowerCase();

            return (
              <View key={resId} style={styles.resCard}>
                <View style={styles.resHeader}>
                  <Text style={styles.resTable}>Table {r.tableNumber}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: STATUS_COLORS[statusKey] || '#999' },
                    ]}
                  >
                    <Text style={styles.statusText}>{statusKey.toUpperCase()}</Text>
                  </View>
                </View>

                {isManager && r.user && (
                  <Text style={styles.resUser}>👤 Customer: {r.user.name} ({r.user.email})</Text>
                )}

                <Text style={styles.resDetail}>📅 Date: {r.date} at {r.time}</Text>
                <Text style={styles.resDetail}>👥 Guests: {r.partySize} people</Text>
                {r.specialRequests ? (
                  <Text style={styles.resNote}>📝 Note: {r.specialRequests}</Text>
                ) : null}

                {/* Manager Accept / Decline Controls */}
                {isManager && statusKey === 'Pending' && (
                  <View style={styles.managerActionRow}>
                    <TouchableOpacity
                      style={[styles.smallBtn, styles.acceptBtn]}
                      onPress={() => updateReservationStatus(resId, 'Confirmed')}
                    >
                      <Text style={styles.btnText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.smallBtn, styles.declineBtn]}
                      onPress={() => updateReservationStatus(resId, 'Declined')}
                    >
                      <Text style={styles.btnText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Customer Cancel Booking */}
                {!isManager && statusKey !== 'Cancelled' && statusKey !== 'Declined' && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => cancelReservation(resId)}
                  >
                    <Text style={styles.cancelText}>Cancel Booking</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', marginTop: 50 },
  subtitle: { fontSize: 15, color: '#777', marginTop: 4, marginBottom: 16 },
  authPrompt: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  authEmoji: { fontSize: 52, marginBottom: 16 },
  authTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  authButton: { backgroundColor: '#000', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 12 },
  authButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  formCard: { backgroundColor: '#f7f7f7', borderRadius: 16, padding: 18, marginBottom: 24 },
  formTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  formError: { color: '#b00020', fontSize: 13, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  tableScroll: { marginBottom: 14 },
  tablePill: {
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  tablePillActive: { backgroundColor: '#000' },
  tablePillText: { fontSize: 13, color: '#333', fontWeight: '600' },
  tablePillTextActive: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  multiline: { height: 70, textAlignVertical: 'top' },
  submitButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  disabled: { opacity: 0.6 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 14 },
  resCard: { backgroundColor: '#f7f7f7', borderRadius: 16, padding: 16, marginBottom: 14 },
  resHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  resTable: { fontSize: 18, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  resUser: { fontSize: 13, color: '#555', marginBottom: 6 },
  resDetail: { fontSize: 14, color: '#444', marginBottom: 4 },
  resNote: { fontSize: 13, color: '#666', fontStyle: 'italic', marginBottom: 4 },
  managerActionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  smallBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  acceptBtn: { backgroundColor: '#10b981' },
  declineBtn: { backgroundColor: '#ef4444' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  cancelButton: { marginTop: 10, borderWidth: 1, borderColor: '#ef4444', borderRadius: 8, padding: 8, alignItems: 'center' },
  cancelText: { color: '#ef4444', fontWeight: 'bold' },
  center: { alignItems: 'center', paddingVertical: 30, gap: 12 },
  errorText: { color: '#b00020', fontSize: 15, textAlign: 'center' },
  emptyText: { color: '#777', fontSize: 15 },
  retryButton: { backgroundColor: '#000', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: 'bold' },
});
