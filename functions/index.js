const admin = require('firebase-admin');
const functions = require('firebase-functions');

// Inicializar Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

// ===========================
// Cloud Function: Atribuir Role a Usuário
// ===========================
// Esta função é chamada quando um novo usuário é criado ou quando um usuário existente
// tem seu role alterado. Ela atribui custom claims ao usuário no Firebase Auth.
//
// Chamada: firebase.functions().httpsCallable('setUserRole')({ uid, role })

exports.setUserRole = functions.https.onCall(async (data, context) => {
  // Verificar autenticação
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Você precisa estar autenticado para executar esta função.'
    );
  }

  const { uid, role } = data;
  const callerUid = context.auth.uid;

  // Validação de entrada
  if (!uid || !role) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'uid e role são obrigatórios.'
    );
  }

  const validRoles = ['proprietario', 'gerente', 'operador_caixa', 'operador_estoque', 'viewer'];
  if (!validRoles.includes(role)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Role inválido. Use um destes: ${validRoles.join(', ')}`
    );
  }

  try {
    // Verificar permissão: apenas proprietário pode atribuir roles
    const callerDoc = await db.collection('usuarios').where('email', '==', context.auth.token.email).limit(1).get();
    
    if (callerDoc.empty) {
      // Se for o primeiro usuário (setup inicial), permitir
      const usersCount = await db.collection('usuarios').limit(1).get();
      if (usersCount.size > 0) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Você não tem permissão para atribuir roles.'
        );
      }
    } else {
      const caller = callerDoc.docs[0].data();
      if (caller.role !== 'proprietario') {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Apenas proprietários podem atribuir roles.'
        );
      }
    }

    // Atribuir custom claims ao usuário
    await auth.setCustomUserClaims(uid, { role });

    // Registrar na auditoria
    await db.collection('auditLogs').add({
      acao: 'atribuir_role',
      recurso: 'auth',
      userId: callerUid,
      userEmail: context.auth.token.email,
      detalhes: {
        usuarioAlvo: uid,
        roleAtribuido: role
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ip: context.rawRequest.ip || 'unknown'
    });

    console.log(`Role '${role}' atribuído ao usuário ${uid} por ${context.auth.token.email}`);

    return {
      success: true,
      message: `Role '${role}' atribuído com sucesso ao usuário ${uid}`,
      uid: uid,
      role: role
    };
  } catch (error) {
    console.error('Erro ao atribuir role:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      `Erro ao atribuir role: ${error.message}`
    );
  }
});

// ===========================
// Cloud Function: Criar Usuário (Admin)
// ===========================
// Cria um novo usuário no Firebase Auth E no Firestore simultaneamente
// Chamada: firebase.functions().httpsCallable('createUserWithRole')

exports.createUserWithRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Não autenticado');
  }

  const { email, password, name, role } = data;
  const callerUid = context.auth.uid;

  // Validações
  if (!email || !password || !name || !role) {
    throw new functions.https.HttpsError('invalid-argument', 'Todos os campos são obrigatórios');
  }

  const validRoles = ['proprietario', 'gerente', 'operador_caixa', 'operador_estoque', 'viewer'];
  if (!validRoles.includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Role inválido');
  }

  try {
    // Verificar permissão
    const callerDoc = await db.collection('usuarios').where('email', '==', context.auth.token.email).limit(1).get();
    if (!callerDoc.empty) {
      const caller = callerDoc.docs[0].data();
      if (caller.role !== 'proprietario') {
        throw new functions.https.HttpsError('permission-denied', 'Apenas proprietários podem criar usuários');
      }
    }

    // Criar usuário no Firebase Auth
    const userRecord = await auth.createUser({
      email: email.toLowerCase(),
      password: password,
      displayName: name,
      disabled: false
    });

    // Atribuir role via custom claims
    await auth.setCustomUserClaims(userRecord.uid, { role });

    // Criar documento no Firestore
    const userId = context.auth.uid; // ID do proprietário que criou
    await db.collection('usuarios').doc(userRecord.uid).set({
      userId: userId,
      email: userRecord.email,
      nome: name,
      role: role,
      status: 'ativo',
      criadoEm: admin.firestore.FieldValue.serverTimestamp(),
      criadoPor: context.auth.token.email,
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
    });

    // Registrar auditoria
    await db.collection('auditLogs').add({
      acao: 'criar_usuario_cloud_function',
      recurso: 'usuarios',
      userId: callerUid,
      userEmail: context.auth.token.email,
      detalhes: {
        novoUsuarioUid: userRecord.uid,
        novoUsuarioEmail: email,
        role: role
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ip: context.rawRequest.ip || 'unknown'
    });

    return {
      success: true,
      message: `Usuário ${email} criado com sucesso e role '${role}' atribuído`,
      uid: userRecord.uid,
      email: userRecord.email,
      role: role
    };
  } catch (error) {
    console.error('Erro ao criar usuário:', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // Tratamento de erro comum: email já existe
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'Este email já está cadastrado');
    }

    throw new functions.https.HttpsError('internal', `Erro: ${error.message}`);
  }
});

// ===========================
// Cloud Function: Verificar Role do Usuário Atual
// ===========================
// Útil para verificação no cliente (checa tokens)

exports.getUserRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Não autenticado');
  }

  const role = context.auth.token.role || 'viewer';

  return {
    uid: context.auth.uid,
    email: context.auth.token.email,
    role: role
  };
});

// ===========================
// Cloud Function: Listar Usuários (Admin)
// ===========================
// Apenas proprietário pode usar

exports.listUsers = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Não autenticado');
  }

  try {
    // Verificar permissão
    const callerRole = context.auth.token.role;
    if (callerRole !== 'proprietario' && callerRole !== 'gerente') {
      throw new functions.https.HttpsError('permission-denied', 'Sem permissão');
    }

    const userId = context.auth.uid;
    const usersSnap = await db.collection('usuarios')
      .where('userId', '==', userId)
      .get();

    const users = [];
    usersSnap.forEach(doc => {
      users.push({
        uid: doc.id,
        ...doc.data(),
        criadoEm: doc.data().criadoEm?.toDate?.()
      });
    });

    return { success: true, users, count: users.length };
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ===========================
// Agendado: Limpar Tokens de Teste
// ===========================
// Executar diariamente às 2 AM para limpar usuários com role não definida

exports.cleanupRoles = functions.pubsub.schedule('0 2 * * *').onRun(async (context) => {
  try {
    const listUsersResult = await auth.listUsers(1000);
    
    for (const user of listUsersResult.users) {
      const customClaims = user.customClaims || {};
      if (!customClaims.role) {
        // Atribuir role padrão 'viewer' se não houver role definido
        await auth.setCustomUserClaims(user.uid, { role: 'viewer' });
        console.log(`Role padrão 'viewer' atribuído a ${user.email}`);
      }
    }

    console.log('Limpeza de roles concluída');
    return null;
  } catch (error) {
    console.error('Erro ao limpar roles:', error);
  }
});
