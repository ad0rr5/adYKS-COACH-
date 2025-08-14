
import { initializeApp } from "firebase/app";
import {
    getAuth,
    onAuthStateChanged,
    signInAnonymously,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    type User
} from "firebase/auth";
import {
    getFirestore,
    doc,
  getDoc,
    onSnapshot,
    setDoc,
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    serverTimestamp,
    updateDoc,
    type DocumentData
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBdPLTq4bG4zdx4K2bevgMaGZwWrKqyPzU",
  authDomain: "ai-studio-koc.firebaseapp.com",
  projectId: "ai-studio-koc",
  storageBucket: "ai-studio-koc.appspot.com",
  messagingSenderId: "191116218089",
  appId: "1:191116218089:web:fa580f323374fa1748ea78",
  measurementId: "G-459QHNHR2M"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Google provider ayarları
googleProvider.addScope('profile');
googleProvider.addScope('email');

export {
  auth,
  db,
  googleProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc,
};
export type { User, DocumentData };
