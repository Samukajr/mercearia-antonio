# Setup Firebase - Mercearia do Antonio

## Passo 1: Criar Projeto no Firebase Console

1. Acesse: https://console.firebase.google.com/
2. Clique em **"Adicionar projeto"** ou **"Create a project"**
3. Nome do projeto: `mercearia-antonio` (ou o nome que preferir)
4. Desabilite o Google Analytics (opcional, pode habilitar depois)
5. Clique em **"Criar projeto"**

## Passo 2: Configurar Authentication

1. No menu lateral, clique em **"Authentication"** (Autenticação)
2. Clique em **"Get started"** ou **"Começar"**
3. Na aba **"Sign-in method"**:
   - Clique em **"Email/Password"**
   - **Ative** o primeiro toggle (Email/Password)
   - Deixe "Email link" desativado
   - Clique em **"Salvar"**

## Passo 3: Configurar Firestore Database

1. No menu lateral, clique em **"Firestore Database"**
2. Clique em **"Create database"** ou **"Criar banco de dados"**
3. Selecione: **"Start in production mode"** (vamos configurar as regras depois)
4. Escolha a localização: **"southamerica-east1"** (São Paulo) ou a mais próxima
5. Clique em **"Enable"** ou **"Ativar"**

## Passo 4: Obter Configuração do App Web

1. Na página inicial do projeto, clique no ícone **"</>"** (Web)
2. Registre o app:
   - Apelido do app: `mercearia-web`
   - **NÃO** marque "Firebase Hosting" (vamos usar Netlify)
   - Clique em **"Registrar app"**
3. **COPIE** o objeto `firebaseConfig` que aparece:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

4. Clique em **"Continue to console"**

## Passo 5: Aplicar Configuração no Código

Abra o arquivo: `js/firebase-config.js`

Substitua o objeto vazio pela configuração copiada:

```javascript
window.firebaseConfig = {
  apiKey: "AIza...",           // Cole aqui
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

**SALVE O ARQUIVO!**

## Passo 6: Publicar Regras do Firestore

1. No Firebase Console, vá em **"Firestore Database"**
2. Clique na aba **"Regras"** (Rules)
3. **Substitua TUDO** pelo conteúdo do arquivo `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

4. Clique em **"Publicar"** (Publish)

## Passo 7: Deploy no Netlify

### Via Netlify Drop (Mais Rápido)

1. Acesse: https://app.netlify.com/drop
2. Arraste a **pasta inteira** `e:\APP\mercearia-antonio\` para a área de drop
3. Aguarde o upload e deploy
4. Anote a URL gerada (ex: `https://random-name.netlify.app`)

### Via Git + Netlify (Recomendado)

1. Inicialize Git na pasta:
```powershell
cd e:\APP\mercearia-antonio\
git init
git add .
git commit -m "Initial commit - Mercearia do Antonio"
```

2. Crie repositório no GitHub e faça push

3. No Netlify:
   - Clique em **"Add new site"** → **"Import an existing project"**
   - Conecte com GitHub e selecione o repositório
   - Build settings:
     - Build command: (deixe vazio)
     - Publish directory: `.`
   - Clique em **"Deploy"**

## Passo 8: Criar Primeiro Usuário

1. No Firebase Console, vá em **"Authentication"**
2. Clique na aba **"Users"** (Usuários)
3. Clique em **"Add user"** ou **"Adicionar usuário"**
4. Preencha:
   - Email: `antonio@mercearia.com` (ou seu email)
   - Senha: escolha uma senha segura
5. Clique em **"Add user"**

## Passo 9: Testar o Sistema Online

1. Acesse a URL do Netlify (ex: `https://seu-site.netlify.app`)
2. Faça login com o email e senha criados
3. Dashboard deve carregar com as seções vazias (normal, ainda sem dados)

## Passo 10: Adicionar Produtos Exemplo (Opcional)

No Firebase Console → Firestore Database:

1. Clique em **"Iniciar coleção"**
2. ID da coleção: `produtos`
3. Adicione documento com os campos:
   - `nome` (string): "Pão Francês"
   - `categoria` (string): "paes"
   - `preco` (number): 0.5
   - `quantidade` (number): 100
   - `estoqueMin` (number): 20
   - `criadoEm` (timestamp): (clique no relógio e selecione agora)
   - `atualizadoEm` (timestamp): (clique no relógio e selecione agora)
4. Clique em **"Salvar"**

Repita para mais produtos se desejar!

---

## ✅ Checklist Final

- [ ] Projeto Firebase criado
- [ ] Authentication habilitado (Email/Password)
- [ ] Firestore criado
- [ ] Config copiada para `js/firebase-config.js`
- [ ] Regras do Firestore publicadas
- [ ] Deploy no Netlify concluído
- [ ] Primeiro usuário criado
- [ ] Login testado com sucesso
- [ ] Sistema funcionando online!

---

## 🆘 Problemas Comuns

**Erro: "Firebase: Error (auth/invalid-api-key)"**
- Verifique se copiou corretamente o `firebaseConfig`
- Certifique-se de salvar o arquivo `js/firebase-config.js`
- Faça novo deploy no Netlify após salvar

**Erro: "Missing or insufficient permissions"**
- Verifique se publicou as regras do Firestore
- Confirme que está logado no sistema

**Página em branco**
- Abra o Console do navegador (F12)
- Verifique erros de JavaScript
- Confirme que todos os arquivos JS estão carregando

**Login não funciona**
- Confirme que criou o usuário no Firebase Console
- Verifique se o email/senha estão corretos
- Limpe cache do navegador (Ctrl+Shift+Delete)
