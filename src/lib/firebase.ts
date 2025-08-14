// ✅ src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: 'AIzaSyC9r04m3X8YPN5k5uw4v3Fo-EfvSuMttrU',
  authDomain: 'premier-league-bets.firebaseapp.com',
  projectId: 'premier-league-bets',
  storageBucket: 'premier-league-bets.appspot.com',
  messagingSenderId: '1088957651109',
  appId: '1:1088957651109:web:c6f0a0a3c910052fba954c',
  measurementId: 'G-V2YQC3T3ED',
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export { app, messaging }; // ✅ זה מה שחסר
