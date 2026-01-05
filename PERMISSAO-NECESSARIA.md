# ⚠️ PERMISSÃO NECESSÁRIA

Sua conta `samuel.lacerda@yuna.com.br` não tem permissão para fazer deploy no Firebase.

## 🔑 Solução Rápida (3 passos):

### 1. Abra Google Cloud Console:
https://console.cloud.google.com/

### 2. Selecione o Projeto:
Na barra superior, clique no projeto **mercearia-antonio**

### 3. Dê Permissão:
- Vá para **IAM & Admin** → **IAM**
- Clique **Grant Access** (Conceder acesso)
- Email: `samuel.lacerda@yuna.com.br`
- Role: **Editor** (Adicionar)
- Clique **Save**

⏳ Aguarde 1-2 minutos para as permissões serem aplicadas.

### 4. Volte ao PowerShell e tente novamente:

```powershell
firebase deploy --only "functions" --project mercearia-antonio-62e60
```

---

**Depois de dar permissão e esperar 2 minutos, o deploy funcionará!**

Se precisar de ajuda visual, abra:
https://console.cloud.google.com/iam-admin/iam
