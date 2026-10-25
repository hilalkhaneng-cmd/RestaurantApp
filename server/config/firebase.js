const fs = require('fs');
const path = require('path');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccountPath = path.join(
  __dirname,
  '..',
  'firebase-service-account.json'
);

function initFirebase() {
  if (!fs.existsSync(serviceAccountPath)) {
    const errorMsg =
      'Firebase initialization error: Service account key file not found.\n' +
      'Expected location: server/firebase-service-account.json\n' +
      'To obtain this file:\n' +
      '  1. Open Firebase Console (https://console.firebase.google.com)\n' +
      '  2. Navigate to Project Settings -> Service accounts\n' +
      '  3. Click "Generate new private key"\n' +
      '  4. Save the downloaded JSON file as server/firebase-service-account.json';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  let serviceAccount;
  try {
    const content = fs.readFileSync(serviceAccountPath, 'utf8');
    serviceAccount = JSON.parse(content);
  } catch (err) {
    const errorMsg = `Firebase initialization error: Failed to parse service account JSON: ${err.message}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const app =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          credential: cert(serviceAccount),
        });

  const db = getFirestore(app);

  return { app, db };
}

const { app, db } = initFirebase();

module.exports = {
  db,
  app,
};
