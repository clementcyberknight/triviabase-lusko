// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import {
  getDatabase,
  ref,
  update,
  off,
  set,
  get,
  onValue,
  push,
  query,
  orderByChild,
} from "firebase/database";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
  databaseURL: "https://trivialbased-default-rtdb.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_APP_ID,
  measurementId: "G-Y9GH0H2N87",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const db = getFirestore(app);

export {
  app,
  database,
  db,
  update,
  ref,
  off,
  set,
  get,
  getDatabase,
  push,
  onValue,
  query,
  orderByChild,
  doc,
  getDoc,
  setDoc,
};
