
const { db } = require('../config/firebase');

async function testFirestore() {
  const testRef = db.collection('_connection_tests').doc('restaurant-app-test');

  try {
    await testRef.set({
      message: 'Firestore connection successful',
      testedAt: new Date().toISOString(),
    });

    console.log('SUCCESS: Data written to Firestore');

    const snapshot = await testRef.get();

    if (!snapshot.exists) {
      throw new Error('Test document was not found');
    }

    console.log('SUCCESS: Data read from Firestore');
    console.log('Test data:', snapshot.data());
  } catch (error) {
    console.error('Firestore test failed:', error.message);
    process.exitCode = 1;
  } finally {
    try {
      await testRef.delete();
      console.log('Test document cleaned up');
    } catch (error) {
      console.error('Could not delete test document:', error.message);
      process.exitCode = 1;
    }
  }
}

testFirestore();

