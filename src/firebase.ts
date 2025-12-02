// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import { GoogleAuthProvider } from 'firebase/auth';

// import dotenv from "dotenv";

// const dot = dotenv.config()

console.log("API KEY:", import.meta.env.VITE_FIREBASE_APIKEY);

const firebaseConfig = {
  apiKey: "AIzaSyBUtOkFHcZYETVyUZtb5_fiDhxRhcQHVkw",
  authDomain: "besa-app.firebaseapp.com",
  projectId: "besa-app",
  storageBucket: "besa-app.firebasestorage.app",
  messagingSenderId:"993937979015",
  appId: "1:993937979015:web:be329cc32dcadf619e6a22",
  measurementId: "G-1WFWN4H0Q3"
};

const app: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

export { auth, googleProvider, db };
