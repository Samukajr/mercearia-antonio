#!/usr/bin/env node

/**
 * Script para criar usuários de teste no Firebase
 * Uso: node scripts/criar-usuarios-teste.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Inicializar Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const auth = admin.auth();
const db = admin.firestore();

// Usuários de teste a criar
const usuariosTeste = [
  {
    email: 'caixa@test.com',
    nome: 'Operador de Caixa',
    role: 'operador_caixa',
    descricao: 'Login para operador de caixa'
  },
  {
    email: 'gerente@test.com',
    nome: 'Gerente da Loja',
    role: 'gerente',
    descricao: 'Login para gerente'
  },
  {
    email: 'proprietario@test.com',
    nome: 'Proprietário',
    role: 'proprietario',
    descricao: 'Login para proprietário (acesso total)'
  },
  {
    email: 'admin@test.com',
    nome: 'Administrador',
    role: 'proprietario', // Super user = proprietario
    descricao: 'Login para administrador super user'
  }
];

// Gerar senha temporária
function gerarSenha() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let senha = '';
  for (let i = 0; i < 12; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return senha;
}

async function criarUsuariosTeste() {
  console.log('🚀 Iniciando criação de usuários de teste...\n');

  const credenciais = [];

  for (const usuario of usuariosTeste) {
    try {
      const senha = gerarSenha();

      // 1. Criar usuário no Firebase Auth
      console.log(`📝 Criando usuário: ${usuario.email}`);
      const userRecord = await auth.createUser({
        email: usuario.email,
        password: senha,
        displayName: usuario.nome,
        emailVerified: false
      });

      console.log(`✅ Usuário criado: ${userRecord.uid}`);

      // 2. Atribuir custom claim (role)
      await auth.setCustomUserClaims(userRecord.uid, { role: usuario.role });
      console.log(`🏷️  Role atribuída: ${usuario.role}`);

      // 3. Criar documento no Firestore (usuarios/{uid})
      await db.collection('usuarios').doc(userRecord.uid).set({
        userId: userRecord.uid, // Ref para si mesmo (proprietário)
        email: usuario.email,
        nome: usuario.nome,
        role: usuario.role,
        status: 'ativo',
        criadoEm: admin.firestore.Timestamp.now(),
        deletado: false,
        descricao: usuario.descricao
      });

      console.log(`💾 Documento Firestore criado\n`);

      // Armazenar credenciais para exibir depois
      credenciais.push({
        email: usuario.email,
        senha: senha,
        role: usuario.role,
        uid: userRecord.uid,
        descricao: usuario.descricao
      });

    } catch (err) {
      console.error(`❌ Erro ao criar ${usuario.email}:`, err.message);
    }
  }

  // Exibir credenciais
  console.log('\n' + '='.repeat(80));
  console.log('🔐 CREDENCIAIS DOS USUÁRIOS DE TESTE');
  console.log('='.repeat(80) + '\n');

  credenciais.forEach((cred, idx) => {
    console.log(`${idx + 1}. ${cred.descricao}`);
    console.log(`   📧 Email: ${cred.email}`);
    console.log(`   🔑 Senha: ${cred.senha}`);
    console.log(`   🏷️  Role: ${cred.role}`);
    console.log(`   🆔 UID: ${cred.uid}`);
    console.log('');
  });

  console.log('='.repeat(80));
  console.log('⚠️  IMPORTANTE: Guarde essas credenciais em local seguro!');
  console.log('💡 Dica: Peça aos usuários que mudem a senha no primeiro login');
  console.log('='.repeat(80) + '\n');

  console.log('✨ Usuários de teste criados com sucesso!\n');
}

// Executar
criarUsuariosTeste()
  .then(() => {
    console.log('✅ Script finalizado');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
  });
