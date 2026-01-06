#!/usr/bin/env node

/**
 * Script para criar usuários de teste via Firebase Cloud Functions
 * Uso: node scripts/criar-usuarios-teste-http.js
 */

const https = require('https');
const path = require('path');

// Lê config do Firebase
const config = require('./firebase-config.json');

const projectId = config.projectId || 'mercearia-antonio-62e60';
const region = 'us-central1';

// Usuários de teste
const usuariosTeste = [
  {
    email: 'caixa@test.com',
    password: 'Caixa@123456',
    nome: 'Operador de Caixa',
    role: 'operador_caixa'
  },
  {
    email: 'gerente@test.com',
    password: 'Gerente@123456',
    nome: 'Gerente da Loja',
    role: 'gerente'
  },
  {
    email: 'proprietario@test.com',
    password: 'Proprietario@123456',
    nome: 'Proprietário',
    role: 'proprietario'
  },
  {
    email: 'admin@test.com',
    password: 'Admin@123456',
    nome: 'Administrador',
    role: 'proprietario'
  }
];

// Função para chamar Cloud Function via HTTP
function chamarFuncao(email, password, nome, role) {
  return new Promise((resolve, reject) => {
    const url = `https://${region}-${projectId}.cloudfunctions.net/createUserWithRole`;

    const payload = JSON.stringify({
      data: {
        email,
        password,
        nome,
        role
      }
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, data: response, status: res.statusCode });
          } else {
            reject({ success: false, error: response, status: res.statusCode });
          }
        } catch (err) {
          reject({ success: false, error: data, status: res.statusCode });
        }
      });
    });

    req.on('error', (err) => {
      reject({ success: false, error: err.message });
    });

    req.write(payload);
    req.end();
  });
}

async function criarTodos() {
  console.log('🚀 Criando usuários de teste via Cloud Functions...\n');

  const credenciais = [];

  for (const usuario of usuariosTeste) {
    try {
      console.log(`📝 Criando: ${usuario.email} (${usuario.nome})`);
      const resultado = await chamarFuncao(
        usuario.email,
        usuario.password,
        usuario.nome,
        usuario.role
      );

      console.log(`✅ Usuário criado com sucesso\n`);

      credenciais.push({
        email: usuario.email,
        password: usuario.password,
        nome: usuario.nome,
        role: usuario.role
      });

    } catch (err) {
      console.error(`❌ Erro ao criar ${usuario.email}:`, err.error || err.message);
      console.log('');
    }
  }

  // Exibir credenciais
  console.log('\n' + '='.repeat(80));
  console.log('🔐 CREDENCIAIS DOS USUÁRIOS DE TESTE');
  console.log('='.repeat(80) + '\n');

  credenciais.forEach((cred, idx) => {
    console.log(`${idx + 1}. ${cred.nome}`);
    console.log(`   📧 Email: ${cred.email}`);
    console.log(`   🔑 Senha: ${cred.password}`);
    console.log(`   🏷️  Role: ${cred.role}`);
    console.log('');
  });

  console.log('='.repeat(80));
  console.log('✨ Usuários criados! Faça login para testar.\n');
}

// Executar
criarTodos()
  .then(() => {
    console.log('✅ Script finalizado');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erro:', err);
    process.exit(1);
  });
