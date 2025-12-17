// Substitua os valores abaixo pela sua configuração do Firebase
// Projeto SaaS: Mercearia do Antonio

window.firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
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