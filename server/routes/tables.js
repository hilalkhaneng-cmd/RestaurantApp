const express = require('express');
const store = require('../data/store');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/tables (Public or Authenticated) - List restaurant tables
router.get('/', async (req, res) => {
  try {
    const list = await store.tables.list();
    return res.status(200).json(list);
  } catch (error) {
    console.error('Error fetching tables:', error.message);
    return res.status(500).json({ error: 'Failed to fetch restaurant tables' });
  }
});

// GET /api/tables/:tableNumber
router.get('/:tableNumber', async (req, res) => {
  try {
    const table = await store.tables.findByNumber(req.params.tableNumber);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    return res.status(200).json(table);
  } catch (error) {
    console.error('Error fetching table:', error.message);
    return res.status(500).json({ error: 'Failed to fetch table details' });
  }
});

module.exports = router;
