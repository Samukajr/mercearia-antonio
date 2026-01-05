# 🔧 COMO CORRIGIR SEU ROLE DE PROPRIETÁRIO

## Opção 1: Via Console do Navegador (Mais Rápido)

1. **Abra o console do navegador** (F12 → Console)
2. **Cole o seguinte código:**

```javascript
// Chamar Cloud Function para atribuir role proprietario
const setUserRole = firebase.functions().httpsCallable('setUserRole');

setUserRole({ 
  role: 'proprietario'
}).then(result => {
  console.log('✅ Role atualizado com sucesso!', result);
  alert('Role proprietario atribuído! Recarregue a página (F5)');
  setTimeout(() => location.reload(), 1000);
}).catch(error => {
  console.error('❌ Erro:', error);
  alert('Erro: ' + error.message);
});
```

3. **Pressione Enter**
4. **Recarregue a página** (Ctrl+Shift+R)
5. **Verifique se "Usuários" e "Configurações" reapareceram**

## Opção 2: Via Firebase Console (Mais Seguro para Produção)

Se a Opção 1 não funcionar, você pode atribuir custom claims manualmente:

1. Vá para: [Firebase Console](https://console.firebase.google.com/)
2. Selecione projeto: `mercearia-antonio-62e60`
3. Autenticação → Usuários
4. Encontre seu email: `samukajr82@gmail.com`
5. Clique nos 3 pontos → "Editar custom claims"
6. Adicione o JSON:
```json
{
  "role": "proprietario"
}
```
7. Clique "Salvar"
8. Recarregue a app (Ctrl+Shift+R)

## Por que isso aconteceu?

- Seu usuário foi criado manualmente no Firebase Console
- Não recebeu as "custom claims" (claims personalizadas) que definem seu role
- A RBAC depende dessas custom claims para funcionar
- A Cloud Function `setUserRole` é responsável por atribuir essas claims

## ✅ Como confirmar que funcionou

Depois de recarregar, abra o console (F12) e procure:
```
📋 RBAC DEBUG - Current role: proprietario
  Usuários: required=[listar_usuarios], hasAccess=true
  Configurações: required=[proprietario], hasRole=true
```

Se vir isso, está funcionando! ✅
