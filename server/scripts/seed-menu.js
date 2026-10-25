
const { db } = require('../config/firebase');
const { MENU_ITEMS_COLLECTION } = require('../config/collections');

const menuItems = [
  {
    name: 'Classic Burger',
    description: 'Beef patty, cheese, lettuce and special sauce',
    category: 'Burgers',
    price: 8.99,
    emoji: '🍔',
  },
  {
    name: 'Margherita Pizza',
    description: 'Tomato, mozzarella and fresh basil',
    category: 'Pizza',
    price: 10.99,
    emoji: '🍕',
  },
  {
    name: 'Creamy Pasta',
    description: 'Creamy sauce, parmesan and herbs',
    category: 'Pasta',
    price: 9.99,
    emoji: '🍝',
  },
  {
    name: 'Fried Chicken',
    description: 'Crispy chicken served with fries',
    category: 'Chicken',
    price: 11.99,
    emoji: '🍗',
  },
];

async function seedMenu() {
  const collection = db.collection(MENU_ITEMS_COLLECTION);

  try {
    for (const item of menuItems) {
      const existing = await collection
        .where('name', '==', item.name)
        .limit(1)
        .get();

      if (!existing.empty) {
        console.log(`Already exists: ${item.name}`);
        continue;
      }

      await collection.add({
        ...item,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      console.log(`Added: ${item.name}`);
    }

    console.log('Menu seeding completed.');
  } catch (error) {
    console.error('Menu seeding failed:', error.message);
    process.exitCode = 1;
  } finally {
    await db.terminate();
  }
}

seedMenu();

