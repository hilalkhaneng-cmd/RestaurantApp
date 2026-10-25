/**
 * Firestore Data Store Layer
 * 
 * Single source of truth for all database operations using Firebase Firestore.
 * Collections: users, menuItems, tables, orders, reservations.
 */

const { db } = require('../config/firebase');
const collections = require('../config/collections');

// -------------------------------------------------------------
// USER OPERATIONS
// -------------------------------------------------------------
const users = {
  async findByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const snapshot = await db
      .collection(collections.USERS_COLLECTION)
      .where('email', '==', cleanEmail)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { _id: doc.id, id: doc.id, ...doc.data() };
  },

  async findById(id) {
    if (!id) return null;
    const doc = await db
      .collection(collections.USERS_COLLECTION)
      .doc(String(id))
      .get();

    if (!doc.exists) return null;
    const data = doc.data();
    delete data.password;
    return { _id: doc.id, id: doc.id, ...data };
  },

  async create({ name, email, password, role = 'customer' }) {
    const cleanEmail = email.trim().toLowerCase();
    const now = new Date().toISOString();
    const newUser = {
      name: name.trim(),
      email: cleanEmail,
      password,
      role: role === 'manager' ? 'manager' : 'customer',
      createdAt: now,
      updatedAt: now,
    };

    const ref = await db.collection(collections.USERS_COLLECTION).add(newUser);
    const safeUser = { ...newUser, _id: ref.id, id: ref.id };
    delete safeUser.password;
    return safeUser;
  },

  async setRole(id, role) {
    const ref = db.collection(collections.USERS_COLLECTION).doc(String(id));
    await ref.update({
      role: role === 'manager' ? 'manager' : 'customer',
      updatedAt: new Date().toISOString(),
    });
    return await this.findById(id);
  },
};

// -------------------------------------------------------------
// MENU OPERATIONS
// -------------------------------------------------------------
const menu = {
  async list({ category, search } = {}) {
    let query = db.collection(collections.MENU_ITEMS_COLLECTION);
    if (category && category !== 'All') {
      query = query.where('category', '==', String(category));
    }

    const snapshot = await query.get();
    let items = snapshot.docs.map((doc) => ({
      _id: doc.id,
      id: doc.id,
      ...doc.data(),
    }));

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (it) => typeof it.name === 'string' && it.name.toLowerCase().includes(q)
      );
    }

    return items;
  },

  async getCategories() {
    const all = await this.list();
    const cats = new Set();
    for (const item of all) {
      if (item.category) cats.add(item.category);
    }
    return Array.from(cats).sort();
  },

  async findById(id) {
    if (!id) return null;
    try {
      const doc = await db
        .collection(collections.MENU_ITEMS_COLLECTION)
        .doc(String(id))
        .get();
      if (!doc.exists) return null;
      return { _id: doc.id, id: doc.id, ...doc.data() };
    } catch (err) {
      return null;
    }
  },

  async create(data) {
    const now = new Date().toISOString();
    const itemData = {
      name: data.name.trim(),
      description: data.description.trim(),
      category: data.category.trim(),
      price: Number(data.price),
      emoji: data.emoji || '🍽️',
      available: data.available !== false,
      createdAt: now,
      updatedAt: now,
    };

    const ref = await db.collection(collections.MENU_ITEMS_COLLECTION).add(itemData);
    return { _id: ref.id, id: ref.id, ...itemData };
  },

  async update(id, updates) {
    const ref = db.collection(collections.MENU_ITEMS_COLLECTION).doc(String(id));
    const snap = await ref.get();
    if (!snap.exists) return null;

    const cleanUpdates = { ...updates, updatedAt: new Date().toISOString() };
    if ('price' in cleanUpdates) cleanUpdates.price = Number(cleanUpdates.price);
    if ('name' in cleanUpdates) cleanUpdates.name = cleanUpdates.name.trim();

    await ref.update(cleanUpdates);
    const updated = await ref.get();
    return { _id: updated.id, id: updated.id, ...updated.data() };
  },

  async delete(id) {
    const ref = db.collection(collections.MENU_ITEMS_COLLECTION).doc(String(id));
    const snap = await ref.get();
    if (!snap.exists) return false;
    await ref.delete();
    return true;
  },
};

// -------------------------------------------------------------
// TABLES OPERATIONS
// -------------------------------------------------------------
const tables = {
  async list() {
    const snapshot = await db.collection(collections.TABLES_COLLECTION).get();
    const list = snapshot.docs.map((doc) => ({
      _id: doc.id,
      id: doc.id,
      ...doc.data(),
    }));
    list.sort((a, b) => Number(a.tableNumber) - Number(b.tableNumber));
    return list;
  },

  async findByNumber(tableNumber) {
    const num = Number(tableNumber);
    const snapshot = await db
      .collection(collections.TABLES_COLLECTION)
      .where('tableNumber', '==', num)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { _id: doc.id, id: doc.id, ...doc.data() };
  },

  async createOrUpdate(data) {
    const num = Number(data.tableNumber);
    const existing = await this.findByNumber(num);
    const now = new Date().toISOString();

    const payload = {
      tableNumber: num,
      capacity: Number(data.capacity) || 4,
      location: data.location || 'Main Dining Hall',
      isAvailable: data.isAvailable !== false,
      updatedAt: now,
    };

    if (existing) {
      await db.collection(collections.TABLES_COLLECTION).doc(existing.id).update(payload);
      return { ...existing, ...payload };
    }

    payload.createdAt = now;
    const ref = await db.collection(collections.TABLES_COLLECTION).add(payload);
    return { _id: ref.id, id: ref.id, ...payload };
  },
};

