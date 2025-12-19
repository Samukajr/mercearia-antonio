# Criar Índices Firestore - Mercearia Antonio

## ⚠️ PROBLEMA: Falha ao carregar estoque

Os índices compostos do Firestore ainda não foram criados. Use uma das opções abaixo:

---

## 🚀 SOLUÇÃO RÁPIDA: Links Diretos

Clique nos links abaixo para criar os índices automaticamente:

### Índice 1: Produtos (userId + nome)
```
https://console.firebase.google.com/v1/r/project/mercearia-antonio-62e60/firestore/indexes?create_composite=Clhwcm9qZWN0cy9tZXJjZWFyaWEtYW50b25pby02MmU2MC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvcHJvZHV0b3MvaW5kZXhlcy9fEAEaCgoGdXNlcklkEAEaCAoEbm9tZRABGgwKCF9fbmFtZV9fEAE
```

### Índice 2: AuditLogs (userId + timestamp)
```
https://console.firebase.google.com/v1/r/project/mercearia-antonio-62e60/firestore/indexes?create_composite=Cllwcm9qZWN0cy9tZXJjZWFyaWEtYW50b25pby02MmU2MC9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvYXVkaXRMb2dzL2luZGV4ZXMvXxABGgoKBnVzZXJJZBABGg0KCXRpbWVzdGFtcBACGgwKCF9fbmFtZV9fEAI
```

**Clique em cada link, revise as configurações e clique em "Create Index".**

---

## 📋 Alternativa: Firebase CLI

Se preferir usar a CLI, execute:

```powershell
firebase use mercearia-antonio-62e60
firebase deploy --only firestore:indexes
```

---

## ⏱️ Tempo de Criação

Os índices levam **2-5 minutos** para serem criados. Você verá o status no Console do Firebase:
- 🔄 Criando...
- ✅ Ativo

Após a criação, **recarregue o aplicativo** e o erro desaparecerá!

---

## 🔍 Verificar Status dos Índices

Acesse: https://console.firebase.google.com/project/mercearia-antonio-62e60/firestore/indexes
