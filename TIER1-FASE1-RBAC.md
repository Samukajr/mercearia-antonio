# Tier 1 - Fase 1: Sistema de Permissões e Papéis (RBAC)

## Status: ✅ Frontend Implementado | ⚠️ Backend Pendente

---

## Resumo da Implementação

### O que foi criado:

1. **js/rbac.js** - Sistema de controle de permissões
   - 5 roles: proprietario, gerente, operador_caixa, operador_estoque, viewer
   - 26 permissões granulares
   - Funções para validar permissões (`hasPermission`, `hasAllPermissions`, etc.)
   - Aplicação automática de visibilidade baseada em roles

2. **js/usuarios.js** - Gestão de usuários
   - Criar, editar, deletar usuários
   - Atribuir roles
   - Soft delete com auditoria
   - Tabela de usuários com ações

3. **js/configuracoes.js** - Configurações da loja
   - Dados básicos (nome, CNPJ, email, telefone)
   - Persistência no Firestore
   - Apenas proprietários podem editar

4. **index.html atualizado**
   - Nova seção "Usuários" (visível apenas para proprietário/gerente)
   - Nova seção "Configurações" (visível apenas para proprietário)
   - Modal para criar/editar usuários
   - Menu no sidebar com permissões

5. **FIRESTORE-RULES.md**
   - Regras de segurança prontas para copiar
   - Validação de roles em leitura/escrita
   - Multi-tenant isolado por userId

---

## Como Usar (Teste Local)

### 1. **Teste Rápido da UI**

O sistema já funciona em modo local sem backend. Todos os roles têm seus menus visíveis:

```
Proprietário: Vê "Usuários" + "Configurações"
Gerente:      Vê "Usuários"
Outros:       Não veem
```

**Problema**: Atualmente, como não há backend configurando roles, a função `getUserRole()` retorna `'viewer'` como padrão.

### 2. **Para Ativar os Roles (Próximos Passos)**

Você precisa fazer uma de duas coisas:

#### **Opção A: Cloud Function (Recomendado)**

1. No Firebase Console → Functions → Criar nova função:

```javascript
const admin = require('firebase-admin');
const functions = require('firebase-functions');

exports.setUserRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new Error('Não autenticado');
  
  const { uid, role } = data;
  const validRoles = ['proprietario', 'gerente', 'operador_caixa', 'operador_estoque', 'viewer'];
  
  if (!validRoles.includes(role)) {
    throw new Error('Role inválido');
  }
  
  // Apenas proprietário pode atribuir roles
  const caller = await admin.firestore().collection('usuarios').doc(context.auth.uid).get();
  if (caller.data()?.role !== 'proprietario') {
    throw new Error('Sem permissão');
  }
  
  await admin.auth().setCustomUserClaims(uid, { role });
  return { success: true };
});
```

2. Chamar esta função ao criar usuário (em usuarios.js):

```javascript
async function criarUsuario(email, senha, nome, role) {
  // ... validações ...
  
  try {
    const createUser = firebase.functions().httpsCallable('setUserRole');
    await createUser({ uid: novoUserId, role });
  } catch (err) {
    console.error('Erro ao atribuir role', err);
  }
}
```

#### **Opção B: Admin SDK (Back-end Externo)**

Se tiver um back-end Node.js/Python:

```python
# Python
from firebase_admin import auth

auth.set_custom_user_claims(uid, {'role': 'gerente'})
```

```javascript
// Node.js
const admin = require('firebase-admin');
await admin.auth().setCustomUserClaims(uid, { role: 'gerente' });
```

---

## Estrutura de Permissões

```
PROPRIETARIO
├─ Criar/Editar/Deletar Usuários
├─ Criar/Editar/Deletar Produtos
├─ Criar/Cancelar Vendas
├─ Gerenciar Caixa (abertura/fechamento)
├─ Acessar Relatórios Financeiros
├─ Fazer/Restaurar Backups
└─ Editar Configurações da Loja

GERENTE
├─ Listar Usuários (sem criar/deletar)
├─ Criar/Editar/Deletar Produtos
├─ Criar/Cancelar Vendas
├─ Gerenciar Caixa
├─ Acessar Relatórios
└─ Exportar Dados

OPERADOR_CAIXA
├─ Criar Vendas
├─ Listar Produtos
├─ Abrir/Fechar Caixa
├─ Registrar Movimentações
└─ Listar Relatórios (básicos)

OPERADOR_ESTOQUE
├─ Criar/Editar Produtos
├─ Listar Vendas
└─ Nenhuma ação em caixa

VIEWER
├─ Listar Produtos
├─ Listar Vendas
└─ Apenas visualização
```

---

## Firestore Collections Criadas

```
usuarios/
├─ userId: user ID do criador
├─ email: email@exemplo.com
├─ nome: Nome do Usuário
├─ role: 'proprietario' | 'gerente' | ...
├─ status: 'ativo' | 'pendente' | 'deletado'
├─ criadoEm: Timestamp
└─ atualizadoEm: Timestamp

lojas/
└─ {userId}
    ├─ userId: ID do proprietário
    ├─ nome: Mercearia do Antonio
    ├─ cnpj: 00.000.000/0000-00
    ├─ email: contato@mercearia.com
    └─ telefone: (11) 99999-9999
```

---

## Próximos Passos (Fase 2: Backup/Restore)

Após completar o RBAC com Cloud Functions:

1. [ ] Criar função de backup automático
   - Exportar Firestore para JSON
   - Armazenar em Cloud Storage
   - Agendamento diário

2. [ ] Criar função de restore
   - Interface para selecionar backup
   - Importar dados com validação
   - Auditoria de restauração

3. [ ] Dashboard de backups
   - Listar backups disponíveis
   - Data e tamanho
   - Ações: download, restaurar, deletar

---

## Testes Sugeridos

- [ ] Login como proprietário → ver "Usuários" + "Configurações"
- [ ] Criar novo usuário com role "operador_caixa"
- [ ] Login como operador_caixa → não ver "Usuários"
- [ ] Editar configurações da loja
- [ ] Tentar deletar usuário (requer confirmação)
- [ ] Exportar lista de usuários

---

## Notas Importantes

1. **Sem Cloud Function configurado**: Todos verão role='viewer'
   - As permissões não são aplicadas
   - Use apenas para testes locais

2. **Security Rules**: Precisam ser copiadas do FIRESTORE-RULES.md
   - Sem elas, usuários conseguem acessar dados de outros
   - Essencial para produção

3. **Auditoria**: Já está registrando todas as ações de usuário
   - Coleção: auditLogs
   - Útil para compliance e debugging

---

## Checklist de Implementação

- [x] RBAC frontend com 5 roles e 26 permissões
- [x] Gestão de usuários (CRUD)
- [x] Tela de configurações
- [x] Aplicação automática de visibilidade
- [x] Estrutura no Firestore
- [x] Firestore Security Rules (documento)
- [ ] Cloud Function para atribuir roles (custom claims)
- [ ] Teste end-to-end com múltiplos roles
- [ ] Documentação do cliente para cada role