// -------------------------------------------------------------
// ORDER OPERATIONS
// Sequence: Pending -> Preparing -> Ready -> Served (or Cancelled if Pending)
// -------------------------------------------------------------
const VALID_ORDER_STATUSES = ['Pending', 'Preparing', 'Ready', 'Served', 'Cancelled'];

const ALLOWED_ORDER_TRANSITIONS = {
  Pending: ['Preparing', 'Cancelled'],
  Preparing: ['Ready'],
  Ready: ['Served'],
  Served: [],
  Cancelled: [],
};

const orders = {
  VALID_STATUSES: VALID_ORDER_STATUSES,

  async create({ user, items, totalAmount, notes = '' }) {
    const now = new Date().toISOString();
    const orderData = {
      user: {
        _id: String(user._id || user.id),
        id: String(user._id || user.id),
        name: user.name,
        email: user.email,
      },
      items,
      totalAmount: Math.round(Number(totalAmount) * 100) / 100,
      status: 'Pending',
      notes: notes || '',
      createdAt: now,
      updatedAt: now,
    };

    const ref = await db.collection(collections.ORDERS_COLLECTION).add(orderData);
    return { _id: ref.id, id: ref.id, ...orderData };
  },

  async list({ userId, isManager = false } = {}) {
    let query = db.collection(collections.ORDERS_COLLECTION);
    if (!isManager && userId) {
      query = query.where('user.id', '==', String(userId));
    }
    const snapshot = await query.get();
    const list = snapshot.docs.map((doc) => ({ _id: doc.id, id: doc.id, ...doc.data() }));
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  },

  async findById(id) {
    if (!id) return null;
    try {
      const doc = await db.collection(collections.ORDERS_COLLECTION).doc(String(id)).get();
      if (!doc.exists) return null;
      return { _id: doc.id, id: doc.id, ...doc.data() };
    } catch (err) {
      return null;
    }
  },

  async updateStatus(id, newStatus) {
    const ref = db.collection(collections.ORDERS_COLLECTION).doc(String(id));
    const snap = await ref.get();
    if (!snap.exists) return { error: 'Order not found', code: 404 };

    const currentData = snap.data();
    const currentStatus = currentData.status || 'Pending';

    // Normalize casing for check
    const matchedStatus = VALID_ORDER_STATUSES.find(
      (s) => s.toLowerCase() === String(newStatus).trim().toLowerCase()
    );

    if (!matchedStatus) {
      return {
        error: `Invalid status. Must be one of: ${VALID_ORDER_STATUSES.join(', ')}`,
        code: 400,
      };
    }

    const allowedNext = ALLOWED_ORDER_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(matchedStatus) && currentStatus !== matchedStatus) {
      return {
        error: `Cannot transition order status from "${currentStatus}" to "${matchedStatus}". Allowed transitions: ${allowedNext.join(', ') || 'None'}`,
        code: 400,
      };
    }

    const now = new Date().toISOString();
    await ref.update({ status: matchedStatus, updatedAt: now });
    const updated = await ref.get();
    return { order: { _id: updated.id, id: updated.id, ...updated.data() } };
  },

  async cancel(id, userId, isManager = false) {
    const ref = db.collection(collections.ORDERS_COLLECTION).doc(String(id));
    const snap = await ref.get();
    if (!snap.exists) return { error: 'Order not found', code: 404 };

    const data = snap.data();
    const orderUserId = String(data.user?._id || data.user?.id || data.user);

    if (!isManager && String(userId) !== orderUserId) {
      return { error: 'Access denied', code: 403 };
    }

    if (data.status !== 'Pending') {
      return {
        error: `Orders can only be cancelled while in "Pending" status. Current status is "${data.status}".`,
        code: 400,
      };
    }

    const now = new Date().toISOString();
    await ref.update({ status: 'Cancelled', updatedAt: now });
    const updated = await ref.get();
    return { order: { _id: updated.id, id: updated.id, ...updated.data() } };
  },
};

// -------------------------------------------------------------
// RESERVATION OPERATIONS
// -------------------------------------------------------------
/**
 * Helper to convert "HH:MM" into total minutes from midnight.
 */
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

const RESERVATION_SLOT_DURATION_MINUTES = 90; // Standard 1.5-hour dining window

