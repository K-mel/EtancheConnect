importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAUfMDvNFDnAEpAOGEsxpxfLRTGQmqbRaU",
  authDomain: "etancheconnect-aa1a8.firebaseapp.com",
  projectId: "etancheconnect-aa1a8",
  storageBucket: "etancheconnect-aa1a8.firebasestorage.app",
  messagingSenderId: "158420555940",
  appId: "1:158420555940:web:1f8c6d9c16b488f7a02e31"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Gérer les notifications en arrière-plan
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png',
    badge: '/logo192.png',
    data: payload.data,
    click_action: payload.notification.click_action
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
