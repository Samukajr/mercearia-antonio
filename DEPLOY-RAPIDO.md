# 🚀 Deployment Rápido - 5 Comandos

Cole estes comandos no PowerShell (Admin) um por um. Leva ~5 minutos.

## Copie e Cole estes comandos:

### 1️⃣ **Login no Firebase**

```powershell
firebase login
```

> Abrirá navegador. Faça login. Volte ao PowerShell.

---

### 2️⃣ **Navegar até a pasta e instalar dependências**

```powershell
cd e:\APP\mercearia-antonio\functions; npm install; cd ..
```

> Aguarde a instalação (2-3 minutos na primeira vez).

---

### 3️⃣ **Fazer o Deploy**

```powershell
firebase deploy --only functions
```

> ✅ Quando vir `Deploy complete!`, está pronto!

---

### 4️⃣ **Verificar Deploy (Opcional)**

```powershell
firebase functions:log
```

> Mostra logs das funções.

---

### 5️⃣ **Testar no Console Firebase**

1. Abra: https://console.firebase.google.com/
2. Selecione projeto `mercearia-antonio`
3. Vá para: **Build → Functions**
4. Clique em `setUserRole`
5. Vá em **Testing**
6. Cole este JSON:

```json
{
  "uid": "SEU_USER_ID",
  "role": "gerente"
}
```

Clique **Call** → Deve aparecer `success: true`

---

## ⚠️ Erro comum?

Se vir `firebase is not recognized`:

```powershell
npm install -g firebase-tools
```

Depois repita os passos acima.

---

## ✅ Pronto!

Após o deploy:

1. **Logout** do app
2. **Login** novamente
3. As seções "Usuários" e "Configurações" aparecem para proprietário
4. Crie um novo usuário e teste!

---

**Resultado esperado após login:**

- Proprietário: vê "Usuários" + "Configurações"
- Gerente: vê "Usuários"
- Outros: veem o dashboard normalmente

🎉 Sucesso!
