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
      console.error('Erro de login', err);
      const code = err && err.code ? err.code : 'erro-desconhecido';
      const map = {
        'auth/invalid-email': 'Email inválido.',
        'auth/user-not-found': 'Usuário não encontrado.',
        'auth/wrong-password': 'Senha incorreta.',
        'auth/operation-not-allowed': 'Provedor desativado (ative Email/Password no Firebase).',
        'auth/unauthorized-domain': 'Domínio não autorizado (adicione github.io e seu-usuario.github.io em Auth → Settings).',
        'auth/network-request-failed': 'Falha de rede (verifique conexão ou bloqueios).'
      };
      const friendly = map[code] || 'Verifique credenciais e configuração do Firebase.';
      showToast('error', `Falha no login (${code}). ${friendly}`);
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
    // Pré-carregar lista de produtos para a tela de venda
    if (window.carregarProdutosVenda) {
      window.carregarProdutosVenda();
    }
    // Atualizar ranking de produtos mais vendidos
    if (window.carregarRankingProdutos) {
      window.carregarRankingProdutos();
    }
    atualizarSaldoCaixa();
    atualizarCardsDashboard();
    
      // Verificar consentimento LGPD
      if (window.verificarConsentimentoLGPD && !verificarConsentimentoLGPD()) {
        setTimeout(() => mostrarModalConsentimentoLGPD(), 500);
      }
    
      // Registrar login no log de auditoria
      if (window.registrarAuditoria) {
        registrarAuditoria('login', 'auth', { metodo: 'email_password' });
      }
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

// Atualizar cards do dashboard
async function atualizarCardsDashboard() {
  try {
    const produtosSnap = await window.db.collection('produtos').get();
    const totalProdutos = produtosSnap.size;
    let baixo = 0;
    produtosSnap.forEach((d) => {
      const p = d.data();
      if ((p.quantidade || 0) <= (p.estoqueMin || 0)) baixo++;
    });
    const totalEl = document.getElementById('total-produtos');
    const baixoEl = document.getElementById('estoque-baixo');
    if (totalEl) totalEl.textContent = String(totalProdutos);
    if (baixoEl) baixoEl.textContent = String(baixo);

    const inicio = new Date(); inicio.setHours(0,0,0,0);
    const vendasHojeSnap = await window.db.collection('vendas')
      .where('data', '>=', inicio)
      .get();
    const totalHoje = vendasHojeSnap.docs.reduce((s, d) => s + (d.data().total || 0), 0);
    const vendasHojeEl = document.getElementById('vendas-hoje');
    if (vendasHojeEl) vendasHojeEl.textContent = formatCurrency(totalHoje);

    const entradas = await window.db.collection('movimentacoes').where('tipo', '==', 'entrada').get();
    const saidas = await window.db.collection('movimentacoes').where('tipo', '==', 'saida').get();
    const soma = (snap) => snap.docs.reduce((s, d) => s + (d.data().valor || 0), 0);
    const saldo = soma(entradas) - soma(saidas);
    const saldoEl = document.getElementById('saldo-caixa');
    if (saldoEl) saldoEl.textContent = formatCurrency(saldo);
  } catch (err) {
    console.error('Erro ao atualizar cards do dashboard', err);
  }
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

// Habilitar botão de aceite LGPD quando checkbox for marcado
document.addEventListener('DOMContentLoaded', () => {
  const checkbox = document.getElementById('lgpd-aceite-checkbox');
  const btn = document.getElementById('lgpd-aceitar-btn');
  if (checkbox && btn) {
    checkbox.addEventListener('change', () => {
      btn.disabled = !checkbox.checked;
    });
  }
});