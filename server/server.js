require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { db } = require('./config/firebase');
const store = require('./data/store');

const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const tableRoutes = require('./routes/tables');
const orderRoutes = require('./routes/orders');
const reservationRoutes = require('./routes/reservations');

const app = express();
const PORT = Number(process.env.PORT) || 5050;

app.disable('x-powered-by');

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reservations', reservationRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  let count = 0;
  try {
    const list = await store.menu.list();
    count = list.length;
  } catch (err) {
    count = -1;
  }

  res.status(200).json({
    status: 'ok',
    database: 'Firebase Firestore',
    menuItemsCount: count,
    time: new Date().toISOString(),
  });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// Central error handler
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON request body' });
  }

  console.error('API Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

/**
 * Verify Firestore initialization on startup
 */
async function initializeDatabase() {
  if (!db) {
    throw new Error('Firebase Firestore failed to initialize. Check server/firebase-service-account.json');
  }
  console.log('[Firebase] Connected to Firestore database.');
}

// Start server if run directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n=================================================`);
        console.log(`Restaurant API running on port ${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/api/health`);
        console.log(`Database in use: Firebase Firestore`);
        console.log(`=================================================\n`);
      });
    })
    .catch((err) => {
      console.error('Failed to start server:', err.message);
      process.exit(1);
    });
}

module.exports = { app, initializeDatabase };
