
import * as admin from 'firebase-admin';
import serviceAccount from "./serviceAccountKey.json";

const isServiceAccountPopulated = serviceAccount.project_id && serviceAccount.project_id !== 'please-replace-with-your-project-id';

// Check if the app is already initialized
if (!admin.apps.length) {
    if(isServiceAccountPopulated) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
            });
            console.log("[Firebase Admin] SDK initialized successfully with service account.");
        } catch (error) {
            console.error("[Firebase Admin] CRITICAL ERROR initializing with service account credentials. Make sure your serviceAccountKey.json is valid.", error);
        }
    } else {
        console.warn("\n\n[Firebase Admin] INITIALIZATION SKIPPED: `serviceAccountKey.json` is not populated. Please replace placeholder values with your actual Firebase project credentials to enable server-side database features.\n\n");
    }
}

// Conditionally export the services. They will be undefined if initialization fails or is skipped.
const firestoreAdmin = admin.apps.length ? admin.firestore() : null;
const authAdmin = admin.apps.length ? admin.auth() : null;
const FieldValue = admin.apps.length ? admin.firestore.FieldValue : undefined;
const Timestamp = admin.apps.length ? admin.firestore.Timestamp : undefined;

export { firestoreAdmin, authAdmin, FieldValue, Timestamp };
