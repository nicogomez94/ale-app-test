import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// These values should be provided by the user in their Firebase Console
// For the purpose of this demo, we use placeholders.
// The user will need to replace these with their actual config.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "pas-alert.firebaseapp.com",
  projectId: "pas-alert",
  storageBucket: "pas-alert.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
