# Mercearia do Antonio - SaaS

Sistema PWA SaaS para controle de estoque, vendas, caixa e relatórios.

## 🚀 Setup Rápido

**Siga o guia completo:** [SETUP-FIREBASE.md](SETUP-FIREBASE.md)

### Resumo:
1. Criar projeto Firebase (Auth + Firestore)
2. Copiar config para `js/firebase-config.js`
3. Publicar regras do Firestore
4. Deploy no Netlify
5. Criar primeiro usuário
6. Acessar online e testar!

## Stack Tecnológico
- **Backend**: Firebase Auth + Firestore (SDK 9 compat)
- **Frontend**: Vanilla JS + CSS
- **PWA**: Manifest + Service Worker
- **Deploy**: Netlify (recomendado) ou Firebase Hosting

## Estrutura do Projeto
```
mercearia-antonio/
├── index.html              # UI principal
├── css/
│   ├── styles.css          # Estilos globais
│   ├── login.css           # Tela de login
│   └── components.css      # Componentes (carrinho, cards, etc)
├── js/
│   ├── firebase-config.js  # Configuração Firebase ⚙️
│   ├── app.js              # Auth + UI core
│   ├── vendas.js           # Módulo de vendas
│   ├── estoque.js          # Módulo de estoque
│   ├── caixa.js            # Fluxo de caixa
│   └── relatorios.js       # Relatórios e rankings
├── assets/                 # Ícones PWA (adicionar)
├── manifest.json           # PWA manifest
├── service-worker.js       # Cache offline
├── firestore.rules         # Regras Firestore
├── netlify.toml            # Config deploy
└── SETUP-FIREBASE.md       # 📖 Guia completo
```

## ⚙️ Configuração Firebase

### 1. Criar Projeto
- Console: https://console.firebase.google.com/
- Habilitar **Authentication** (Email/Password)
- Criar **Firestore Database** (São Paulo)

### 2. Copiar Config
Edite `js/firebase-config.js`:

```javascript
window.firebaseConfig = {
  apiKey: "sua-api-key",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 3. Publicar Regras
Copie o conteúdo de `firestore.rules` para o Firebase Console

## 🌐 Deploy (Netlify)

### Método 1: Drag & Drop
1. Acesse: https://app.netlify.com/drop
2. Arraste a pasta do projeto
3. Pronto! URL gerada automaticamente

### Método 2: Git (Recomendado)
```powershell
git init
git add .
git commit -m "Initial commit"
# Push para GitHub
# Conectar repositório no Netlify
```

## 📊 Coleções Firestore

### `produtos`
```javascript
{
  nome: string,
  categoria: string,        // paes, bolos, doces, bebidas, outros
  preco: number,
  quantidade: number,
  estoqueMin: number,
  criadoEm: timestamp,
  atualizadoEm: timestamp
}
```

### `vendas`
```javascript
{
  forma: string,            // dinheiro, pix, debito, credito
  total: number,
  itens: [
    { id, nome, preco, qtd }
  ],
  data: timestamp
}
```

### `movimentacoes`
```javascript
{
  tipo: string,             // entrada, saida
  origem: string,           // venda, compra, etc (opcional)
  descricao: string,
  valor: number,
  data: timestamp
}
```

## 🔐 Segurança

- Regras Firestore: Apenas usuários autenticados
- Sistema single-tenant (um proprietário)
- Backup recomendado via Firebase Console

## 🆘 Suporte

Consulte [SETUP-FIREBASE.md](SETUP-FIREBASE.md) para troubleshooting.

## 📝 Licença

Uso interno da Mercearia do Antonio © 2025
