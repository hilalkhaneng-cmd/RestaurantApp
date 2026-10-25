const express = require('express');
const store = require('../data/store');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// POST /api/orders (Customer or Manager places an order)
router.post('/', authenticateToken, async (req, res) => {
  const { items, notes } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item' });
  }

  const resolvedItems = [];
  let calculatedTotal = 0;

  for (const it of items) {
    const menuItemId = it.menuItemId || it.id || it._id;
    if (!menuItemId) {
      return res.status(400).json({ error: 'Each item must have a menuItemId' });
    }

    const qty = Number(it.quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ error: 'Each item quantity must be a positive integer' });
    }

    const menuItem = await store.menu.findById(menuItemId);
    if (!menuItem) {
      return res.status(404).json({ error: `Menu item not found: ${menuItemId}` });
    }

    if (menuItem.available === false) {
      return res.status(400).json({ error: `Item "${menuItem.name}" is currently unavailable` });
    }

    resolvedItems.push({
      menuItemId: String(menuItem._id || menuItem.id),
      name: menuItem.name,
      price: menuItem.price,
      quantity: qty,
    });

    calculatedTotal += menuItem.price * qty;
  }

  try {
    const order = await store.orders.create({
      user: req.user,
      items: resolvedItems,
      totalAmount: calculatedTotal,
      notes: typeof notes === 'string' ? notes.trim().slice(0, 300) : '',
    });

    return res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error.message);
    return res.status(500).json({ error: 'Failed to create order' });
  }
});

// GET /api/orders/my (Customer views their own orders)
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const list = await store.orders.list({ userId, isManager: false });
    return res.status(200).json(list);
  } catch (error) {
    console.error('Error fetching customer orders:', error.message);
    return res.status(500).json({ error: 'Failed to fetch your orders' });
  }
});

// GET /api/orders (Manager views all orders, or fallback to user's own)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const isManager = req.user.role === 'manager';
    const userId = req.user._id || req.user.id;
    const list = await store.orders.list({ userId, isManager });
    return res.status(200).json(list);
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await store.orders.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const userId = String(req.user._id || req.user.id);
    const orderUserId = String(order.user?._id || order.user?.id || order.user);

    if (req.user.role !== 'manager' && userId !== orderUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.status(200).json(order);
  } catch (error) {
    console.error('Error fetching order:', error.message);
    return res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// PATCH /api/orders/:id/status (Manager updates status with sequence validation)
// Sequence: Pending -> Preparing -> Ready -> Served
router.patch('/:id/status', authenticateToken, requireManager, async (req, res) => {
  const { status } = req.body || {};

  if (!status) {
    return res.status(400).json({
      error: `Status is required. Must be one of: ${store.orders.VALID_STATUSES.join(', ')}`,
    });
  }

  try {
    const result = await store.orders.updateStatus(req.params.id, status);
    if (result.error) {
      return res.status(result.code || 400).json({ error: result.error });
    }
    return res.status(200).json(result.order);
  } catch (error) {
    console.error('Error updating order status:', error.message);
    return res.status(500).json({ error: 'Failed to update order status' });
  }
});

// DELETE /api/orders/:id (Cancel order - only allowed if Pending)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const isManager = req.user.role === 'manager';
    const result = await store.orders.cancel(req.params.id, userId, isManager);

    if (result.error) {
      return res.status(result.code || 400).json({ error: result.error });
    }

    return res.status(200).json({
      message: 'Order cancelled successfully',
      order: result.order,
    });
  } catch (error) {
    console.error('Error cancelling order:', error.message);
    return res.status(500).json({ error: 'Failed to cancel order' });
  }
});

module.exports = router;
