// Funções para gerenciamento da seção "Minha Conta"

// Carregar dados do usuário logado
async function carregarMinhaContaSection() {
  try {
    const user = window.auth.currentUser;
    if (!user) {
      console.log('❌ Usuário não autenticado');
      return;
    }

    console.log('👤 Carregando dados da conta:', user.email);

    // Carregar email
    const emailEl = document.getElementById('minha-conta-email');
    if (emailEl) emailEl.value = user.email || '';

    // Carregar nome e role do Firestore
    try {
      const userId = user.uid;
      const usuarioDoc = await window.db.collection('usuarios').doc(userId).get();
      
      const nomeEl = document.getElementById('minha-conta-nome');
      const roleEl = document.getElementById('minha-conta-role');
      
      if (usuarioDoc.exists) {
        const userData = usuarioDoc.data();
        if (nomeEl) nomeEl.value = userData.nome || '';
        if (roleEl) roleEl.value = userData.role || 'usuario';
        console.log('✅ Dados da conta carregados:', userData);
      } else {
        if (nomeEl) nomeEl.value = 'Usuário';
        if (roleEl) roleEl.value = 'usuario';
      }
    } catch (err) {
      console.warn('⚠️ Erro ao carregar dados do Firestore:', err);
    }
  } catch (err) {
    console.error('❌ Erro ao carregar Minha Conta:', err);
    showToast('error', 'Erro ao carregar informações da conta');
  }
}

// Alterar senha
async function alterarSenha(senhaAtual, senhaNova, senhaConfirmar) {
  try {
    const user = window.auth.currentUser;
    if (!user) {
      showToast('error', 'Usuário não autenticado');
      return false;
    }

    // Validar campos
    if (!senhaAtual || !senhaNova || !senhaConfirmar) {
      showToast('error', 'Preencha todos os campos');
      return false;
    }

    if (senhaNova.length < 6) {
      showToast('error', 'Nova senha deve ter mínimo 6 caracteres');
      return false;
    }

    if (senhaNova !== senhaConfirmar) {
      showToast('error', 'Novas senhas não coincidem');
      return false;
    }

    console.log('🔐 Alterando senha para:', user.email);

    // Re-autenticar usuário com senha atual
    const credential = firebase.auth.EmailAuthProvider.credential(
      user.email,
      senhaAtual
    );

    await user.reauthenticateWithCredential(credential);
    console.log('✅ Re-autenticação bem-sucedida');

    // Alterar a senha
    await user.updatePassword(senhaNova);
    console.log('✅ Senha alterada com sucesso');
    
    showToast('success', 'Senha alterada com sucesso!');
    
    // Limpar formulário
    document.getElementById('form-alterar-senha').reset();
    
    return true;
  } catch (err) {
    console.error('❌ Erro ao alterar senha:', err);
    
    // Tratamento específico de erros
    if (err.code === 'auth/wrong-password') {
      showToast('error', 'Senha atual incorreta');
    } else if (err.code === 'auth/weak-password') {
      showToast('error', 'Senha muito fraca. Use mínimo 6 caracteres');
    } else if (err.code === 'auth/requires-recent-login') {
      showToast('error', 'Sessão expirou. Por favor, faça login novamente');
    } else {
      showToast('error', 'Erro ao alterar senha: ' + (err.message || 'erro desconhecido'));
    }
    
    return false;
  }
}

// Inicializar event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Monitorar mudança de seção
  const observarMudancaoSecao = () => {
    const minhaContaSection = document.getElementById('section-minha-conta');
    if (minhaContaSection && minhaContaSection.classList.contains('active')) {
      carregarMinhaContaSection();
    }
  };

  // Observer para detectar quando a seção fica ativa
  const dashboardContent = document.querySelector('.dashboard-content');
  if (dashboardContent) {
    const observer = new MutationObserver(observarMudancaoSecao);
    observer.observe(dashboardContent, { attributes: true, attributeFilter: ['class'], subtree: true });
  }

  // Formulário para alterar senha
  const formAlterarSenha = document.getElementById('form-alterar-senha');
  if (formAlterarSenha) {
    formAlterarSenha.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const senhaAtual = document.getElementById('senha-atual').value;
      const senhaNova = document.getElementById('senha-nova').value;
      const senhaConfirmar = document.getElementById('senha-confirmar').value;
      
      const button = formAlterarSenha.querySelector('button[type="submit"]');
      button.disabled = true;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Alterando...';
      
      const sucesso = await alterarSenha(senhaAtual, senhaNova, senhaConfirmar);
      
      button.disabled = false;
      button.innerHTML = '<i class="fas fa-save"></i> Atualizar Senha';
    });
  }
});
