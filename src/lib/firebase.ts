
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDki-jbFgZ9GWFXAQxQXXdXQuHe9ucrtdQ",
  authDomain: "linx-ff15a.firebaseapp.com",
  projectId: "linx-ff15a",
  storageBucket: "linx-ff15a.firebasestorage.app",
  messagingSenderId: "110116630284",
  appId: "1:110116630284:web:58150f22c18d2c45e1e329",
  measurementId: "G-ZPJ9QS7ET5"
};

let app: FirebaseApp;
let analytics;

console.log("Firebase: Initializing Firebase SDK module...");

if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    console.log("Firebase: SDK initialized successfully with provided config. Project ID:", firebaseConfig.projectId);
    isSupported().then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
        console.log("Firebase Analytics: Service initialized.");
      } else {
        console.log("Firebase Analytics: Service not supported in this environment.");
      }
    }).catch(err => console.error("Firebase Analytics: Error initializing:", err));
  } catch (e) {
    console.error("Firebase: CRITICAL ERROR initializing app:", e);
    // If app initialization fails, subsequent getAuth etc. will also fail.
    // @ts-ignore
    app = null; // Ensure app is null if init fails
  }
} else {
  app = getApps()[0];
  console.log("Firebase: SDK already initialized. Project ID:", app.options.projectId);
  if (!analytics) { // Check if analytics needs to be initialized for an existing app
      isSupported().then((supported) => {
        if (supported) {
          analytics = getAnalytics(app);
          console.log("Firebase Analytics: Service initialized for existing app instance.");
        }
      }).catch(err => console.error("Firebase Analytics: Error re-checking support:", err));
  }
}

// Ensure app is defined before trying to get services
const auth = app ? getAuth(app) : null;
const firestore = app ? getFirestore(app) : null;
const functions = app ? getFunctions(app) : null;
const storage = app ? getStorage(app) : null;

if (auth && firestore && functions && storage) {
  console.log("Firebase: Services (Auth, Firestore, Functions, Storage) obtained from app instance.");
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
    console.log("Firebase Emulators: NEXT_PUBLIC_USE_FIREBASE_EMULATORS is 'true'. Attempting to connect to emulators...");
    try {
      console.log("Firebase Emulators: Attempting to connect Auth emulator to http://127.0.0.1:9099...");
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      console.log("Firebase Emulators: Auth emulator connection configured for http://127.0.0.1:9099.");

      console.log("Firebase Emulators: Attempting to connect Firestore emulator to 127.0.0.1:8080...");
      connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
      console.log("Firebase Emulators: Firestore emulator connection configured for 127.0.0.1:8080.");

      console.log("Firebase Emulators: Attempting to connect Functions emulator to 127.0.0.1:5001...");
      connectFunctionsEmulator(functions, '127.0.0.1', 5001);
      console.log("Firebase Emulators: Functions emulator connection configured for 127.0.0.1:5001.");

      console.log("Firebase Emulators: Attempting to connect Storage emulator to 127.0.0.1:9199...");
      connectStorageEmulator(storage, '127.0.0.1', 9199);
      console.log("Firebase Emulators: Storage emulator connection configured for 127.0.0.1:9199.");

      console.log("Firebase Emulators: All emulator connections configured. First actual operation will attempt connection.");
    } catch (error) {
      console.error("Firebase Emulators: CRITICAL ERROR configuring emulator connections:", error);
      console.error("Firebase Emulators: Ensure emulators are running and accessible on the specified ports.");
    }
  } else {
    console.log("Firebase Production: NEXT_PUBLIC_USE_FIREBASE_EMULATORS is not 'true' or not set. Attempting to connect to PRODUCTION Firebase services.");
  }
} else {
  console.error("Firebase: CRITICAL ERROR - One or more Firebase services (Auth, Firestore, Functions, Storage) could not be initialized because the app instance is not valid. Check for SDK initialization errors above.");
}

// Export possibly null services. Code using them should check.
export { app, auth, firestore, functions, storage, analytics };
