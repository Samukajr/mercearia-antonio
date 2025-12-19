// ===========================
// LGPD - Conformidade e Auditoria
// ===========================

// Registrar log de auditoria
async function registrarAuditoria(acao, recurso, detalhes = {}) {
  try {
    const user = window.auth.currentUser;
    if (!user) return;

    const logData = {
      userId: user.uid,
      userEmail: user.email,
      acao: acao, // ex: 'login', 'criar_produto', 'excluir_venda', 'exportar_dados'
      recurso: recurso, // ex: 'auth', 'produtos', 'vendas', 'dados_pessoais'
      detalhes: detalhes,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      ip: await obterIPPublico().catch(() => 'não disponível'),
      userAgent: navigator.userAgent
    };

    await window.db.collection('auditLogs').add(logData);
  } catch (err) {
    console.error('Erro ao registrar auditoria:', err);
  }
}

// Obter IP público (melhor esforço)
async function obterIPPublico() {
  try {
    const resp = await fetch('https://api.ipify.org?format=json', { timeout: 3000 });
    const data = await resp.json();
    return data.ip || 'não disponível';
  } catch {
    return 'não disponível';
  }
}

// Verificar se usuário já aceitou LGPD
function verificarConsentimentoLGPD() {
  const user = window.auth.currentUser;
  if (!user) return false;
  
  const consentimento = localStorage.getItem(`lgpd_consent_${user.uid}`);
  return consentimento === 'true';
}

// Registrar consentimento LGPD
async function registrarConsentimentoLGPD() {
  const user = window.auth.currentUser;
  if (!user) return;

  const consentData = {
    userId: user.uid,
    userEmail: user.email,
    aceitou: true,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    versaoPolitica: '1.0',
    ip: await obterIPPublico().catch(() => 'não disponível')
  };

  try {
    await window.db.collection('lgpdConsents').add(consentData);
    localStorage.setItem(`lgpd_consent_${user.uid}`, 'true');
    await registrarAuditoria('aceitar_lgpd', 'politica_privacidade', { versao: '1.0' });
  } catch (err) {
    console.error('Erro ao registrar consentimento:', err);
  }
}

// Mostrar modal de consentimento LGPD
function mostrarModalConsentimentoLGPD() {
  const modal = document.getElementById('modal-lgpd-consent');
  if (modal) {
    modal.classList.add('active');
  }
}

// Aceitar LGPD
async function aceitarLGPD() {
  await registrarConsentimentoLGPD();
  const modal = document.getElementById('modal-lgpd-consent');
  if (modal) {
    modal.classList.remove('active');
  }
  showToast('success', 'Consentimento registrado com sucesso!');
}

// Recusar LGPD (fazer logout)
function recusarLGPD() {
  showToast('warning', 'Você precisa aceitar os termos para usar o sistema.');
  setTimeout(() => {
    window.auth.signOut();
  }, 2000);
}

