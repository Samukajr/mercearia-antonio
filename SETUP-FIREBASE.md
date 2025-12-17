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

> Se aparecer mensagem de API não habilitada ao usar a aplicação, habilite a API do Firestore no Console de APIs (Google Cloud):
> - Descubra seu **Project ID** no Firebase Console → Project Settings (ex.: `mercearia-antonio-62e60`)
> - Abra: https://console.cloud.google.com/apis/api/firestore.googleapis.com/overview?project=SEU_PROJECT_ID
> - Clique em **Enable** (Habilitar)
> - Aguarde alguns minutos para propagação e teste novamente

### Sincronizar Firebase x Google Cloud (mesmo projeto)

1. No Firebase Console → Project Settings, copie o **Project ID** do projeto usado no `js/firebase-config.js`.
2. No topo do Google Cloud Console, selecione exatamente o mesmo projeto (Project ID idêntico).
3. Habilite estas APIs (links com o seu Project ID):
  - Firestore: https://console.cloud.google.com/apis/api/firestore.googleapis.com/overview?project=SEU_PROJECT_ID
  - Identity Toolkit (Auth): https://console.cloud.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=SEU_PROJECT_ID (opcional)
4. Garanta que o **Firestore Database** foi criado (não Realtime Database).
5. Em Authentication → Settings, adicione `github.io` e `seu-usuario.github.io` em Authorized domains.

> Dica CLI: se você possui mais de um projeto no mesmo repositório, adicione aliases no `.firebaserc` e alterne:
> ```powershell
> firebase use mercearia-antonio-62e60
> # ou
> firebase use winged
> ```

### Alternar projeto em tempo de execução (sem rebuild)

No arquivo `js/firebase-config.js` há dois slots: `mercearia` (padrão) e `winged` (preencher com o SDK do seu projeto). Você pode alternar assim:

- Por URL: acrescente `?project=mercearia` ou `?project=winged` na URL pública.
- Por localStorage (persiste):
```js
localStorage.setItem('firebaseProject', 'winged'); // ou 'mercearia'
location.reload();
```

> Importante: Preencha o bloco `winged` com o SDK Web do seu projeto antes de alternar.

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

### Alternativa rápida via CLI (firebase-tools)

No terminal, com o projeto padrão já configurado em `.firebaserc`:

```powershell
firebase login
firebase use mercearia-antonio-62e60
firebase deploy --only firestore:rules
```

> Observação: o banco Firestore precisa estar criado previamente no Console para que as regras sejam aplicadas.

## Passo 7: Deploy no Netlify
### Alternativa: Deploy via GitHub Pages (Gratuito)

1. Faça push para o GitHub (já conectado):
```powershell
cd e:\APP\mercearia-antonio\
git add .
git commit -m "Deploy via GitHub Pages"
git push -u origin main
```

2. No GitHub, abra **Settings → Pages**:
  - Source: **Deploy from a branch**
  - Branch: **main**
  - Folder: **/** (root)
  - Salve; aguarde a publicação.

3. URL pública: `https://<seu-usuario>.github.io/mercearia-antonio/`

4. No **Firebase Console → Authentication → Settings (Authorized domains)**:
  - Adicione: `github.io` e `<seu-usuario>.github.io`
  - (Mantenha `localhost` para testes locais)

5. Observações de PWA em GitHub Pages:
  - O `service-worker.js` e `manifest.json` foram ajustados para caminhos relativos.
  - Instalação PWA pode depender de HTTPS e manifest válido (GitHub Pages atende).

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
- [ ] Deploy via GitHub Pages concluído
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

### Erros de Autenticação em GitHub Pages

- **auth/unauthorized-domain:** adicione `github.io` e `seu-usuario.github.io` em Authentication → Settings → Authorized domains.
- **auth/operation-not-allowed:** ative o provedor Email/Password em Authentication → Sign-in method.
- **auth/network-request-failed:** verifique conexão, bloqueios de rede e tente recarregar sem cache.
- **Dica:** na tela de login agora mostramos o código do erro para ajudar no diagnóstico.