const reservations = {
  SLOT_DURATION: RESERVATION_SLOT_DURATION_MINUTES,

  async getAvailability(date, requestedTime = null) {
    const allTables = await tables.list();
    const snapshot = await db
      .collection(collections.RESERVATIONS_COLLECTION)
      .where('date', '==', String(date))
      .get();

    const activeReservations = snapshot.docs
      .map((d) => d.data())
      .filter((r) => r.status !== 'Cancelled' && r.status !== 'cancelled' && r.status !== 'Declined');

    let takenTableNumbers = [];

    if (requestedTime) {
      const reqMinutes = timeToMinutes(requestedTime);
      takenTableNumbers = activeReservations
        .filter((r) => {
          const rMinutes = timeToMinutes(r.time);
          return Math.abs(reqMinutes - rMinutes) < RESERVATION_SLOT_DURATION_MINUTES;
        })
        .map((r) => Number(r.tableNumber));
    } else {
      // General overview: tables with any reservations on that date
      takenTableNumbers = activeReservations.map((r) => Number(r.tableNumber));
    }

    const uniqueTaken = Array.from(new Set(takenTableNumbers));
    const availableTables = allTables.filter((t) => !uniqueTaken.includes(Number(t.tableNumber)));

    return {
      date,
      time: requestedTime || null,
      totalTables: allTables.length,
      availableTables,
      takenTables: uniqueTaken,
      slotDurationMinutes: RESERVATION_SLOT_DURATION_MINUTES,
    };
  },

  async checkConflict(tableNumber, date, time, excludeReservationId = null) {
    const t = Number(tableNumber);
    const newMinutes = timeToMinutes(time);

    const snapshot = await db
      .collection(collections.RESERVATIONS_COLLECTION)
      .where('tableNumber', '==', t)
      .where('date', '==', String(date))
      .get();

    for (const doc of snapshot.docs) {
      if (excludeReservationId && doc.id === String(excludeReservationId)) {
        continue;
      }
      const data = doc.data();
      const statusLower = String(data.status).toLowerCase();
      if (statusLower !== 'cancelled' && statusLower !== 'declined') {
        const existingMinutes = timeToMinutes(data.time);
        // Overlap check: within dining duration window
        if (Math.abs(newMinutes - existingMinutes) < RESERVATION_SLOT_DURATION_MINUTES) {
          return {
            _id: doc.id,
            id: doc.id,
            ...data,
            conflictTime: data.time,
          };
        }
      }
    }
    return null;
  },

  async create({ user, tableNumber, date, time, partySize, specialRequests = '' }) {
    const now = new Date().toISOString();
    const t = Number(tableNumber);
    const p = Number(partySize);

    const resData = {
      user: {
        _id: String(user._id || user.id),
        id: String(user._id || user.id),
        name: user.name,
        email: user.email,
      },
      tableNumber: t,
      date,
      time,
      partySize: p,
      specialRequests: specialRequests || '',
      status: 'Pending',
      createdAt: now,
      updatedAt: now,
    };

    const ref = await db.collection(collections.RESERVATIONS_COLLECTION).add(resData);
    return { _id: ref.id, id: ref.id, ...resData };
  },

  async list({ userId, isManager = false } = {}) {
    let query = db.collection(collections.RESERVATIONS_COLLECTION);
    if (!isManager && userId) {
      query = query.where('user.id', '==', String(userId));
    }
    const snapshot = await query.get();
    const list = snapshot.docs.map((doc) => ({ _id: doc.id, id: doc.id, ...doc.data() }));
    list.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    return list;
  },

  async findById(id) {
    if (!id) return null;
    try {
      const doc = await db.collection(collections.RESERVATIONS_COLLECTION).doc(String(id)).get();
      if (!doc.exists) return null;
      return { _id: doc.id, id: doc.id, ...doc.data() };
    } catch (err) {
      return null;
    }
  },

  async updateStatus(id, newStatus) {
    const validStatuses = ['Pending', 'Confirmed', 'Declined', 'Cancelled'];
    const matched = validStatuses.find(
      (s) => s.toLowerCase() === String(newStatus).trim().toLowerCase()
    );

    if (!matched) {
      return {
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        code: 400,
      };
    }

    const ref = db.collection(collections.RESERVATIONS_COLLECTION).doc(String(id));
    const snap = await ref.get();
    if (!snap.exists) return { error: 'Reservation not found', code: 404 };

    const now = new Date().toISOString();
    await ref.update({ status: matched, updatedAt: now });
    const updated = await ref.get();
    return { reservation: { _id: updated.id, id: updated.id, ...updated.data() } };
  },

  async cancel(id, userId, isManager = false) {
    const ref = db.collection(collections.RESERVATIONS_COLLECTION).doc(String(id));
    const snap = await ref.get();
    if (!snap.exists) return { error: 'Reservation not found', code: 404 };

    const data = snap.data();
    const reservationUserId = String(data.user?._id || data.user?.id || data.user);

    if (!isManager && String(userId) !== reservationUserId) {
      return { error: 'Access denied', code: 403 };
    }

    const now = new Date().toISOString();
    await ref.update({ status: 'Cancelled', updatedAt: now });
    const updated = await ref.get();
    return { reservation: { _id: updated.id, id: updated.id, ...updated.data() } };
  },
};

module.exports = {
  users,
  menu,
  tables,
  orders,
  reservations,
};
