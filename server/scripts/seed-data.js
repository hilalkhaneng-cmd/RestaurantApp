/**
 * Firebase Firestore Comprehensive Seed Script
 * 
 * Populates Firestore with:
 *  - At least 1 Customer account (password hashed with bcrypt)
 *  - At least 1 Manager account (password hashed with bcrypt)
 *  - At least 15 Menu Items across multiple categories
 *  - At least 6 Restaurant Tables with capacities
 * 
 * Idempotent: Can be run multiple times safely without duplicating records or destroying existing users.
 * 
 * Usage:
 *   node scripts/seed-data.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const store = require('../data/store');
const { initializeDatabase } = require('../server');

const SAMPLE_USERS = [
  {
    name: 'Sample Customer',
    email: 'customer@restaurant.local',
    password: process.env.SEED_CUSTOMER_PASSWORD || 'Customer123!',
    role: 'customer',
  },
  {
    name: 'Restaurant Manager',
    email: 'manager@restaurant.local',
    password: process.env.SEED_MANAGER_PASSWORD || 'Manager123!',
    role: 'manager',
  },
];

const SAMPLE_TABLES = [
  { tableNumber: 1, capacity: 2, location: 'Window Booth', isAvailable: true },
  { tableNumber: 2, capacity: 2, location: 'Window Booth', isAvailable: true },
  { tableNumber: 3, capacity: 4, location: 'Main Dining Hall', isAvailable: true },
  { tableNumber: 4, capacity: 4, location: 'Main Dining Hall', isAvailable: true },
  { tableNumber: 5, capacity: 6, location: 'Garden Patio', isAvailable: true },
  { tableNumber: 6, capacity: 8, location: 'VIP Family Table', isAvailable: true },
];

const SAMPLE_MENU_ITEMS = [
  {
    name: 'Classic Burger',
    description: 'Juicy beef patty, melted cheddar, crisp lettuce, tomato and signature house sauce',
    category: 'Burgers',
    price: 8.99,
    emoji: '🍔',
    available: true,
  },
  {
    name: 'Double Bacon Cheeseburger',
    description: 'Two beef patties, smoked crispy bacon, American cheese, and caramelized onions',
    category: 'Burgers',
    price: 12.49,
    emoji: '🍔',
    available: true,
  },
  {
    name: 'Margherita Pizza',
    description: 'San Marzano tomato sauce, fresh mozzarella fior di latte, and aromatic basil',
    category: 'Pizza',
    price: 10.99,
    emoji: '🍕',
    available: true,
  },
  {
    name: 'Pepperoni Rustica Pizza',
    description: 'Spicy artisan pepperoni, mozzarella, crushed red pepper, and oregano',
    category: 'Pizza',
    price: 13.99,
    emoji: '🍕',
    available: true,
  },
  {
    name: 'Creamy Pasta Alfredo',
    description: 'Fettuccine ribbons tossed in a velvety parmesan cream sauce with cracked black pepper',
    category: 'Pasta',
    price: 9.99,
    emoji: '🍝',
    available: true,
  },
  {
    name: 'Spaghetti Bolognese',
    description: 'Slow-simmered beef ragù, plum tomatoes, fresh herbs and grated parmesan',
    category: 'Pasta',
    price: 11.99,
    emoji: '🍝',
    available: true,
  },
  {
    name: 'Fried Chicken Platter',
    description: 'Crispy Southern-style buttermilk chicken tenders served with seasoned golden fries',
    category: 'Chicken',
    price: 11.99,
    emoji: '🍗',
    available: true,
  },
  {
    name: 'Grilled Garlic Herb Chicken',
    description: 'Tender grilled chicken breast marinated with garlic, rosemary, and lemon butter',
    category: 'Chicken',
    price: 12.99,
    emoji: '🍗',
    available: true,
  },
  {
    name: 'Grilled Atlantic Salmon',
    description: 'Fresh pan-seared salmon fillet over sautéed baby spinach with dill lemon sauce',
    category: 'Seafood',
    price: 16.99,
    emoji: '🐟',
    available: true,
  },
  {
    name: 'Crispy Calamari',
    description: 'Lightly battered squid rings served with garlic aioli and lemon wedges',
    category: 'Seafood',
    price: 9.49,
    emoji: '🦑',
    available: true,
  },
  {
    name: 'Classic Caesar Salad',
    description: 'Crisp romaine hearts, toasted garlic croutons, aged parmesan, and creamy dressing',
    category: 'Salads',
    price: 7.99,
    emoji: '🥗',
    available: true,
  },
  {
    name: 'Mediterranean Greek Salad',
    description: 'Cucumbers, cherry tomatoes, Kalamata olives, feta cheese, and virgin olive oil',
    category: 'Salads',
    price: 8.49,
    emoji: '🥗',
    available: true,
  },
  {
    name: 'Warm Chocolate Lava Cake',
    description: 'Rich dark chocolate cake with a molten center, served with vanilla bean ice cream',
    category: 'Desserts',
    price: 6.99,
    emoji: '🍰',
    available: true,
  },
  {
    name: 'Classic Italian Tiramisu',
    description: 'Espresso-soaked ladyfingers layered with mascarpone cream and cocoa powder',
    category: 'Desserts',
    price: 6.49,
    emoji: '🍨',
    available: true,
  },
  {
    name: 'Fresh Mint Lemonade',
    description: 'Freshly squeezed lemons, crushed mint leaves, and pure cane sugar over ice',
    category: 'Beverages',
    price: 3.99,
    emoji: '🍹',
    available: true,
  },
  {
    name: 'Italian Espresso',
    description: 'Single-origin espresso shot with a rich crema layer',
    category: 'Beverages',
    price: 2.99,
    emoji: '☕',
    available: true,
  },
];

async function seed() {
  console.log('--- Starting Firestore Database Seed ---');
  await initializeDatabase();

  // 1. Seed Users
  console.log('\n[1/3] Checking Sample Users...');
  for (const u of SAMPLE_USERS) {
    const existing = await store.users.findByEmail(u.email);
    if (!existing) {
      const hashed = await bcrypt.hash(u.password, 12);
      const created = await store.users.create({
        name: u.name,
        email: u.email,
        password: hashed,
        role: u.role,
      });
      console.log(` ✓ Created ${u.role}: ${u.email} (ID: ${created._id || created.id})`);
    } else {
      if (existing.role !== u.role) {
        await store.users.setRole(existing._id || existing.id, u.role);
        console.log(` ✓ Updated ${existing.email} role to ${u.role}`);
      } else {
        console.log(` ✓ Existing ${u.role} confirmed: ${u.email}`);
      }
    }
  }

  // 2. Seed Tables
  console.log('\n[2/3] Checking Restaurant Tables...');
  for (const t of SAMPLE_TABLES) {
    const res = await store.tables.createOrUpdate(t);
    console.log(` ✓ Table ${res.tableNumber} (Capacity: ${res.capacity}, Location: ${res.location})`);
  }

  // 3. Seed Menu Items
  console.log('\n[3/3] Checking Menu Items (Minimum 15)...');
  const existingMenu = await store.menu.list();
  const existingNames = new Set(existingMenu.map((m) => m.name.toLowerCase()));

  let addedCount = 0;
  for (const item of SAMPLE_MENU_ITEMS) {
    if (!existingNames.has(item.name.toLowerCase())) {
      await store.menu.create(item);
      addedCount++;
      console.log(` ✓ Added item: ${item.name} (${item.category} - $${item.price})`);
    } else {
      console.log(` ✓ Already in menu: ${item.name}`);
    }
  }

  const finalMenu = await store.menu.list();
  console.log(`\n--- Firestore Seed Completed ---`);
  console.log(`Total Menu Items in Firestore: ${finalMenu.length}`);
  console.log(`Total Tables in Firestore: ${(await store.tables.list()).length}`);
  console.log(`Demo accounts:`);
  console.log(`  Customer: customer@restaurant.local / Customer123!`);
  console.log(`  Manager:  manager@restaurant.local  / Manager123!`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
