function carregarEstoque() {
  window.db.collection('produtos').orderBy('nome').onSnapshot((snap) => {
    const tbody = document.getElementById('tbody-estoque');
    tbody.innerHTML = '';
    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Nenhum produto cadastrado</td></tr>';
      return;
    }
    snap.forEach((doc) => {
      const p = doc.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.nome}</td>
        <td>${p.categoria}</td>
        <td>${p.quantidade}</td>
        <td>${formatCurrency(p.preco)}</td>
        <td>${p.quantidade <= p.estoqueMin ? '<span class="badge badge-warning">Baixo</span>' : '<span class="badge badge-success">OK</span>'}</td>
        <td class="action-buttons">
          <button class="btn-icon-table edit" title="Editar" onclick="editarProduto('${doc.id}', ${JSON.stringify(p).replace(/"/g, '&quot;')})"><i class="fas fa-edit"></i></button>
          <button class="btn-icon-table delete" title="Excluir" onclick="excluirProduto('${doc.id}')"><i class="fas fa-trash"></i></button>
        </td>`;
      tbody.appendChild(tr);
    });
  }, (err) => {
    console.error('Erro ao ouvir estoque', err);
    const code = err && err.code ? err.code : 'erro-desconhecido';
    if (code === 'permission-denied') {
      showToast('error', 'Permissão negada no Firestore. Publique as regras e confirme o banco criado.');
    } else {
      showToast('error', `Falha ao carregar estoque (${code}).`);
    }
  });
}

function showModalProduto() {
  document.getElementById('modal-produto-title').textContent = 'Novo Produto';
  document.getElementById('produto-id').value = '';
  document.getElementById('produto-nome').value = '';
  document.getElementById('produto-codigo').value = '';
  document.getElementById('produto-categoria').value = '';
  document.getElementById('produto-preco').value = '';
  document.getElementById('produto-quantidade').value = '';
  document.getElementById('produto-estoque-min').value = '';
  document.getElementById('modal-produto').classList.add('active');
}

function editarProduto(id, p) {
  document.getElementById('modal-produto-title').textContent = 'Editar Produto';
  document.getElementById('produto-id').value = id;
  document.getElementById('produto-nome').value = p.nome || '';
  document.getElementById('produto-codigo').value = p.codigo || '';
  document.getElementById('produto-categoria').value = p.categoria || '';
  document.getElementById('produto-preco').value = p.preco || '';
  document.getElementById('produto-quantidade').value = p.quantidade || '';
  document.getElementById('produto-estoque-min').value = p.estoqueMin || '';
  document.getElementById('modal-produto').classList.add('active');
}

async function salvarProduto(e) {
  e.preventDefault();
  const id = document.getElementById('produto-id').value;
  const dados = {
    nome: document.getElementById('produto-nome').value.trim(),
    codigo: document.getElementById('produto-codigo').value.trim(),
    categoria: document.getElementById('produto-categoria').value,
    preco: Number(document.getElementById('produto-preco').value),
    quantidade: Number(document.getElementById('produto-quantidade').value),
    estoqueMin: Number(document.getElementById('produto-estoque-min').value),
    atualizadoEm: firebase.firestore.Timestamp.now()
  };
  try {
    // Validar duplicidade de código (se informado)
    if (dados.codigo) {
      const dupSnap = await window.db.collection('produtos').where('codigo', '==', dados.codigo).get();
      const duplicado = dupSnap.docs.find(d => d.id !== id);
      if (duplicado) {
        showToast('error', 'Já existe produto com este código. Use outro código.');
        return;
      }
    }
  } catch (err) {
    console.error('Erro ao validar código duplicado', err);
  }
  try {
    if (id) {
      await window.db.collection('produtos').doc(id).update(dados);
      showToast('success', 'Produto atualizado!');
    } else {
      dados.criadoEm = firebase.firestore.Timestamp.now();
      await window.db.collection('produtos').add(dados);
      showToast('success', 'Produto criado!');
    }
    closeModal('modal-produto');
    carregarProdutosVenda();
  } catch (err) {
    console.error(err);
    showToast('error', 'Erro ao salvar produto');
  }
}

document.getElementById('form-produto').addEventListener('submit', salvarProduto);

async function excluirProduto(id) {
  if (!confirm('Excluir este produto?')) return;
  try {
    await window.db.collection('produtos').doc(id).delete();
    showToast('success', 'Produto excluído!');
    carregarProdutosVenda();
  } catch (err) {
    console.error(err);
    showToast('error', 'Erro ao excluir produto');
  }
}

// Busca no estoque
const searchEstoque = document.getElementById('search-estoque');
if (searchEstoque) {
  searchEstoque.addEventListener('input', () => {
    const q = searchEstoque.value.toLowerCase();
    document.querySelectorAll('#tabela-estoque tbody tr').forEach((tr) => {
      const nome = tr.children[0]?.textContent?.toLowerCase() || '';
      tr.style.display = nome.includes(q) ? '' : 'none';
    });
  });
}

// Expor globais
window.carregarEstoque = carregarEstoque;
window.showModalProduto = showModalProduto;
window.editarProduto = editarProduto;
window.excluirProduto = excluirProduto;

// Scanner (QR/Código de Barras)
let codeReader;

async function openScanner() {
  const modal = document.getElementById('modal-scanner');
  modal.classList.add('active');
  try {
    if (!codeReader && window.ZXing && ZXing.BrowserMultiFormatReader) {
      codeReader = new ZXing.BrowserMultiFormatReader();
    }
    if (!codeReader) {
      showToast('error', 'Leitor indisponível. Verifique permissões da câmera.');
      return;
    }
    const devices = await codeReader.listVideoInputDevices();
    const deviceId = devices?.[0]?.deviceId;
    await codeReader.decodeFromVideoDevice(deviceId || undefined, 'scanner-video', (result, err) => {
      if (result && result.text) {
        const codigo = result.text.trim();
        document.getElementById('produto-codigo').value = codigo;
        showToast('success', `Código detectado: ${codigo}`);
        closeScanner();
        autoPreencherPorCodigo(codigo);
      }
    });
  } catch (err) {
    console.error('Falha ao iniciar scanner', err);
    showToast('error', 'Não foi possível iniciar a câmera.');
  }
}

function closeScanner() {
  try {
    if (codeReader) codeReader.reset();
  } catch (_) {}
  document.getElementById('modal-scanner').classList.remove('active');
}

async function autoPreencherPorCodigo(codigo) {
  if (!codigo) return;
  try {
    const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(codigo)}.json`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.status === 1 && data.product) {
      const produto = data.product;
      const nome = produto.product_name || produto.generic_name || '';
      const categoriasTxt = (produto.categories || '').toLowerCase();
      let categoria = 'outros';
      if (categoriasTxt.includes('bread') || categoriasTxt.includes('pão') || categoriasTxt.includes('bakery')) categoria = 'paes';
      else if (categoriasTxt.includes('cake') || categoriasTxt.includes('bolo')) categoria = 'bolos';
      else if (categoriasTxt.includes('candy') || categoriasTxt.includes('doce') || categoriasTxt.includes('confectionery')) categoria = 'doces';
      else if (categoriasTxt.includes('beverage') || categoriasTxt.includes('bebida') || categoriasTxt.includes('drink')) categoria = 'bebidas';

      if (nome) document.getElementById('produto-nome').value = nome;
      document.getElementById('produto-categoria').value = categoria;
      showToast('success', 'Produto pré-preenchido a partir do código. Confirme os dados.');
    } else {
      showToast('warning', 'Código válido, mas não encontramos informações. Preencha manualmente.');
    }
  } catch (err) {
    console.error('Falha ao consultar OpenFoodFacts', err);
  }
}

window.openScanner = openScanner;
window.closeScanner = closeScanner;
// QR interno
function gerarCodigoInterno() {
  const el = document.getElementById('produto-codigo');
  if (!el.value) {
    el.value = 'QR-' + Date.now().toString(36) + '-' + Math.floor(Math.random()*1e6).toString(36);
  }
  showToast('success', 'Código interno gerado.');
}

function openQrModal() {
  const codigo = document.getElementById('produto-codigo').value.trim();
  if (!codigo) {
    gerarCodigoInterno();
  }
  const modal = document.getElementById('modal-qr');
  modal.classList.add('active');
  const container = document.getElementById('qr-container');
  container.innerHTML = '';
  try {
    // Tamanho padrão para impressão simples
    const qr = new QRCode(container, {
      text: document.getElementById('produto-codigo').value.trim(),
      width: 256,
      height: 256,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch (err) {
    console.error('Falha ao gerar QR', err);
    showToast('error', 'Não foi possível gerar o QR.');
  }
}

function closeQrModal() {
  document.getElementById('modal-qr').classList.remove('active');
}

window.gerarCodigoInterno = gerarCodigoInterno;
window.openQrModal = openQrModal;
window.closeQrModal = closeQrModal;