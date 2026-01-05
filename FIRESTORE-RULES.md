// ===========================
// FIRESTORE SECURITY RULES
// Copie este conteúdo para o Firebase Console
// Firestore → Rules
// ===========================

/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Funções auxiliares
    function isAuth() {
      return request.auth != null;
    }

    function getUserId() {
      return request.auth.uid;
    }

    function getUserRole() {
      return request.auth.token.role;
    }

    function isOwner(userId) {
      return getUserId() == userId;
    }

    function isRole(role) {
      return getUserRole() == role;
    }

    function hasAnyRole(roles) {
      return getUserRole() in roles;
    }

    // Regras por coleção
    
    // Coleção: usuarios
    // Apenas proprietários podem gerenciar usuários
    match /usuarios/{docId} {
      allow read: if isAuth() && (
        isRole('proprietario') || 
        isRole('gerente')
      );
      
      allow create, update, delete: if isAuth() && isRole('proprietario');
    }

    // Coleção: lojas
    // Proprietário acessa sua loja
    match /lojas/{userId} {
      allow read, write: if isAuth() && isOwner(userId);
    }

    // Coleção: produtos
    // Leitura: todos autenticados
    // Escrita: proprietário, gerente, operador_estoque
    match /produtos/{docId} {
      allow read: if isAuth() && resource.data.userId == getUserId();
      
      allow create, update: if isAuth() && 
        hasAnyRole(['proprietario', 'gerente', 'operador_estoque']) &&
        request.resource.data.userId == getUserId();
      
      allow delete: if isAuth() && 
        hasAnyRole(['proprietario', 'gerente']) &&
        resource.data.userId == getUserId();
    }

    // Coleção: vendas
    // Leitura: todos (filtrar por userId na app)
    // Escrita: proprietário, gerente, operador_caixa
    match /vendas/{docId} {
      allow read: if isAuth() && resource.data.userId == getUserId();
      
      allow create: if isAuth() && 
        hasAnyRole(['proprietario', 'gerente', 'operador_caixa']) &&
        request.resource.data.userId == getUserId();
      
      allow update, delete: if isAuth() && 
        hasAnyRole(['proprietario', 'gerente']) &&
        resource.data.userId == getUserId();
    }

    // Coleção: movimentacoes
    // Leitura: todos (filtrar por userId)
    // Escrita: proprietário, gerente, operador_caixa
    match /movimentacoes/{docId} {
      allow read: if isAuth() && resource.data.userId == getUserId();
      
      allow create, update: if isAuth() && 
        hasAnyRole(['proprietario', 'gerente', 'operador_caixa']) &&
        request.resource.data.userId == getUserId();
      
      allow delete: if isAuth() && 
        hasAnyRole(['proprietario', 'gerente']) &&
        resource.data.userId == getUserId();
    }

    // Coleção: auditLogs
    // Apenas proprietário lê; sistema cria registros
    match /auditLogs/{docId} {
      allow read: if isAuth() && (
        isRole('proprietario') ||
        docData.userId == getUserId()
      );
      
      allow create: if isAuth() && request.resource.data.userId == getUserId();
    }

    // Coleção: lgpdConsents
    // Usuário acessa seus próprios consentimentos
    match /lgpdConsents/{docId} {
      allow read, create: if isAuth() && request.resource.data.userId == getUserId();
    }

    // Coleção: sessoesCaixa
    // Operador_caixa cria/lê suas sessões
    match /sessoesCaixa/{docId} {
      allow read: if isAuth() && resource.data.userId == getUserId();
      
      allow create, update: if isAuth() && 
        hasAnyRole(['proprietario', 'gerente', 'operador_caixa']) &&
        request.resource.data.userId == getUserId();
    }

    // Fallback: negar tudo não explicitamente permitido
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
*/

// ===========================
// NOTA IMPORTANTE
// ===========================
// 
// Para que as regras funcionem, você precisa:
// 
// 1. Configurar Custom Claims no Firebase Auth
//    - Via Cloud Function ou Admin SDK (recomendado)
//    - Adicionar claim 'role' ao token de cada usuário
//    
// 2. Exemplo com Cloud Function (Node.js):
//    
//    const admin = require('firebase-admin');
//    exports.setUserRole = functions.https.onRequest(async (req, res) => {
//      try {
//        const uid = req.query.uid;
//        const role = req.query.role;
//        await admin.auth().setCustomUserClaims(uid, { role });
//        res.send({ success: true });
//      } catch (err) {
//        res.status(500).send(err);
//      }
//    });
//    
// 3. Chamar quando criar/editar usuário (no back-end)
//    
// Alternativamente, use Firebase Admin SDK em back-end
// para gerenciar users com roles automaticamente
