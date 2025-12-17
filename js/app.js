// Utilidades de UI
function togglePassword(id) {
  const input = document.getElementById(id);
  input.type = input.type === 'password' ? 'text' : 'password';
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('active');
}

function showSection(section) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  const link = document.querySelector(`.nav-item[data-section="${section}"]`);
  const el = document.getElementById(`section-${section}`);
  if (link) link.classList.add('active');
  if (el) el.classList.add('active');
}

function showToast(type, message) {
  const toast = document.getElementById('toast');
  toast.className = `toast show ${type}`;
  toast.textContent = message;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Login/Logout
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    try {
      await window.auth.signInWithEmailAndPassword(email, password);
      showToast('success', 'Bem-vindo!');
    } catch (err) {
      console.error(err);
      showToast('error', 'Falha no login. Verifique suas credenciais.');
    }
  });
}

function logout() {
  window.auth.signOut();
}

// Estado de autenticação
window.auth.onAuthStateChanged((user) => {
  const loginScreen = document.getElementById('login-screen');
  const dashboardScreen = document.getElementById('dashboard-screen');
  const userName = document.getElementById('user-name');
  if (user) {
    loginScreen.classList.remove('active');
    dashboardScreen.classList.add('active');
    userName.textContent = user.email || 'Antonio';
    showSection('dashboard');
    atualizarDataAtual();
    carregarEstoque();
    carregarMovimentacoes();
    carregarVendasRecentes();
    atualizarSaldoCaixa();
  } else {
    dashboardScreen.classList.remove('active');
    loginScreen.classList.add('active');
  }
});

function atualizarDataAtual() {
  const el = document.getElementById('current-date');
  if (!el) return;
  const now = new Date();
  const fmt = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  el.textContent = fmt.charAt(0).toUpperCase() + fmt.slice(1);
}

// Modal helpers
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Exposição global
window.togglePassword = togglePassword;
window.toggleSidebar = toggleSidebar;
window.showSection = showSection;
window.logout = logout;
window.closeModal = closeModal;