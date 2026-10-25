const express = require('express');
const store = require('../data/store');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

function validateReservationBody(body, partial = false) {
  if (!body || typeof body !== 'object') {
    return 'Request body must be a JSON object';
  }

  if (!partial) {
    for (const field of ['tableNumber', 'date', 'time', 'partySize']) {
      if (!(field in body)) return `${field} is required`;
    }
  }

  if ('tableNumber' in body) {
    const t = Number(body.tableNumber);
    if (!Number.isInteger(t) || t < 1) {
      return 'tableNumber must be a positive integer';
    }
  }

  if ('date' in body && !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return 'date must be in YYYY-MM-DD format (e.g. 2026-11-15)';
  }

  if ('time' in body && !/^\d{2}:\d{2}$/.test(body.time)) {
    return 'time must be in HH:MM format (e.g. 19:30)';
  }

  if ('partySize' in body) {
    const p = Number(body.partySize);
    if (!Number.isInteger(p) || p < 1 || p > 20) {
      return 'partySize must be an integer between 1 and 20';
    }
  }

  return null;
}

// GET /api/reservations/availability?date=YYYY-MM-DD&time=HH:MM
router.get('/availability', authenticateToken, async (req, res) => {
  const { date, time } = req.query;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date query parameter is required in YYYY-MM-DD format' });
  }

  try {
    const availability = await store.reservations.getAvailability(date, time);
    return res.status(200).json(availability);
  } catch (error) {
    console.error('Error checking availability:', error.message);
    return res.status(500).json({ error: 'Failed to check table availability' });
  }
});

// GET /api/reservations/my (Customer views their own reservations)
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const list = await store.reservations.list({ userId, isManager: false });
    return res.status(200).json(list);
  } catch (error) {
    console.error('Error fetching customer reservations:', error.message);
    return res.status(500).json({ error: 'Failed to fetch your reservations' });
  }
});

// POST /api/reservations (Customer or Manager reserves a table)
router.post('/', authenticateToken, async (req, res) => {
  const validationError = validateReservationBody(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { tableNumber, date, time, partySize, specialRequests } = req.body;
  const t = Number(tableNumber);
  const p = Number(partySize);

  try {
    // 1. Verify table exists and check party size capacity
    const table = await store.tables.findByNumber(t);
    if (!table) {
      return res.status(404).json({ error: `Table ${t} does not exist.` });
    }

    if (p > table.capacity) {
      return res.status(400).json({
        error: `Party size of ${p} exceeds Table ${t} capacity of ${table.capacity} guests. Please select a larger table.`,
      });
    }

    // 2. Conflict prevention: check for overlapping time on same table & date
    const conflict = await store.reservations.checkConflict(t, date, time);
    if (conflict) {
      return res.status(409).json({
        error: `Table ${t} is already reserved on ${date} around ${conflict.time} (conflict window: ±${store.reservations.SLOT_DURATION} mins). Please choose a different table or time.`,
      });
    }

    // 3. Create reservation in Firestore
    const reservation = await store.reservations.create({
      user: req.user,
      tableNumber: t,
      date,
      time,
      partySize: p,
      specialRequests: typeof specialRequests === 'string' ? specialRequests.trim().slice(0, 300) : '',
    });

    return res.status(201).json(reservation);
  } catch (error) {
    console.error('Error creating reservation:', error.message);
    return res.status(500).json({ error: 'Failed to create reservation' });
  }
});

// GET /api/reservations (Manager sees all, or customer sees own)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const isManager = req.user.role === 'manager';
    const userId = req.user._id || req.user.id;
    const list = await store.reservations.list({ userId, isManager });
    return res.status(200).json(list);
  } catch (error) {
    console.error('Error fetching reservations:', error.message);
    return res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

// GET /api/reservations/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const reservation = await store.reservations.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const userId = String(req.user._id || req.user.id);
    const reservationUserId = String(reservation.user?._id || reservation.user?.id || reservation.user);

    if (req.user.role !== 'manager' && userId !== reservationUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.status(200).json(reservation);
  } catch (error) {
    console.error('Error fetching reservation:', error.message);
    return res.status(500).json({ error: 'Failed to fetch reservation' });
  }
});

// PATCH /api/reservations/:id/status (Manager updates/accepts/declines reservation status)
// Options: 'Pending', 'Confirmed', 'Declined', 'Cancelled'
router.patch('/:id/status', authenticateToken, requireManager, async (req, res) => {
  const { status } = req.body || {};

  if (!status) {
    return res.status(400).json({
      error: 'Status is required (Pending, Confirmed, Declined, Cancelled)',
    });
  }

  try {
    const result = await store.reservations.updateStatus(req.params.id, status);
    if (result.error) {
      return res.status(result.code || 400).json({ error: result.error });
    }
    return res.status(200).json(result.reservation);
  } catch (error) {
    console.error('Error updating reservation status:', error.message);
    return res.status(500).json({ error: 'Failed to update reservation status' });
  }
});

// DELETE /api/reservations/:id (Customer cancels own reservation, Manager can cancel any)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const isManager = req.user.role === 'manager';
    const result = await store.reservations.cancel(req.params.id, userId, isManager);

    if (result.error) {
      return res.status(result.code || 400).json({ error: result.error });
    }

    return res.status(200).json({
      message: 'Reservation cancelled successfully',
      reservation: result.reservation,
    });
  } catch (error) {
    console.error('Error cancelling reservation:', error.message);
    return res.status(500).json({ error: 'Failed to cancel reservation' });
  }
});

module.exports = router;
