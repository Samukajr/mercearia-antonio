# Deploy da Cloud Function no Firebase

## 📋 Checklist de Deployment

Este guia ajudará você a fazer o deploy da Cloud Function `setUserRole` que ativa os custom claims (roles) no seu sistema.

---

## ⚙️ Pré-requisitos

Antes de começar, verifique se você tem:

- [x] Node.js 18+ instalado
  - Verificar: `node --version`
  - Baixar em: https://nodejs.org/

- [x] Firebase CLI instalado globalmente
  - Verificar: `firebase --version`
  - Instalar: `npm install -g firebase-tools`

- [x] Conta Firebase com acesso ao projeto `mercearia-antonio`

- [x] Pasta `functions/` criada (já feito) com:
  - `package.json`
  - `index.js`

---

## 📱 Passos para Deployment

### Passo 1: Abrir PowerShell como Administrador

1. Pressione `Win + X` → Selecione **Windows PowerShell (Admin)** ou **Terminal (Admin)**
2. Navegue até a pasta do projeto:

```powershell
cd e:\APP\mercearia-antonio
```

### Passo 2: Fazer Login no Firebase

```powershell
firebase login
```

Isso abrirá uma janela do navegador. Faça login com sua conta Google/Email do Firebase.

**Depois de logar com sucesso**, retorne ao PowerShell (feche a janela do navegador).

### Passo 3: Inicializar Projeto Firebase Localmente (Se Necessário)

Se ainda não tiver arquivo `.firebaserc`, execute:

```powershell
firebase init functions
```

Durante a inicialização:
- Selecione **Use an existing project** → `mercearia-antonio`
- Selecione **JavaScript** como linguagem
- Responda **Y** para ESLint (recomendado)
- Responda **N** para overwrite (seus arquivos já existem)

Se tiver `.firebaserc` já, pode pular este passo.

### Passo 4: Instalar Dependências

```powershell
cd functions
npm install
cd ..
```

Aguarde a instalação completar (pode levar alguns minutos na primeira vez).

### Passo 5: Validar o Código (Opcional)

Para verificar se a Cloud Function está correta:

```powershell
cd functions
npm run shell
```

Saia do shell com `exit`.

### Passo 6: Fazer o Deploy

```powershell
firebase deploy --only functions
```

**Aguarde a conclusão.** Você verá algo como:

```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/seu-projeto
Function URL: https://us-central1-seu-projeto.cloudfunctions.net/setUserRole
```

✅ **Pronto!** Suas Cloud Functions estão deployed!

---

## 🔍 Verificar Deploy no Console Firebase

1. Acesse: https://console.firebase.google.com/
2. Selecione seu projeto
3. Vá para **Build → Functions**
4. Você verá:
   - ✅ `setUserRole` (Status: 2nd gen)
   - ✅ `createUserWithRole`
   - ✅ `getUserRole`
   - ✅ `listUsers`
   - ✅ `cleanupRoles`

---

## 🧪 Testar a Cloud Function

### Teste 1: Via Console Firebase

1. No Console Firebase → **Functions** → Clique em `setUserRole`
2. Vá para a aba **Testing**
3. Cole este JSON:

```json
{
  "uid": "SEU_USER_ID_AQUI",
  "role": "gerente"
}
```

4. Clique **Call** → Você deve ver `success: true`

### Teste 2: Via App (Client-side)

Adicione este código temporário no arquivo [js/app.js](js/app.js) após o login:

```javascript
// Teste - remova depois!
async function testarSetRole() {
  try {
    const fn = firebase.functions().httpsCallable('setUserRole');
    const resultado = await fn({ 
      uid: window.auth.currentUser.uid,
      role: 'proprietario'
    });
    console.log('Role atribuído:', resultado.data);
    showToast('success', `Role '${resultado.data.role}' atribuído!`);
  } catch (err) {
    console.error('Erro ao atribuir role:', err);
    showToast('error', `Erro: ${err.message}`);
  }
}

// Chamar após login
window.testarSetRole = testarSetRole;
```

Depois no console do navegador (F12):

```javascript
testarSetRole()
```

---

## 🐛 Troubleshooting

### "firebase is not recognized"

**Solução:** O Firebase CLI não está instalado globalmente.

```powershell
npm install -g firebase-tools
```

### "Permission denied" ao fazer deploy

**Solução:** Você não tem permissão no projeto Firebase.

- Vá a https://console.firebase.google.com
- Selecione o projeto
- **Project Settings** → **Members**
- Adicione seu email com role **Editor**

### "Cloud Functions API not enabled"

**Solução:** Ative a API no Google Cloud.

- Vá a: https://console.cloud.google.com/apis/library/cloudfunctions.googleapis.com
- Clique **Enable**

### Erro: `code TS2304: Cannot find name 'admin'`

**Solução:** Dependências não foram instaladas. Execute:

```powershell
cd functions
npm install
cd ..
```

### "Role atribuído mas não funciona na app"

**Possível causa:** Token em cache. 

**Solução:** Faça logout e login novamente para forçar atualização do token.

---

## 📚 Próximos Passos

Após deploy bem-sucedido:

1. **Testar com Múltiplos Usuários**
   - Crie 2-3 usuários com roles diferentes
   - Faça login em cada um
   - Verifique se os menus estão corretos

2. **Habilitar Firestore Security Rules**
   - Vá a **Firestore** → **Rules**
   - Cole o conteúdo de [FIRESTORE-RULES.md](FIRESTORE-RULES.md)
   - Publique

3. **Começar Fase 2: Backup/Restore**
   - Com Roles funcionando, prossiga para backup automático

---

## 📞 Suporte

Se encontrar problemas:

1. Verificar logs: `firebase functions:log`
2. Consultar Console Firebase → **Logs**
3. Verificar Firebase Emulator: `firebase emulators:start`

---

## ✅ Checklist Final

- [ ] `npm install -g firebase-tools` executado
- [ ] `firebase login` executado com sucesso
- [ ] `npm install` rodou em `functions/`
- [ ] `firebase deploy --only functions` completou
- [ ] Funções aparecem no Console Firebase
- [ ] Teste de role executado com sucesso
- [ ] Logout/login executado para atualizar token
- [ ] Seções "Usuários" e "Configurações" agora visíveis

🎉 **Parabéns!** Seu sistema RBAC está completo e funcional!
