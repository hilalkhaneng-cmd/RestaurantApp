const express = require('express');
const store = require('../data/store');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

const validString = (value, maxLength) =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  value.trim().length <= maxLength;

function validateMenuItem(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be a JSON object';
  }

  const fields = ['name', 'description', 'category', 'price'];

  if (!partial) {
    for (const field of fields) {
      if (!(field in body)) return `${field} is required`;
    }
  }

  if ('name' in body && !validString(body.name, 100)) {
    return 'Name must be a non-empty string of at most 100 characters';
  }

  if ('description' in body && !validString(body.description, 500)) {
    return 'Description must be a non-empty string of at most 500 characters';
  }

  if ('category' in body && !validString(body.category, 50)) {
    return 'Category must be a non-empty string of at most 50 characters';
  }

  if (
    'price' in body &&
    (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price <= 0)
  ) {
    return 'Price must be a positive number';
  }

  if (
    'emoji' in body &&
    (typeof body.emoji !== 'string' || body.emoji.length > 20)
  ) {
    return 'Emoji must be a string of at most 20 characters';
  }

  const allowedFields = new Set([
    'name',
    'description',
    'category',
    'price',
    'emoji',
    'available',
  ]);

  if (Object.keys(body).some((key) => !allowedFields.has(key))) {
    return 'Request contains unsupported fields';
  }

  return null;
}

// GET /api/menu (Public, supports ?category=&search=)
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const items = await store.menu.list({ category, search });
    return res.status(200).json(items);
  } catch (error) {
    console.error('Error fetching menu items:', error.message);
    return res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// GET /api/menu/categories (Public)
router.get('/categories', async (req, res) => {
  try {
    const categories = await store.menu.getCategories();
    return res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error.message);
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/menu/:id (Public)
router.get('/:id', async (req, res) => {
  try {
    const item = await store.menu.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    return res.status(200).json(item);
  } catch (error) {
    console.error('Error fetching menu item:', error.message);
    return res.status(500).json({ error: 'Failed to fetch menu item' });
  }
});

// POST /api/menu (Manager only)
router.post('/', authenticateToken, requireManager, async (req, res) => {
  const validationError = validateMenuItem(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const newItem = await store.menu.create(req.body);
    return res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating menu item:', error.message);
    return res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// PUT /api/menu/:id (Manager only)
router.put('/:id', authenticateToken, requireManager, async (req, res) => {
  const validationError = validateMenuItem(req.body, true);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  if (Object.keys(req.body || {}).length === 0) {
    return res.status(400).json({ error: 'Provide at least one field to update' });
  }

  try {
    const updated = await store.menu.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    return res.status(200).json(updated);
  } catch (error) {
    console.error('Error updating menu item:', error.message);
    return res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// DELETE /api/menu/:id (Manager only)
router.delete('/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const deleted = await store.menu.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    return res.status(200).json({ message: 'Menu item deleted successfully', id: req.params.id });
  } catch (error) {
    console.error('Error deleting menu item:', error.message);
    return res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

module.exports = router;
