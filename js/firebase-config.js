// Substitua os valores abaixo pela sua configuração do Firebase
// Projeto SaaS: Mercearia do Antonio

window.firebaseConfig = {
  apiKey: "AIzaSyBglv9QvSt_GzPgnCz2wMnXz06ZPWV1xh4",
  authDomain: "mercearia-antonio.firebaseapp.com",
  projectId: "mercearia-antonio",
  storageBucket: "mercearia-antonio.firebasestorage.app",
  messagingSenderId: "450965920692",
  appId: "1:450965920692:web:2280235c7b6a4b340ff0e1",
  measurementId: "G-6S9NHYBE15"
};

firebase.initializeApp(window.firebaseConfig);

window.auth = firebase.auth();
window.db = firebase.firestore();

// Registro do Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(console.error);
  });
}