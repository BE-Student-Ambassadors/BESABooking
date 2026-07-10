// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import type { FirebaseApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyBUtOkFHcZYETVyUZtb5_fiDhxRhcQHVkw",
  authDomain: "besa-app.firebaseapp.com",
  projectId: "besa-app",
  storageBucket: "besa-app.firebasestorage.app",
  messagingSenderId: "993937979015",
  appId: "1:993937979015:web:be329cc32dcadf619e6a22",
  measurementId: "G-1WFWN4H0Q3"
};

const app: FirebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
