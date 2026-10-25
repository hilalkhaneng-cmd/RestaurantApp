import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * API Host Resolution
 *
 * Android physical device: Mac's Wi-Fi IP
 * Web: localhost
 * iOS: configured host or Mac's Wi-Fi IP
 */

function resolveHost(): string {
  // 1. Use the explicitly configured API host
  if (process.env.EXPO_PUBLIC_API_HOST) {
    return process.env.EXPO_PUBLIC_API_HOST;
  }

  // 2. Use the Expo development server host when available
  const hostUri = Constants.expoConfig?.hostUri;

  if (hostUri) {
    const ip = hostUri.split(':')[0];

    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return ip;
    }
  }

  // 3. Web runs the backend on the same computer
  if (Platform.OS === 'web') {
    return 'localhost';
  }

  // 4. Physical Android phone connects to the Mac
  if (Platform.OS === 'android') {
    return '192.168.18.111';
  }

  // 5. iOS fallback
  return '192.168.18.111';
}

// Backend port
const PORT = '5050';

export const API_HOST = resolveHost();
export const API_BASE_URL = `http://${API_HOST}:${PORT}/api`;

export const API_ENDPOINTS = {
  health: `${API_BASE_URL}/health`,
  menu: `${API_BASE_URL}/menu`,
  menuCategories: `${API_BASE_URL}/menu/categories`,
  register: `${API_BASE_URL}/auth/register`,
  login: `${API_BASE_URL}/auth/login`,
  me: `${API_BASE_URL}/auth/me`,
  tables: `${API_BASE_URL}/tables`,
  orders: `${API_BASE_URL}/orders`,
  ordersMy: `${API_BASE_URL}/orders/my`,
  reservations: `${API_BASE_URL}/reservations`,
  reservationsMy: `${API_BASE_URL}/reservations/my`,
  reservationAvailability: `${API_BASE_URL}/reservations/availability`,
};

console.log(`[API Config] Targeting backend at: ${API_BASE_URL}`);
