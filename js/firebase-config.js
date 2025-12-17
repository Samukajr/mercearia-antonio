// Substitua os valores abaixo pela sua configuração do Firebase
// Projeto SaaS: Mercearia do Antonio

window.firebaseConfig = {
  apiKey: "AIzaSyA-R6PbKw53ODnaNMjhusP5ovw3hA62nE0",
  authDomain: "mercearia-antonio-62e60.firebaseapp.com",
  projectId: "mercearia-antonio-62e60",
  storageBucket: "mercearia-antonio-62e60.firebasestorage.app",
  messagingSenderId: "692309702444",
  appId: "1:692309702444:web:c4587eceff3e71a9095e89",
  measurementId: "G-1J01PY9DT8"
};

firebase.initializeApp(window.firebaseConfig);

window.auth = firebase.auth();
window.db = firebase.firestore();

// Registro do Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Caminho relativo para funcionar em GitHub Pages (subpasta)
    navigator.serviceWorker.register('service-worker.js').catch(console.error);
  });
}