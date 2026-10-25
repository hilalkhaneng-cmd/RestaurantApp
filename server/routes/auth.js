const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const store = require('../data/store');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is missing.');
  }
  return secret;
}

function signToken(user) {
  const userId = user._id || user.id;
  return jwt.sign(
    { id: String(userId), _id: String(userId), role: user.role, email: user.email },
    getJwtSecret(),
    { expiresIn: '1d' } // One-day expiry as required
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
    return res.status(400).json({ error: 'A valid email is required' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const existing = await store.users.findByEmail(email.trim());

    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Regular registration is ALWAYS customer role (no self-promotion)
    const newUser = await store.users.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: 'customer',
    });

    const token = signToken(newUser);

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: newUser._id || newUser.id,
        _id: newUser._id || newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    if (error.message.includes('JWT_SECRET')) {
      return res.status(500).json({ error: 'Server authentication configuration error: JWT_SECRET not set' });
    }
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    const user = await store.users.findByEmail(email.trim());

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id || user.id,
        _id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    if (error.message.includes('JWT_SECRET')) {
      return res.status(500).json({ error: 'Server authentication configuration error: JWT_SECRET not set' });
    }
    return res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me (protected profile check)
router.get('/me', authenticateToken, async (req, res) => {
  return res.status(200).json({
    user: {
      id: req.user._id || req.user.id,
      _id: req.user._id || req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

module.exports = router;
