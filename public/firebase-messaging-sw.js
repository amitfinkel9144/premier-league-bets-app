// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyC9r84mX8BYPN5k5uw4v3Fo-EfvSuMttrU',
  authDomain: 'premier-league-bets.firebaseapp.com',
  projectId: 'premier-league-bets',
  storageBucket: 'premier-league-bets.appspot.com',
  messagingSenderId: '11808957651109',
  appId: '1:11808957651109:web:cf60a0a3c910852fba954c',
  measurementId: 'G-V2YCQ3T3ED',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log('[firebase-messaging-sw.js] Background message ', payload);
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/images/logo.jpeg',
  });
});
