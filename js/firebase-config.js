// Configuração multi-projeto para facilitar troca de caminho/ID do app
// Você pode alternar via query string ?project=mercearia | ?project=winged
// ou via localStorage.setItem('firebaseProject', 'mercearia')

const firebaseConfigs = {
  mercearia: {
    apiKey: "AIzaSyA-R6PbKw53ODnaNMjhusP5ovw3hA62nE0",
    authDomain: "mercearia-antonio-62e60.firebaseapp.com",
    projectId: "mercearia-antonio-62e60",
    // Valor fornecido pelo SDK; se usar Storage, mantenha este
    storageBucket: "mercearia-antonio-62e60.firebasestorage.app",
    messagingSenderId: "692309702444",
    appId: "1:692309702444:web:c4587eceff3e71a9095e89",
    measurementId: "G-1J01PY9DT8"
  },
  // Preencha estes valores com o SDK Web do projeto winged-signal-460618-e3
  // Exemplo de uso depois de preencher: adicionar ?project=winged na URL
  winged: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
  }
};

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function selectProjectKey() {
  const fromQuery = getQueryParam('project');
  if (fromQuery && firebaseConfigs[fromQuery]) return fromQuery;
  const fromStorage = window.localStorage.getItem('firebaseProject');
  if (fromStorage && firebaseConfigs[fromStorage]) return fromStorage;
  return 'mercearia';
}

const selectedKey = selectProjectKey();
const selectedConfig = firebaseConfigs[selectedKey];

// Expor para debug/inspeção
window.firebaseConfigs = firebaseConfigs;
window.firebaseProjectKey = selectedKey;
window.firebaseConfig = selectedConfig;
console.log('[Firebase] Projeto selecionado:', selectedKey, 'ProjectId:', selectedConfig && selectedConfig.projectId);

// Aviso caso o projeto alternativo não esteja preenchido
if (!selectedConfig || !selectedConfig.projectId) {
  console.error('Firebase config ausente para o projeto selecionado. Preencha firebaseConfigs.', { selectedKey });
  alert('Configuração Firebase incompleta para o projeto selecionado. Volte ao projeto padrão ou preencha o SDK.');
}

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