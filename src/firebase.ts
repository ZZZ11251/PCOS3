import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, addDoc, getDocs, updateDoc, doc, query, orderBy, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "gen-lang-client-0659401417",
  appId: "1:309830777034:web:8127e0bd5e182eb891dc33",
  apiKey: "AIzaSyB4FsZ8NOS-IqzQ2KjrOYwCZZLUwHiiLsU",
  authDomain: "gen-lang-client-0659401417.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-24f49596-3081-46eb-899c-c3536e47e949",
  storageBucket: "gen-lang-client-0659401417.firebasestorage.app",
  messagingSenderId: "309830777034",
  measurementId: ""
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore specifying custom database ID and forcing long-polling for mobile/unstable connection robustness
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export { collection, addDoc, getDocs, updateDoc, doc, query, orderBy, deleteDoc };
