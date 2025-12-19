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
          <button class="btn-icon-table" title="Ver QR" onclick="verQrProduto('${doc.id}', ${JSON.stringify(p).replace(/"/g, '&quot;')})"><i class="fas fa-qrcode"></i></button>
          <button class="btn-icon-table" title="Imprimir etiqueta" onclick="imprimirEtiqueta('${doc.id}', ${JSON.stringify(p).replace(/"/g, '&quot;')})"><i class="fas fa-print"></i></button>
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
    // Preferir câmera traseira (environment) para mobile
    let deviceId;
    const rearCamera = devices?.find(d => d.label && d.label.toLowerCase().includes('back'));
    if (rearCamera) {
      deviceId = rearCamera.deviceId;
    } else {
      // Fallback: usar primeira câmera com constraint facingMode
      deviceId = devices?.[0]?.deviceId;
    }
    await codeReader.decodeFromVideoDevice(
      deviceId || undefined,
      'scanner-video',
      (result, err) => {
        if (result && result.text) {
          const codigo = result.text.trim();
          document.getElementById('produto-codigo').value = codigo;
          showToast('success', `Código detectado: ${codigo}`);
          closeScanner();
          autoPreencherPorCodigo(codigo);
        }
      },
      { facingMode: 'environment' } // Força câmera traseira em mobile
    );
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
      // Fallback: tentar buscar na própria base pelo campo 'codigo'
      const qsnap = await window.db.collection('produtos').where('codigo', '==', codigo).limit(1).get();
      if (!qsnap.empty) {
        const prod = qsnap.docs[0].data();
        document.getElementById('produto-nome').value = prod.nome || '';
        document.getElementById('produto-categoria').value = prod.categoria || 'outros';
        document.getElementById('produto-preco').value = prod.preco ?? '';
        document.getElementById('produto-quantidade').value = prod.quantidade ?? '';
        document.getElementById('produto-estoque-min').value = prod.estoqueMin ?? '';
        showToast('success', 'Produto encontrado na base pelo código. Confirme/edite os dados.');
      } else {
        showToast('warning', 'Código válido, mas não encontramos informações externas. Preencha manualmente.');
      }
    }
  } catch (err) {
    console.error('Falha ao consultar OpenFoodFacts', err);
  }
}

window.openScanner = openScanner;
window.closeScanner = closeScanner;

// Cadastro rápido por código
let cadastroRapidoAtivo = false;

async function cadastroRapidoPorCodigo() {
  cadastroRapidoAtivo = true;
  const modal = document.getElementById('modal-scanner');
  modal.classList.add('active');
  try {
    if (!codeReader && window.ZXing && ZXing.BrowserMultiFormatReader) {
      codeReader = new ZXing.BrowserMultiFormatReader();
    }
    if (!codeReader) {
      showToast('error', 'Leitor indisponível. Verifique permissões da câmera.');
      cadastroRapidoAtivo = false;
      return;
    }
    const devices = await codeReader.listVideoInputDevices();
    let deviceId;
    const rearCamera = devices?.find(d => d.label && d.label.toLowerCase().includes('back'));
    if (rearCamera) {
      deviceId = rearCamera.deviceId;
    } else {
      deviceId = devices?.[0]?.deviceId;
    }
    await codeReader.decodeFromVideoDevice(
      deviceId || undefined,
      'scanner-video',
      async (result, err) => {
        if (result && result.text && cadastroRapidoAtivo) {
          const codigo = result.text.trim();
          closeScanner();
          cadastroRapidoAtivo = false;
          await processarCadastroRapido(codigo);
        }
      },
      { facingMode: 'environment' }
    );
  } catch (err) {
    console.error('Falha ao iniciar scanner para cadastro rápido', err);
    showToast('error', 'Não foi possível iniciar a câmera.');
    cadastroRapidoAtivo = false;
  }
}

