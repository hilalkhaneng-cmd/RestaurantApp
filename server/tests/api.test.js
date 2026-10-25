const request = require('supertest');
const { app, initializeDatabase } = require('../server');
const store = require('../data/store');

jest.setTimeout(30000);

describe('Restaurant App API Suite (Firebase Firestore)', () => {
  let customerToken = '';
  let customerId = '';
  let managerToken = '';
  let managerId = '';
  let sampleMenuItemId = '';
  let sampleOrderId = '';
  let sampleReservationId = '';

  const uniqueSuffix = Date.now();
  const customerEmail = `customer_${uniqueSuffix}@restaurant.test`;
  const managerEmail = `manager_${uniqueSuffix}@restaurant.test`;

  beforeAll(async () => {
    await initializeDatabase();
  });

  // -------------------------------------------------------------
  // 1. HEALTH CHECK & UNKNOWN ROUTES
  // -------------------------------------------------------------
  describe('System Endpoints', () => {
    it('GET /api/health returns 200 OK and Firebase Firestore info', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.database).toBe('Firebase Firestore');
      expect(typeof res.body.menuItemsCount).toBe('number');
      expect(res.body.menuItemsCount).toBeGreaterThan(0);
    });

    it('returns 404 with "Route not found" for unknown paths', async () => {
      const res = await request(app).get('/api/nonexistent-route-path');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Route not found');
    });
  });

  // -------------------------------------------------------------
  // 2. AUTHENTICATION & ROLES
  // -------------------------------------------------------------
  describe('Authentication & Authorization Flow', () => {
    it('registers a new customer successfully with hashed password and 1d JWT', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Customer',
          email: customerEmail,
          password: 'Password123!',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('customer');
      expect(res.body.user).not.toHaveProperty('password');

      customerToken = res.body.token;
      customerId = res.body.user.id || res.body.user._id;
    });

    it('rejects duplicate email registration with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Duplicate',
          email: customerEmail,
          password: 'Password123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already exists/i);
    });

    it('rejects registration with invalid email or short password (400)', async () => {
      const res1 = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'invalid-email', password: 'pass' });
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'test@example.com', password: '123' });
      expect(res2.status).toBe(400);
    });

    it('logs in successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: customerEmail, password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(customerEmail);
    });

    it('rejects login with wrong password (401)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: customerEmail, password: 'WrongPassword!' });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid email or password/i);
    });

    it('fetches authenticated user profile via GET /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(customerEmail);
    });

    it('rejects GET /api/auth/me without Bearer token (401)', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/authentication required/i);
    });

    it('provisions a manager account via internal store for role testing', async () => {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('ManagerSecurePass1!', 12);
      const managerUser = await store.users.create({
        name: 'Head Chef Manager',
        email: managerEmail,
        password: hash,
        role: 'manager',
      });
      managerId = managerUser._id || managerUser.id;

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: managerEmail, password: 'ManagerSecurePass1!' });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.role).toBe('manager');
      managerToken = loginRes.body.token;
    });
  });

  // -------------------------------------------------------------
  // 3. MENU ENDPOINTS & ROLE AUTHORIZATION
  // -------------------------------------------------------------
  describe('Menu Operations', () => {
    it('publicly lists menu items via GET /api/menu', async () => {
      const res = await request(app).get('/api/menu');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      sampleMenuItemId = res.body[0]._id || res.body[0].id;
    });

    it('returns categories via GET /api/menu/categories', async () => {
      const res = await request(app).get('/api/menu/categories');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('filters menu items by category and search query', async () => {
      const res = await request(app).get('/api/menu?category=Burgers');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('fetches single menu item by ID via GET /api/menu/:id', async () => {
      const res = await request(app).get(`/api/menu/${sampleMenuItemId}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBeDefined();
    });

    it('prevents customers from creating menu items (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/menu')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Forbidden Dish',
          description: 'Attempted by customer',
          category: 'Specials',
          price: 99.99,
        });

      expect(res.status).toBe(403);
    });

    it('allows managers to create, update, and delete a menu item (201 Created)', async () => {
      const res = await request(app)
        .post('/api/menu')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: `Chef Special ${uniqueSuffix}`,
          description: 'Truffle infused risotto with mushrooms',
          category: 'Pasta',
          price: 18.5,
          emoji: '🍲',
        });

      expect(res.status).toBe(201);
      const createdId = res.body._id || res.body.id;

      // Update
      const updateRes = await request(app)
        .put(`/api/menu/${createdId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ price: 19.99 });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.price).toBe(19.99);

      // Delete
      const deleteRes = await request(app)
        .delete(`/api/menu/${createdId}`)
        .set('Authorization', `Bearer ${managerToken}`);
      expect(deleteRes.status).toBe(200);
    }, 25000);
  });

  // -------------------------------------------------------------
  // 4. RESTAURANT TABLES
  // -------------------------------------------------------------
  describe('Tables Operations', () => {
    it('lists all restaurant tables via GET /api/tables', async () => {
      const res = await request(app).get('/api/tables');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(6);
    });

    it('gets specific table by tableNumber via GET /api/tables/:tableNumber', async () => {
      const res = await request(app).get('/api/tables/1');
      expect(res.status).toBe(200);
      expect(res.body.tableNumber).toBe(1);
      expect(res.body.capacity).toBeDefined();
    });
  });

  // -------------------------------------------------------------
  // 5. ORDER CREATION, SEQUENCE & PERSISTENCE
  // -------------------------------------------------------------
  describe('Order Operations', () => {
    it('creates an order with server-calculated price verification and Pending status', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [
            {
              menuItemId: sampleMenuItemId,
              quantity: 2,
            },
          ],
          notes: 'Extra napkins please',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('totalAmount');
      expect(res.body.status).toBe('Pending');
      expect(res.body.items.length).toBe(1);
      sampleOrderId = res.body._id || res.body.id;
    });

    it('customer retrieves their own orders via GET /api/orders/my', async () => {
      const res = await request(app)
        .get('/api/orders/my')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('prevents customer from changing order status (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/orders/${sampleOrderId}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'Served' });

      expect(res.status).toBe(403);
    });

    it('rejects invalid status transitions (e.g. Pending directly to Served)', async () => {
      const res = await request(app)
        .patch(`/api/orders/${sampleOrderId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'Served' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/cannot transition/i);
    });

    it('allows manager to progress order through sequence: Pending -> Preparing -> Ready', async () => {
      // 1. Advance to Preparing
      const res1 = await request(app)
        .patch(`/api/orders/${sampleOrderId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'Preparing' });

      expect(res1.status).toBe(200);
      expect(res1.body.status).toBe('Preparing');

      // 2. Advance to Ready
      const res2 = await request(app)
        .patch(`/api/orders/${sampleOrderId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'Ready' });

      expect(res2.status).toBe(200);
      expect(res2.body.status).toBe('Ready');
    });

    it('allows customer to cancel an order only while Pending', async () => {
      // Create a fresh order to cancel
      const newOrderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{ menuItemId: sampleMenuItemId, quantity: 1 }],
        });

      const cancelId = newOrderRes.body._id || newOrderRes.body.id;

      const cancelRes = await request(app)
        .delete(`/api/orders/${cancelId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.order.status).toBe('Cancelled');
    });
  });

  // -------------------------------------------------------------
  // 6. TABLE AVAILABILITY & RESERVATIONS
  // -------------------------------------------------------------
  describe('Reservations & Table Availability', () => {
    const day = 10 + (uniqueSuffix % 15);
    const testDate = `2027-03-${day < 10 ? '0' + day : day}`;
    let nonConflictResId = '';

    it('checks availability for a specific date via GET /api/reservations/availability', async () => {
      const res = await request(app)
        .get(`/api/reservations/availability?date=${testDate}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalTables).toBeGreaterThanOrEqual(6);
      expect(Array.isArray(res.body.availableTables)).toBe(true);
    });

    it('rejects reservation booking if party size exceeds table capacity (400)', async () => {
      // Table 1 has capacity 2; try to book for 10
      const res = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          tableNumber: 1,
          date: testDate,
          time: '19:00',
          partySize: 10,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/exceeds Table 1 capacity/i);
    });

    it('books a reservation for Table 3 successfully (201 Created)', async () => {
      const res = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          tableNumber: 3,
          date: testDate,
          time: '19:00',
          partySize: 4,
          specialRequests: 'Anniversary celebration',
        });

      expect(res.status).toBe(201);
      expect(res.body.tableNumber).toBe(3);
      expect(res.body.status).toBe('Pending');
      sampleReservationId = res.body._id || res.body.id;
    });

    it('prevents conflicting overlapping reservations on the same table (409 Conflict)', async () => {
      // Attempt to book Table 3 at 19:30 on the same date (within 90-min overlap window)
      const res = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          tableNumber: 3,
          date: testDate,
          time: '19:30',
          partySize: 2,
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already reserved/i);
    });

    it('allows non-overlapping reservation on the same table and date at a different time (e.g. 13:00)', async () => {
      // Table 3 at 13:00 does not conflict with 19:00
      const res = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          tableNumber: 3,
          date: testDate,
          time: '13:00',
          partySize: 2,
        });

      expect(res.status).toBe(201);
      expect(res.body.tableNumber).toBe(3);
      nonConflictResId = res.body._id || res.body.id;
    });

    it('customer fetches their own reservations via GET /api/reservations/my', async () => {
      const res = await request(app)
        .get('/api/reservations/my')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('manager accepts/confirms reservation via PATCH /api/reservations/:id/status', async () => {
      const res = await request(app)
        .patch(`/api/reservations/${sampleReservationId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ status: 'Confirmed' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('Confirmed');
    });

    it('customer cancels their reservation via DELETE /api/reservations/:id', async () => {
      const res = await request(app)
        .delete(`/api/reservations/${sampleReservationId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.reservation.status).toBe('Cancelled');

      if (nonConflictResId) {
        await request(app)
          .delete(`/api/reservations/${nonConflictResId}`)
          .set('Authorization', `Bearer ${customerToken}`);
      }
    });
  });
});
