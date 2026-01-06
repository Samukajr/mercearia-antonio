# 🔐 Usuários de Teste - Mercearia do Antonio

Para facilitar os testes, use as seguintes credenciais para criar os usuários manualmente no **Firebase Console** ou via **CLI**.

## Credenciais dos Usuários de Teste

### 1️⃣ Operador de Caixa
- **Email**: `caixa@test.com`
- **Senha**: `Caixa@123456`
- **Role**: `operador_caixa`
- **Descrição**: Pode registrar vendas e movimentações de caixa

### 2️⃣ Gerente da Loja
- **Email**: `gerente@test.com`
- **Senha**: `Gerente@123456`
- **Role**: `gerente`
- **Descrição**: Acesso a estoque, vendas, relatórios e gerenciamento

### 3️⃣ Proprietário
- **Email**: `proprietario@test.com`
- **Senha**: `Proprietario@123456`
- **Role**: `proprietario`
- **Descrição**: Acesso total ao sistema (criação de usuários, configurações, etc.)

### 4️⃣ Administrador (Super User)
- **Email**: `admin@test.com`
- **Senha**: `Admin@123456`
- **Role**: `proprietario`
- **Descrição**: Acesso total (mesmo que proprietário)

---

## 📝 Como Criar os Usuários

### Opção 1: Firebase Console (Recomendado para teste rápido)

1. Acesse: https://console.firebase.google.com/project/mercearia-antonio-62e60/authentication/users
2. Clique em **"Adicionar usuário"** ou **"Create user"**
3. Preencha:
   - **Email**: conforme tabela acima
   - **Senha**: conforme tabela acima
4. Clique em **Criar usuário**
5. Repita para cada usuário

### Opção 2: Firebase CLI (Automático)

```bash
# Instalar Firebase CLI (se não tiver)
npm install -g firebase-tools

# Fazer login
firebase login

# Importar usuários (criando arquivo JSON específico)
firebase auth:import usuarios-teste.json --hash-algo=bcrypt
```

### Opção 3: Node.js Script (Batch)

Se quiser automação total, use o script:
```bash
cd mercearia-antonio
node scripts/criar-usuarios-teste.js
```

---

## 🏷️ Atribuir Roles (Custom Claims)

Após criar os usuários no Firebase Auth, **atribua os roles** de uma destas formas:

### Via Firebase Console

1. Acesse: https://console.firebase.google.com/project/mercearia-antonio-62e60/authentication/users
2. Clique no usuário
3. No painel à direita, vá para **Custom claims**
4. Cole:
```json
{
  "role": "operador_caixa"
}
```
(Substitua `operador_caixa` pelo role correto)

### Via Cloud Function (dentro da app)

Após fazer login na app, a função `setUserRole` atribui automaticamente o role se o usuário não tiver um.

### Via Node.js Admin SDK

```javascript
const admin = require('firebase-admin');
admin.initializeApp();

const auth = admin.auth();

// Para cada usuário
await auth.setCustomUserClaims('uid-do-usuario', { role: 'operador_caixa' });
```

---

## ✅ Teste de Login

1. Acesse a app: https://mercearia-antonio.web.app/
2. Faça login com uma das credenciais
3. Verifique se a seção de **Gestão de Usuários** aparece apenas para `proprietario`
4. Teste as permissões de cada role em diferentes seções

---

## 🔄 Recarregar Credenciais

Após criar/atualizar roles, faça **logout e login novamente** para que os claims sejam atualizados.

---

## 💡 Dicas

- Use senhas diferentes em produção
- Considere adicionar mais usuários para testes de concorrência
- Os roles podem ser alterados dinamicamente no código (sem recriar usuários)
- Deletar um usuário do Firebase não deleta o documento em `usuarios/{uid}`

---

## 📊 Estrutura de Dados

Cada usuário deve ter um documento em `usuarios/{uid}`:

```json
{
  "userId": "uid-do-usuario",
  "email": "usuario@test.com",
  "nome": "Nome do Usuário",
  "role": "operador_caixa",
  "status": "ativo",
  "criadoEm": "Timestamp",
  "deletado": false
}
```

Esse documento é criado automaticamente pela Cloud Function `createUserWithRole` ou pelo app ao primeiro login.
