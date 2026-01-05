// ===========================
// Gestão de Configurações da Loja
// ===========================

async function carregarConfiguracoes() {
  try {
    const userId = getUserId();
    const configDoc = await window.db.collection('lojas').doc(userId).get();
    
    if (configDoc.exists) {
      const config = configDoc.data();
      document.getElementById('loja-nome').value = config.nome || '';
      document.getElementById('loja-cnpj').value = config.cnpj || '';
      document.getElementById('loja-email').value = config.email || '';
      document.getElementById('loja-telefone').value = config.telefone || '';
    } else {
      // Primeira vez - valores padrão
      document.getElementById('loja-nome').value = 'Mercearia do Antonio';
    }
  } catch (err) {
    console.error('Erro ao carregar configurações', err);
  }
}

async function salvarConfiguracoes() {
  try {
    if (!await hasPermission('editar_loja')) {
      showToast('error', 'Você não tem permissão para editar configurações da loja.');
      return;
    }

    const userId = getUserId();
    const config = {
      userId: userId,
      nome: document.getElementById('loja-nome').value.trim(),
      cnpj: document.getElementById('loja-cnpj').value.trim(),
      email: document.getElementById('loja-email').value.trim(),
      telefone: document.getElementById('loja-telefone').value.trim(),
      atualizadoEm: firebase.firestore.Timestamp.now()
    };

    await window.db.collection('lojas').doc(userId).set(config, { merge: true });
    
    await registrarAuditoria('editar_loja', 'configuracoes', config);
    
    showToast('success', 'Configurações salvas com sucesso!');
  } catch (err) {
    console.error('Erro ao salvar configurações', err);
    showToast('error', 'Erro ao salvar configurações.');
  }
}

// Expor globalmente
window.carregarConfiguracoes = carregarConfiguracoes;
window.salvarConfiguracoes = salvarConfiguracoes;
