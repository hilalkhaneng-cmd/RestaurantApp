/**
 * Provision a Manager Account
 * 
 * Usage:
 *   node scripts/create-manager.js <name> <email> <password>
 * 
 * Example:
 *   node scripts/create-manager.js "Restaurant Manager" manager@restaurant.local ManagerSecure2026!
 * 
 * This creates a manager directly in the database. Ordinary users cannot assign
 * themselves the manager role through the public registration API.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const store = require('../data/store');
const { initializeDatabase } = require('../server');

const [, , name, email, password] = process.argv;

if (!name || !email || !password) {
  console.log('Usage: node scripts/create-manager.js <name> <email> <password>');
  console.log('Example: node scripts/create-manager.js "Manager Demo" manager@example.com ManagerPass123!');
  process.exit(1);
}

if (password.length < 6) {
  console.error('Password must be at least 6 characters long.');
  process.exit(1);
}

async function main() {
  await initializeDatabase();
  console.log('Using database: Firebase Firestore');

  const cleanEmail = email.trim().toLowerCase();
  const existing = await store.users.findByEmail(cleanEmail);

  if (existing) {
    if (existing.role === 'manager') {
      console.log(`✓ Account "${cleanEmail}" is already a manager.`);
    } else {
      await store.users.setRole(existing._id || existing.id, 'manager');
      console.log(`✓ Successfully promoted existing user "${cleanEmail}" to manager role.`);
    }
  } else {
    const hashedPassword = await bcrypt.hash(password, 12);
    const newManager = await store.users.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: 'manager',
    });
    console.log(`✓ Created manager account "${newManager.email}" (ID: ${newManager._id || newManager.id}).`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Error creating manager:', err.message);
  process.exit(1);
});
