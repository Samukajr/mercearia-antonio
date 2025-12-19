let carrinho = [];

function carregarVendasRecentes() {
  window.db.collection('vendas')
    .where('data', '>=', inicioDoDia())
    .orderBy('data', 'desc')
    .limit(20)
    .onSnapshot((snap) => {
      const container = document.getElementById('vendas-recentes');
      if (snap.empty) {
        container.innerHTML = '<p class="empty-state">Nenhuma venda realizada hoje</p>';
        return;
      }
      container.innerHTML = '';
      snap.forEach((doc) => {
        const v = doc.data();
        const item = document.createElement('div');
        item.className = 'venda-item';
        item.innerHTML = `
          <div class="venda-info">
            <div class="venda-hora">${formatTime(v.data.toDate())}</div>
            <div class="venda-descricao">${v.itens.map(i => i.nome).join(', ')}</div>
          </div>
          <div>
            <span class="venda-valor">${formatCurrency(v.total)}</span>
            <span class="venda-forma">${v.forma}</span>
          </div>`;
        container.appendChild(item);
      });
    });
}

function inicioDoDia() {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d;
}

function formatCurrency(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatTime(d) {
  return d.toLocaleTimeString('pt-BR');
}

// Produtos para venda (carregados do estoque)
async function carregarProdutosVenda() {
  const ref = window.db.collection('produtos').orderBy('nome');
  const grid = document.getElementById('lista-produtos-venda');
  grid.innerHTML = '';
  try {
    const snap = await ref.get();
    if (snap.empty) {
      grid.innerHTML = '<p class="empty-state">Sem produtos no estoque</p>';
      return;
    }
    snap.forEach(doc => {
      const p = doc.data();
      const card = document.createElement('div');
      card.className = `produto-card ${p.quantidade <= 0 ? 'sem-estoque' : ''}`;
      card.onclick = () => { if (p.quantidade > 0) adicionarAoCarrinho(doc.id, p); };
      card.innerHTML = `
        <div class="produto-icon"><i class="fas fa-bread-slice"></i></div>
        <h4>${p.nome}</h4>
        <div class="produto-preco">${formatCurrency(p.preco)}</div>
        <div class="produto-estoque">Estoque: ${p.quantidade}</div>`;
      grid.appendChild(card);
    });
  } catch (err) {
    console.error('Erro ao carregar produtos para venda', err);
    const code = err && err.code ? err.code : 'erro-desconhecido';
    if (code === 'permission-denied') {
      grid.innerHTML = '<p class="empty-state">Sem permissão para ler produtos. Publique regras do Firestore.</p>';
    } else {
      grid.innerHTML = `<p class="empty-state">Falha ao carregar produtos (${code}).</p>`;
    }
  }

  // Vínculo da busca
  const search = document.getElementById('search-produto');
  if (search) {
    search.addEventListener('input', () => {
      const q = search.value.toLowerCase();
      grid.querySelectorAll('.produto-card').forEach((el) => {
        const nome = el.querySelector('h4')?.textContent?.toLowerCase() || '';
        el.style.display = nome.includes(q) ? '' : 'none';
      });
    });
  }
}

function adicionarAoCarrinho(id, p) {
  const idx = carrinho.findIndex(i => i.id === id);
  if (idx >= 0) {
    carrinho[idx].qtd += 1;
  } else {
    carrinho.push({ id, nome: p.nome, preco: p.preco, qtd: 1 });
  }
  renderizarCarrinho();
}

function renderizarCarrinho() {
  const list = document.getElementById('carrinho-itens');
  list.innerHTML = '';
  if (carrinho.length === 0) {
    list.innerHTML = '<p class="empty-state">Carrinho vazio</p>';
  }
  let subtotal = 0;
  carrinho.forEach((i, idx) => {
    subtotal += i.preco * i.qtd;
    const row = document.createElement('div');
    row.className = 'carrinho-item';
    row.innerHTML = `
      <div class="carrinho-item-info">
        <div class="carrinho-item-nome">${i.nome}</div>
        <div class="carrinho-item-preco">${formatCurrency(i.preco)} cada</div>
      </div>
      <div class="carrinho-item-qtd">
        <button class="qtd-btn" onclick="alterarQtd(${idx}, -1)">-</button>
        <span class="qtd-value">${i.qtd}</span>
        <button class="qtd-btn" onclick="alterarQtd(${idx}, 1)">+</button>
      </div>
      <button class="carrinho-item-remove" onclick="removerCarrinho(${idx})"><i class="fas fa-times"></i></button>`;
    list.appendChild(row);
  });
  document.getElementById('carrinho-subtotal').textContent = formatCurrency(subtotal);
  document.getElementById('carrinho-total').textContent = formatCurrency(subtotal);
}

function alterarQtd(idx, delta) {
  carrinho[idx].qtd += delta;
  if (carrinho[idx].qtd <= 0) carrinho.splice(idx, 1);
  renderizarCarrinho();
}

function removerCarrinho(idx) {
  carrinho.splice(idx, 1);
  renderizarCarrinho();
}

function limparCarrinho() {
  carrinho = [];
  renderizarCarrinho();
}

async function finalizarVenda() {
  if (carrinho.length === 0) {
    showToast('warning', 'Carrinho vazio');
    return;
  }
  const forma = document.getElementById('forma-pagamento').value;
  const total = carrinho.reduce((s, i) => s + i.preco * i.qtd, 0);
  const itens = carrinho.map(i => ({ id: i.id, nome: i.nome, preco: i.preco, qtd: i.qtd }));

  const batch = window.db.batch();
  const vendaRef = window.db.collection('vendas').doc();
  batch.set(vendaRef, { forma, total, itens, data: firebase.firestore.Timestamp.now() });

  // Baixar estoque
  itens.forEach(i => {
    const prodRef = window.db.collection('produtos').doc(i.id);
    batch.update(prodRef, { quantidade: firebase.firestore.FieldValue.increment(-i.qtd) });
  });

  // Registrar movimentação no caixa
  const movRef = window.db.collection('movimentacoes').doc();
  batch.set(movRef, { tipo: 'entrada', origem: 'venda', descricao: `Venda (${forma})`, valor: total, data: firebase.firestore.Timestamp.now() });

  try {
    await batch.commit();
    limparCarrinho();
    carregarProdutosVenda();
    showToast('success', 'Venda registrada com sucesso!');
    atualizarSaldoCaixa();
  } catch (err) {
    console.error(err);
    showToast('error', 'Erro ao registrar venda.');
  }
}

// Expor globais
window.carregarProdutosVenda = carregarProdutosVenda;
window.limparCarrinho = limparCarrinho;
window.finalizarVenda = finalizarVenda;
window.alterarQtd = alterarQtd;
window.removerCarrinho = removerCarrinho;

// Scanner para adicionar produtos por código
let vendaCodeReader;
let scannerVendaAtivo = false;
let lastVendaCodigo = null;
let lastVendaTimestamp = 0;

async function openScannerVenda() {
  const modal = document.getElementById('modal-scanner');
  modal.classList.add('active');
  try {
    if (!vendaCodeReader && window.ZXing && ZXing.BrowserMultiFormatReader) {
      // Hints para formatos comuns de código de barras e QR
      const hints = new Map();
      const formats = [
        ZXing.BarcodeFormat.QR_CODE,
        ZXing.BarcodeFormat.EAN_13,
        ZXing.BarcodeFormat.EAN_8,
        ZXing.BarcodeFormat.UPC_A,
        ZXing.BarcodeFormat.UPC_E,
        ZXing.BarcodeFormat.CODE_128,
        ZXing.BarcodeFormat.CODE_39,
        ZXing.BarcodeFormat.ITF
      ];
      hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
      hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
      vendaCodeReader = new ZXing.BrowserMultiFormatReader(hints);
      window.vendaCodeReader = vendaCodeReader;
    }
    if (!vendaCodeReader) {
      showToast('error', 'Leitor indisponível. Verifique permissões da câmera.');
      return;
    }
    scannerVendaAtivo = true;
    const devices = await vendaCodeReader.listVideoInputDevices();
    let deviceId;
    const rearCamera = devices?.find(d => d.label && d.label.toLowerCase().includes('back'));
    if (rearCamera) deviceId = rearCamera.deviceId; else deviceId = devices?.[0]?.deviceId;

    await vendaCodeReader.decodeFromVideoDevice(
      deviceId || undefined,
      'scanner-video',
      async (result, err) => {
        if (!scannerVendaAtivo) return;
        if (result && result.text) {
          const codigo = result.text.trim();
          const now = Date.now();
          // Evitar duplicatas em sequência (2s)
          if (codigo === lastVendaCodigo && (now - lastVendaTimestamp) < 2000) {
            return;
          }
          lastVendaCodigo = codigo;
          lastVendaTimestamp = now;
          try { await adicionarPorCodigo(codigo); } catch (e) { console.error(e); }
          // Permanece em modo contínuo até cancelar
        }
      },
      { facingMode: 'environment' }
    );
  } catch (err) {
    console.error('Falha ao iniciar scanner de venda', err);
    showToast('error', 'Não foi possível iniciar a câmera.');
  }
}

async function adicionarPorCodigo(codigo) {
  if (!codigo) return;
  try {
    // Buscar produto pelo campo 'codigo'
    const qsnap = await window.db.collection('produtos').where('codigo', '==', codigo).limit(1).get();
    if (qsnap.empty) {
      showToast('warning', `Produto com código ${codigo} não encontrado no estoque.`);
      return;
    }
    const doc = qsnap.docs[0];
    const p = doc.data();
    const disponivel = Number(p.quantidade ?? 0);
    if (!p || disponivel <= 0) {
      showToast('warning', 'Produto sem estoque disponível.');
      return;
    }
    const qtdStr = prompt(`Quantidade para "${p.nome}" (estoque: ${disponivel})`, '1');
    if (qtdStr === null) {
      showToast('info', 'Operação cancelada.');
      return;
    }
    let qtd = parseInt(qtdStr, 10);
    if (Number.isNaN(qtd) || qtd <= 0) {
      showToast('warning', 'Quantidade inválida.');
      return;
    }
    if (qtd > disponivel) {
      showToast('warning', `Quantidade maior que estoque. Ajustado para ${disponivel}.`);
      qtd = disponivel;
    }
    adicionarAoCarrinhoComQtd(doc.id, p, qtd);
    showToast('success', `Adicionado: ${p.nome} x${qtd}`);
  } catch (err) {
    console.error('Falha ao adicionar por código', err);
    showToast('error', 'Erro ao buscar produto por código.');
  }
}

window.openScannerVenda = openScannerVenda;

function closeScannerVenda() {
  try {
    scannerVendaAtivo = false;
    if (vendaCodeReader) vendaCodeReader.reset();
  } catch (_) {}
  if (window.closeScanner) window.closeScanner();
}
window.closeScannerVenda = closeScannerVenda;

function adicionarAoCarrinhoComQtd(id, p, qtd) {
  const idx = carrinho.findIndex(i => i.id === id);
  if (idx >= 0) {
    carrinho[idx].qtd += qtd;
  } else {
    carrinho.push({ id, nome: p.nome, preco: p.preco, qtd });
  }
  renderizarCarrinho();
}