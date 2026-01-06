// ===========================
// Helpers para adicionar userId em operações Firestore
// Garante conformidade com regras multi-tenant
// ===========================

// Obter userId do usuário autenticado
function getUserId() {
  const user = window.auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado');
  }
  return user.uid;
}

// Adicionar userId em dados antes de salvar
function addUserId(data) {
  return {
    ...data,
    userId: getUserId()
  };
}

// Query com filtro de userId ou todos se proprietario
async function queryByUser(collectionRef) {
  const user = window.auth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  try {
    // Verificar se é proprietário
    const idTokenResult = await user.getIdTokenResult();
    const role = idTokenResult?.claims?.role;
    
    if (role === 'proprietario') {
      // Proprietários veem todos os registros
      console.log('👑 Proprietário - retornando todos os registros');
      return collectionRef;
    }
  } catch (e) {
    console.warn('⚠️ Erro ao verificar role em queryByUser', e);
  }

  // Não-proprietários: apenas seus próprios registros
  return collectionRef.where('userId', '==', user.uid);
}

// Expor globalmente
window.getUserId = getUserId;
window.addUserId = addUserId;
window.queryByUser = queryByUser;