// Portal de Direitos LGPD
async function exportarMeusDados() {
  const user = window.auth.currentUser;
  if (!user) {
    showToast('error', 'Usuário não autenticado.');
    return;
  }

  try {
    showToast('info', 'Exportando seus dados...');

    // Coletar dados do usuário
    const dadosExportacao = {
      usuario: {
        uid: user.uid,
        email: user.email,
        dataCriacao: user.metadata.creationTime,
        ultimoLogin: user.metadata.lastSignInTime
      },
      produtos: [],
      vendas: [],
      movimentacoes: [],
      logs: []
    };

    // Produtos
    const produtosSnap = await window.db.collection('produtos')
      .where('userId', '==', user.uid)
      .get();
    produtosSnap.forEach(doc => {
      dadosExportacao.produtos.push({ id: doc.id, ...doc.data() });
    });

    // Vendas
    const vendasSnap = await window.db.collection('vendas')
      .where('userId', '==', user.uid)
      .limit(100) // Limitar para não sobrecarregar
      .get();
    vendasSnap.forEach(doc => {
      dadosExportacao.vendas.push({ id: doc.id, ...doc.data() });
    });

    // Movimentações
    const movSnap = await window.db.collection('movimentacoes')
      .where('userId', '==', user.uid)
      .limit(100)
      .get();
    movSnap.forEach(doc => {
      dadosExportacao.movimentacoes.push({ id: doc.id, ...doc.data() });
    });

    // Logs de auditoria (últimos 50)
    const logsSnap = await window.db.collection('auditLogs')
      .where('userId', '==', user.uid)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
    logsSnap.forEach(doc => {
      dadosExportacao.logs.push({ id: doc.id, ...doc.data() });
    });

    // Baixar JSON
    const blob = new Blob([JSON.stringify(dadosExportacao, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meus_dados_${user.uid}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    await registrarAuditoria('exportar_dados', 'dados_pessoais', { formato: 'json' });
    showToast('success', 'Dados exportados com sucesso!');
  } catch (err) {
    console.error('Erro ao exportar dados:', err);
    showToast('error', 'Erro ao exportar dados. Tente novamente.');
  }
}

// Solicitar exclusão de conta
async function solicitarExclusaoConta() {
  const user = window.auth.currentUser;
  if (!user) {
    showToast('error', 'Usuário não autenticado.');
    return;
  }

  const confirma = confirm(
    'ATENÇÃO: Esta ação é IRREVERSÍVEL!\n\n' +
    'Todos os seus dados serão permanentemente excluídos:\n' +
    '- Produtos\n' +
    '- Vendas\n' +
    '- Movimentações\n' +
    '- Relatórios\n' +
    '- Logs de auditoria\n\n' +
    'Deseja realmente excluir sua conta?'
  );

  if (!confirma) return;

  const confirma2 = confirm(
    'Última confirmação!\n\n' +
    'Digite "CONFIRMAR" na próxima caixa de diálogo para prosseguir.'
  );

  if (!confirma2) return;

  const textoConfirmacao = prompt('Digite "CONFIRMAR" (em maiúsculas) para excluir sua conta:');
  
  if (textoConfirmacao !== 'CONFIRMAR') {
    showToast('info', 'Exclusão cancelada.');
    return;
  }

  try {
    showToast('info', 'Excluindo sua conta e dados...');

    await registrarAuditoria('solicitar_exclusao_conta', 'usuario', { motivo: 'usuario_solicitou' });

    // Excluir produtos
    const produtosSnap = await window.db.collection('produtos')
      .where('userId', '==', user.uid)
      .get();
    const batchProdutos = window.db.batch();
    produtosSnap.forEach(doc => batchProdutos.delete(doc.ref));
    await batchProdutos.commit();

    // Excluir vendas
    const vendasSnap = await window.db.collection('vendas')
      .where('userId', '==', user.uid)
      .get();
    const batchVendas = window.db.batch();
    vendasSnap.forEach(doc => batchVendas.delete(doc.ref));
    await batchVendas.commit();

    // Excluir movimentações
    const movSnap = await window.db.collection('movimentacoes')
      .where('userId', '==', user.uid)
      .get();
    const batchMov = window.db.batch();
    movSnap.forEach(doc => batchMov.delete(doc.ref));
    await batchMov.commit();

    // Excluir logs (manter por 30 dias para conformidade)
    // Aqui apenas marcamos para exclusão futura
    const logsSnap = await window.db.collection('auditLogs')
      .where('userId', '==', user.uid)
      .get();
    const batchLogs = window.db.batch();
    logsSnap.forEach(doc => {
      batchLogs.update(doc.ref, { 
        deletionScheduled: true,
        deletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
    });
    await batchLogs.commit();

    // Excluir conta de autenticação
    await user.delete();

    showToast('success', 'Conta excluída com sucesso. Você será desconectado.');
    
    setTimeout(() => {
      window.location.reload();
    }, 2000);

  } catch (err) {
    console.error('Erro ao excluir conta:', err);
    if (err.code === 'auth/requires-recent-login') {
      showToast('error', 'Por segurança, faça login novamente antes de excluir a conta.');
      setTimeout(() => window.auth.signOut(), 2000);
    } else {
      showToast('error', 'Erro ao excluir conta. Entre em contato com o suporte.');
    }
  }
}

// Abrir modal de privacidade
function abrirModalPrivacidade() {
  const modal = document.getElementById('modal-privacidade');
  if (modal) {
    modal.classList.add('active');
  }
}

// Fechar modal de privacidade
function fecharModalPrivacidade() {
  const modal = document.getElementById('modal-privacidade');
  if (modal) {
    modal.classList.remove('active');
  }
}

// Expor funções globalmente
window.registrarAuditoria = registrarAuditoria;
window.verificarConsentimentoLGPD = verificarConsentimentoLGPD;
window.mostrarModalConsentimentoLGPD = mostrarModalConsentimentoLGPD;
window.aceitarLGPD = aceitarLGPD;
window.recusarLGPD = recusarLGPD;
window.exportarMeusDados = exportarMeusDados;
window.solicitarExclusaoConta = solicitarExclusaoConta;
window.abrirModalPrivacidade = abrirModalPrivacidade;
window.fecharModalPrivacidade = fecharModalPrivacidade;
