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

// Query com filtro de userId
function queryByUser(collectionRef) {
  return collectionRef.where('userId', '==', getUserId());
}

// Expor globalmente
window.getUserId = getUserId;
window.addUserId = addUserId;
window.queryByUser = queryByUser;
