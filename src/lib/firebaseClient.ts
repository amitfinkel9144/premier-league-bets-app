// src/lib/firebaseClient.ts
import { initializeApp } from 'firebase/app';

export const app = initializeApp({
  apiKey: "AIzaSyC9r04m3X8YPN5k5uw4v3Fo-EfvSuMttrU",
  authDomain: "premier-league-bets.firebaseapp.com",
  projectId: "premier-league-bets",
  storageBucket: "premier-league-bets.appspot.com", // תוקן כאן!
  messagingSenderId: "1088957651109",
  appId: "1:1088957651109:web:c6f0a0a3c910052fba954c",
  measurementId: "G-V2YQC3T3ED"
});