async function processarCadastroRapido(codigo) {
  try {
    // Verificar se já existe
    const existente = await window.db.collection('produtos').where('codigo', '==', codigo).get();
    if (!existente.empty) {
      showToast('warning', `Produto com código ${codigo} já cadastrado!`);
      return;
    }

    // Tentar buscar no OpenFoodFacts
    const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(codigo)}.json`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data && data.status === 1 && data.product) {
      const produto = data.product;
      const nome = produto.product_name || produto.generic_name || `Produto ${codigo}`;
      const categoriasTxt = (produto.categories || '').toLowerCase();
      let categoria = 'outros';
      if (categoriasTxt.includes('bread') || categoriasTxt.includes('pão') || categoriasTxt.includes('bakery')) categoria = 'paes';
      else if (categoriasTxt.includes('cake') || categoriasTxt.includes('bolo')) categoria = 'bolos';
      else if (categoriasTxt.includes('candy') || categoriasTxt.includes('doce') || categoriasTxt.includes('confectionery')) categoria = 'doces';
      else if (categoriasTxt.includes('beverage') || categoriasTxt.includes('bebida') || categoriasTxt.includes('drink')) categoria = 'bebidas';

      // Salvar automaticamente
      const novoProduto = {
        nome: nome,
        codigo: codigo,
        categoria: categoria,
        preco: 0,
        quantidade: 0,
        estoqueMin: 1,
        criadoEm: firebase.firestore.Timestamp.now(),
        atualizadoEm: firebase.firestore.Timestamp.now()
      };
      
      await window.db.collection('produtos').add(novoProduto);
      showToast('success', `Produto "${nome}" cadastrado! Atualize preço e quantidade.`);
      carregarProdutosVenda();
    } else {
      // Não encontrou dados: abrir modal pré-preenchido
      showToast('info', 'Código válido, mas sem dados externos. Complete o cadastro.');
      showModalProduto();
      document.getElementById('produto-codigo').value = codigo;
    }
  } catch (err) {
    console.error('Erro no cadastro rápido', err);
    showToast('error', 'Falha no cadastro rápido.');
  }
}

window.cadastroRapidoPorCodigo = cadastroRapidoPorCodigo;

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

function verQrProduto(id, p) {
  const codigo = (p && p.codigo) ? p.codigo : id;
  const modal = document.getElementById('modal-qr');
  modal.classList.add('active');
  const container = document.getElementById('qr-container');
  container.innerHTML = '';
  try {
    new QRCode(container, {
      text: codigo,
      width: 256,
      height: 256,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch (err) {
    console.error('Falha ao gerar QR', err);
  }
}

async function imprimirEtiqueta(id, p) {
  const codigo = (p && p.codigo) ? p.codigo : id;
  try {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
      showToast('error', 'Gerador de PDF indisponível.');
      return;
    }
    // Tamanho de etiqueta 50x30mm
    const doc = new jsPDF({ unit: 'mm', format: [50, 30] });
    // Gerar QR temporário e obter data URL
    const temp = document.createElement('div');
    const qr = new QRCode(temp, {
      text: codigo,
      width: 128,
      height: 128,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
    // A lib insere um <img> dentro do container
    const img = temp.querySelector('img');
    let dataUrl;
    if (img && img.src) {
      dataUrl = img.src;
    } else {
      // Fallback: canvas
      const canvas = temp.querySelector('canvas');
      dataUrl = canvas ? canvas.toDataURL('image/png') : null;
    }
    if (dataUrl) {
      doc.addImage(dataUrl, 'PNG', 2, 2, 26, 26); // QR à esquerda
    }
    // Texto à direita
    doc.setFontSize(10);
    doc.text((p.nome || 'Produto'), 30, 8, { maxWidth: 18 });
    doc.setFontSize(9);
    doc.text(`Preço: ${formatCurrency(p.preco || 0)}`, 30, 14);
    doc.setFontSize(8);
    doc.text(`Cod: ${codigo}`, 30, 20, { maxWidth: 18 });
    doc.text('Mercearia do Antonio', 30, 26);
    doc.save(`etiqueta-${(p.nome || 'produto')}.pdf`);
  } catch (err) {
    console.error('Falha ao gerar etiqueta', err);
    showToast('error', 'Não foi possível gerar a etiqueta.');
  }
}

window.verQrProduto = verQrProduto;
window.imprimirEtiqueta = imprimirEtiqueta;