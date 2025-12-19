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
let useNativeDetectorEstoque = false;
let nativeDetectorEstoque = null;
let nativeDetectTimerEstoque = null;
let estoqueVideoStream = null;
let lastEstoqueCodigo = null;
let lastEstoqueTimestamp = 0;
let validarMinAjuste = true;
let allowBelowMinCSV = false;
function initAjusteMinControls() {
  try {
    const el = document.getElementById('ajuste-validate-min-toggle');
    const elAllow = document.getElementById('ajuste-allow-below-min-toggle');
    const saved = localStorage.getItem('ajusteValidateMin');
    const savedAllow = localStorage.getItem('ajusteAllowBelowMinCSV');
    validarMinAjuste = saved ? saved === 'true' : true;
    allowBelowMinCSV = savedAllow ? savedAllow === 'true' : false;
    if (el) {
      el.checked = validarMinAjuste;
      el.addEventListener('change', () => {
        validarMinAjuste = !!el.checked;
        localStorage.setItem('ajusteValidateMin', String(validarMinAjuste));
      });
    }
    if (elAllow) {
      elAllow.checked = allowBelowMinCSV;
      elAllow.addEventListener('change', () => {
        allowBelowMinCSV = !!elAllow.checked;
        localStorage.setItem('ajusteAllowBelowMinCSV', String(allowBelowMinCSV));
      });
    }
  } catch (_) {}
}

async function openScanner() {
  const modal = document.getElementById('modal-scanner');
  modal.classList.add('active');
  try {
    useNativeDetectorEstoque = false;
    if (window.BarcodeDetector) {
      try {
        const supported = await BarcodeDetector.getSupportedFormats();
        const needed = ['qr_code','ean_13','ean_8','upc_a','upc_e','code_128','code_39','itf'];
        const ok = needed.some(fmt => supported.includes(fmt));
        if (ok) {
          nativeDetectorEstoque = new BarcodeDetector({ formats: needed });
          useNativeDetectorEstoque = true;
        }
      } catch (_) {
        useNativeDetectorEstoque = false;
      }
    }
    if (!codeReader && window.ZXing && ZXing.BrowserMultiFormatReader) {
      // Configurar hints para todos os formatos comuns
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
      codeReader = new ZXing.BrowserMultiFormatReader(hints);
    }
    if (!codeReader && !useNativeDetectorEstoque) {
      showToast('error', 'Leitor indisponível. Verifique permissões da câmera.');
      return;
    }
    if (useNativeDetectorEstoque) {
      await startNativeScannerEstoqueStream('fill');
    } else {
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
        (result, err) => {
          if (result && result.text) {
            const codigo = result.text.trim();
            document.getElementById('produto-codigo').value = codigo;
            showToast('success', `Código detectado: ${codigo}`);
            closeScanner();
            autoPreencherPorCodigo(codigo);
          }
        },
        { facingMode: 'environment' }
      );
    }
  } catch (err) {
    console.error('Falha ao iniciar scanner', err);
    showToast('error', 'Não foi possível iniciar a câmera.');
  }
}

async function startNativeScannerEstoqueStream(modo) {
  try {
    const videoEl = document.getElementById('scanner-video');
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    estoqueVideoStream = stream;
    if (videoEl) {
      videoEl.srcObject = stream;
      await videoEl.play();
    }
    const detectLoop = async () => {
      if (!nativeDetectorEstoque) return;
      try {
        const video = document.getElementById('scanner-video');
        const barcodes = await nativeDetectorEstoque.detect(video);
        if (barcodes && barcodes.length > 0) {
          const raw = barcodes[0].rawValue || barcodes[0].value || '';
          const codigo = String(raw).trim();
          const now = Date.now();
          if (!(codigo === lastEstoqueCodigo && (now - lastEstoqueTimestamp) < 2000)) {
            lastEstoqueCodigo = codigo;
            lastEstoqueTimestamp = now;
            if (modo === 'fill') {
              document.getElementById('produto-codigo').value = codigo;
              showToast('success', `Código detectado: ${codigo}`);
              closeScanner();
              autoPreencherPorCodigo(codigo);
              return;
            }
            if (modo === 'cadastro') {
              closeScanner();
              await processarCadastroRapido(codigo);
              return;
            }
            if (modo === 'atualizacao') {
              closeScanner();
              atualizacaoRapidaAtiva = false;
              await processarAtualizacaoRapida(codigo);
              return;
            }
          }
        }
      } catch (_) {}
      nativeDetectTimerEstoque = setTimeout(detectLoop, 300);
    };
    detectLoop();
  } catch (e) {
    console.error('Falha ao iniciar BarcodeDetector nativo (estoque)', e);
    showToast('error', 'Erro ao iniciar câmera.');
    useNativeDetectorEstoque = false;
    if (!codeReader) {
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
      codeReader = new ZXing.BrowserMultiFormatReader(hints);
    }
  }
}

function closeScanner() {
  try {
    if (codeReader) codeReader.reset();
  } catch (_) {}
  try {
    if (window.vendaCodeReader) window.vendaCodeReader.reset();
  } catch (_) {}
  try {
    if (nativeDetectTimerEstoque) { clearTimeout(nativeDetectTimerEstoque); nativeDetectTimerEstoque = null; }
    const videoEl = document.getElementById('scanner-video');
    if (videoEl && videoEl.srcObject) {
      const tracks = videoEl.srcObject.getTracks();
      tracks.forEach(t => t.stop());
      videoEl.srcObject = null;
    }
    if (estoqueVideoStream) {
      estoqueVideoStream.getTracks().forEach(t => t.stop());
      estoqueVideoStream = null;
    }
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
let atualizacaoRapidaAtiva = false;

async function cadastroRapidoPorCodigo() {
  cadastroRapidoAtivo = true;
  const modal = document.getElementById('modal-scanner');
  modal.classList.add('active');
  try {
    useNativeDetectorEstoque = false;
    if (window.BarcodeDetector) {
      try {
        const supported = await BarcodeDetector.getSupportedFormats();
        const needed = ['qr_code','ean_13','ean_8','upc_a','upc_e','code_128','code_39','itf'];
        const ok = needed.some(fmt => supported.includes(fmt));
        if (ok) {
          nativeDetectorEstoque = new BarcodeDetector({ formats: needed });
          useNativeDetectorEstoque = true;
        }
      } catch (_) {
        useNativeDetectorEstoque = false;
      }
    }
    if (!codeReader && window.ZXing && ZXing.BrowserMultiFormatReader) {
      // Configurar hints para todos os formatos comuns
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
      codeReader = new ZXing.BrowserMultiFormatReader(hints);
    }
    if (!codeReader && !useNativeDetectorEstoque) {
      showToast('error', 'Leitor indisponível. Verifique permissões da câmera.');
      cadastroRapidoAtivo = false;
      return;
    }
    if (useNativeDetectorEstoque) {
      await startNativeScannerEstoqueStream('cadastro');
    } else {
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
    }
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
async function ajusteRapidoPorCodigo() {
  ajusteRapidoAtivo = true;
  const modal = document.getElementById('modal-scanner');
  modal.classList.add('active');
  try {
    useNativeDetectorEstoque = false;
    if (window.BarcodeDetector) {
      try {
        const supported = await BarcodeDetector.getSupportedFormats();
        const needed = ['qr_code','ean_13','ean_8','upc_a','upc_e','code_128','code_39','itf'];
        const ok = needed.some(fmt => supported.includes(fmt));
        if (ok) {
          nativeDetectorEstoque = new BarcodeDetector({ formats: needed });
          useNativeDetectorEstoque = true;
        }
      } catch (_) { useNativeDetectorEstoque = false; }
    }
    if (!codeReader && window.ZXing && ZXing.BrowserMultiFormatReader) {
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
      codeReader = new ZXing.BrowserMultiFormatReader(hints);
    }
    if (!codeReader && !useNativeDetectorEstoque) {
      showToast('error', 'Leitor indisponível. Verifique permissões da câmera.');
      ajusteRapidoAtivo = false;
      return;
    }
    if (useNativeDetectorEstoque) {
      await startNativeScannerEstoqueStream('ajuste');
    } else {
      const devices = await codeReader.listVideoInputDevices();
      let deviceId;
      const rearCamera = devices?.find(d => d.label && d.label.toLowerCase().includes('back'));
      if (rearCamera) { deviceId = rearCamera.deviceId; } else { deviceId = devices?.[0]?.deviceId; }
      await codeReader.decodeFromVideoDevice(
        deviceId || undefined,
        'scanner-video',
        async (result, err) => {
          if (result && result.text && ajusteRapidoAtivo) {
            const codigo = result.text.trim();
            closeScanner();
            ajusteRapidoAtivo = false;
            await processarAjusteRapido(codigo);
          }
        },
        { facingMode: 'environment' }
      );
    }
  } catch (err) {
    console.error('Falha ao iniciar scanner para ajuste rápido', err);
    showToast('error', 'Não foi possível iniciar a câmera.');
    ajusteRapidoAtivo = false;
  }
}

async function processarAjusteRapido(codigo) {
  try {
    const qsnap = await window.db.collection('produtos').where('codigo', '==', codigo).limit(1).get();
    if (qsnap.empty) {
      showToast('warning', `Produto com código ${codigo} não encontrado.`);
      return;
    }
    const doc = qsnap.docs[0];
    const p = doc.data();
    const deltaStr = prompt(`Ajuste de quantidade para "${p.nome}" (use +N ou -N):`, '+1');
    if (deltaStr === null || deltaStr.trim() === '') { showToast('info', 'Ajuste cancelado.'); return; }
    let delta = Number(deltaStr);
    if (Number.isNaN(delta)) {
      // tentar interpretar com + ou -
      const m = deltaStr.trim().match(/^([+-])\s*(\d+)$/);
      if (m) {
        const s = m[1] === '-' ? -1 : 1;
        delta = s * Number(m[2]);
      }
    }
    if (Number.isNaN(delta) || delta === 0) { showToast('warning', 'Valor de ajuste inválido.'); return; }
    const atual = Number(p.quantidade || 0);
    let novo = atual + delta;
    if (novo < 0) novo = 0;
    const min = Number(p.estoqueMin || 0);
    if (validarMinAjuste && novo < min) {
      const ok = confirm(`A quantidade resultante (${novo}) ficará abaixo do estoque mínimo (${min}). Deseja confirmar o ajuste?`);
      if (!ok) { showToast('info', 'Ajuste cancelado por estoque mínimo.'); return; }
    }
    await window.db.collection('produtos').doc(doc.id).update({ quantidade: novo, atualizadoEm: firebase.firestore.Timestamp.now() });
    showToast('success', `Quantidade ajustada: ${atual} → ${novo}`);
    carregarProdutosVenda();
  } catch (err) {
    console.error('Erro no ajuste rápido', err);
    showToast('error', 'Falha no ajuste rápido.');
  }
}
async function atualizacaoRapidaPorCodigo() {
  atualizacaoRapidaAtiva = true;
  const modal = document.getElementById('modal-scanner');
  modal.classList.add('active');
  try {
    useNativeDetectorEstoque = false;
    if (window.BarcodeDetector) {
      try {
        const supported = await BarcodeDetector.getSupportedFormats();
        const needed = ['qr_code','ean_13','ean_8','upc_a','upc_e','code_128','code_39','itf'];
        const ok = needed.some(fmt => supported.includes(fmt));
        if (ok) {
          nativeDetectorEstoque = new BarcodeDetector({ formats: needed });
          useNativeDetectorEstoque = true;
        }
      } catch (_) { useNativeDetectorEstoque = false; }
    }
    if (!codeReader && window.ZXing && ZXing.BrowserMultiFormatReader) {
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
      codeReader = new ZXing.BrowserMultiFormatReader(hints);
    }
    if (!codeReader && !useNativeDetectorEstoque) {
      showToast('error', 'Leitor indisponível. Verifique permissões da câmera.');
      atualizacaoRapidaAtiva = false;
      return;
    }
    if (useNativeDetectorEstoque) {
      await startNativeScannerEstoqueStream('atualizacao');
    } else {
      const devices = await codeReader.listVideoInputDevices();
      let deviceId;
      const rearCamera = devices?.find(d => d.label && d.label.toLowerCase().includes('back'));
      if (rearCamera) { deviceId = rearCamera.deviceId; } else { deviceId = devices?.[0]?.deviceId; }
      await codeReader.decodeFromVideoDevice(
        deviceId || undefined,
        'scanner-video',
        async (result, err) => {
          if (result && result.text && atualizacaoRapidaAtiva) {
            const codigo = result.text.trim();
            closeScanner();
            atualizacaoRapidaAtiva = false;
            await processarAtualizacaoRapida(codigo);
          }
        },
        { facingMode: 'environment' }
      );
    }
  } catch (err) {
    console.error('Falha ao iniciar scanner para atualização rápida', err);
    showToast('error', 'Não foi possível iniciar a câmera.');
    atualizacaoRapidaAtiva = false;
  }
}

async function processarAtualizacaoRapida(codigo) {
  try {
    const qsnap = await window.db.collection('produtos').where('codigo', '==', codigo).limit(1).get();
    if (qsnap.empty) {
      showToast('warning', `Produto com código ${codigo} não encontrado.`);
      return;
    }
    const doc = qsnap.docs[0];
    const p = doc.data();
    const qtdStr = prompt(`Nova quantidade para "${p.nome}" (em branco para manter):`, String(p.quantidade ?? 0));
    const precoStr = prompt(`Novo preço (R$) para "${p.nome}" (em branco para manter):`, String(p.preco ?? 0));
    const updates = { atualizadoEm: firebase.firestore.Timestamp.now() };
    let alterou = false;
    if (qtdStr !== null && qtdStr.trim() !== '') {
      const q = Number(qtdStr);
      if (!Number.isNaN(q) && q >= 0) { updates.quantidade = q; alterou = true; }
    }
    if (precoStr !== null && precoStr.trim() !== '') {
      const v = Number(precoStr);
      if (!Number.isNaN(v) && v >= 0) { updates.preco = v; alterou = true; }
    }
    if (!alterou) { showToast('info', 'Nenhuma alteração aplicada.'); return; }
    await window.db.collection('produtos').doc(doc.id).update(updates);
    showToast('success', 'Produto atualizado com sucesso!');
    carregarProdutosVenda();
  } catch (err) {
    console.error('Erro na atualização rápida', err);
    showToast('error', 'Falha na atualização rápida.');
  }
}

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

// CSV (Modelo e Importação)
function baixarCSVEstoque(conteudo, nome) {
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCSVEstoque(str) {
  const s = String(str ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function gerarModeloCSVEstoque() {
  const linhas = ['nome,codigo,categoria,preco,quantidade,estoqueMin'];
  baixarCSVEstoque(linhas.join('\n'), `modelo-produtos-${new Date().toISOString().slice(0,10)}.csv`);
  showToast('success', 'Modelo CSV gerado!');
}

function gerarModeloAjusteCSVEstoque() {
  const linhas = ['codigo,deltaQuantidade'];
  baixarCSVEstoque(linhas.join('\n'), `modelo-ajuste-${new Date().toISOString().slice(0,10)}.csv`);
  showToast('success', 'Modelo de ajuste CSV gerado!');
}

function abrirImportacaoCSVEstoque() {
  const input = document.getElementById('estoque-csv-input');
  if (input) { input.dataset.mode = 'import'; input.click(); }
}

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = false; }
      } else { cur += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(cur); cur = ''; }
      else { cur += ch; }
    }
  }
  result.push(cur);
  return result;
}

async function importarCSVEstoqueFromInput(evt) {
  const file = evt?.target?.files?.[0];
  if (!file) return;
  try {
    const content = await file.text();
    const linhas = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (linhas.length <= 1) { showToast('warning', 'CSV vazio ou sem dados.'); return; }
    const header = linhas[0].split(',').map(h => h.trim().toLowerCase());
    const required = ['nome','codigo','categoria','preco','quantidade','estoqueMin'.toLowerCase()];
    const okHeader = ['nome','codigo','categoria','preco','quantidade','estoqueMin'].every(h => header.includes(h));
    if (!okHeader) { showToast('error', 'Cabeçalho inválido. Use o modelo gerado.'); return; }

    const existentesSnap = await window.db.collection('produtos').get();
    const existentesCodigos = new Set();
    const existentesByCodigo = new Map();
    existentesSnap.forEach(d => { const p = d.data(); if (p.codigo) { existentesCodigos.add(p.codigo); existentesByCodigo.set(p.codigo, d.id); } });

    let adicionados = 0; let duplicados = 0; let erros = 0;
    const batch = window.db.batch ? window.db.batch() : null;
    for (let i = 1; i < linhas.length; i++) {
      try {
        const cols = parseCSVLine(linhas[i]);
        const map = new Map();
        header.forEach((h, idx) => map.set(h, cols[idx] ?? ''));
        let nome = (map.get('nome') || '').trim();
        let codigo = (map.get('codigo') || '').trim();
        let categoria = (map.get('categoria') || 'outros').trim().toLowerCase();
        let preco = Number(map.get('preco') || 0);
        let quantidade = Number(map.get('quantidade') || 0);
        let estoqueMin = Number(map.get('estoqueMin') || map.get('estoquemin') || 0);
        if (!nome) { nome = 'Produto ' + (codigo || (i+1)); }
        if (!categoria) categoria = 'outros';
        if (!codigo) { codigo = 'CSV-' + Date.now().toString(36) + '-' + Math.floor(Math.random()*1e6).toString(36); }
        if (existentesCodigos.has(codigo)) { duplicados++; continue; }
        const dados = {
          nome, codigo, categoria, preco, quantidade, estoqueMin,
          criadoEm: firebase.firestore.Timestamp.now(),
          atualizadoEm: firebase.firestore.Timestamp.now()
        };
        if (batch) {
          const ref = window.db.collection('produtos').doc();
          batch.set(ref, dados);
        } else {
          await window.db.collection('produtos').add(dados);
        }
        adicionados++;
      } catch (_) { erros++; }
    }
    if (batch) { await batch.commit(); }
    showToast('success', `Importação concluída: ${adicionados} adicionados, ${duplicados} duplicados, ${erros} com erro.`);
    carregarProdutosVenda();
  } catch (err) {
    console.error('Falha ao importar CSV', err);
    showToast('error', 'Erro ao importar CSV.');
  } finally {
    try { evt.target.value = ''; } catch (_) {}
  }
}

function abrirAtualizacaoCSVEstoque() {
  const input = document.getElementById('estoque-csv-input');
  if (input) { input.dataset.mode = 'update'; input.click(); }
}

function abrirAjusteCSVEstoque() {
  const input = document.getElementById('estoque-csv-input');
  if (input) { input.dataset.mode = 'adjust'; input.click(); }
}

async function atualizarCSVEstoqueFromInput(evt) {
  const file = evt?.target?.files?.[0];
  if (!file) return;
  try {
    const content = await file.text();
    const linhas = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (linhas.length <= 1) { showToast('warning', 'CSV vazio ou sem dados.'); return; }
    const header = linhas[0].split(',').map(h => h.trim().toLowerCase());
    const okHeader = ['nome','codigo','categoria','preco','quantidade','estoqueMin'].every(h => header.includes(h.toLowerCase()));
    if (!okHeader) { showToast('error', 'Cabeçalho inválido. Use o modelo gerado.'); return; }

    const existentesSnap = await window.db.collection('produtos').get();
    const idByCodigo = new Map();
    const prevByCodigo = new Map();
    existentesSnap.forEach(d => { const p = d.data(); if (p.codigo) idByCodigo.set(p.codigo, d.id); });
    existentesSnap.forEach(d => { const p = d.data(); if (p.codigo) prevByCodigo.set(p.codigo, { nome: p.nome || '', categoria: p.categoria || '', preco: Number(p.preco ?? ''), quantidade: Number(p.quantidade ?? ''), estoqueMin: Number(p.estoqueMin ?? '') }); });

    let atualizados = 0; let naoEncontrados = 0; let erros = 0; let semAlteracao = 0;
    const relatorio = [];
    const batch = window.db.batch ? window.db.batch() : null;
    for (let i = 1; i < linhas.length; i++) {
      try {
        const cols = parseCSVLine(linhas[i]);
        const map = new Map();
        header.forEach((h, idx) => map.set(h, cols[idx] ?? ''));
        let codigo = (map.get('codigo') || '').trim();
        if (!codigo) { naoEncontrados++; relatorio.push({ codigo: '(vazio)', status: 'codigo_vazio' }); continue; }
        const id = idByCodigo.get(codigo);
        if (!id) { naoEncontrados++; relatorio.push({ codigo, status: 'nao_encontrado' }); continue; }
        const updates = { atualizadoEm: firebase.firestore.Timestamp.now() };
        const prev = prevByCodigo.get(codigo) || { nome:'', categoria:'', preco:'', quantidade:'', estoqueMin:'' };
        const nome = (map.get('nome') || '').trim(); if (nome) updates.nome = nome;
        const categoria = (map.get('categoria') || '').trim(); if (categoria) updates.categoria = categoria.toLowerCase();
        const precoStr = (map.get('preco') || '').trim(); if (precoStr !== '') { const v = Number(precoStr); if (!Number.isNaN(v) && v >= 0) updates.preco = v; }
        const qtdStr = (map.get('quantidade') || '').trim(); if (qtdStr !== '') { const q = Number(qtdStr); if (!Number.isNaN(q) && q >= 0) updates.quantidade = q; }
        const minStr = (map.get('estoqueMin') || map.get('estoquemin') || '').trim(); if (minStr !== '') { const m = Number(minStr); if (!Number.isNaN(m) && m >= 0) updates.estoqueMin = m; }

        const changed = {
          nomeAnterior: prev.nome,
          nomeNovo: updates.nome !== undefined ? updates.nome : '',
          categoriaAnterior: prev.categoria,
          categoriaNova: updates.categoria !== undefined ? updates.categoria : '',
          precoAnterior: prev.preco,
          precoNovo: updates.preco !== undefined ? updates.preco : '',
          quantidadeAnterior: prev.quantidade,
          quantidadeNova: updates.quantidade !== undefined ? updates.quantidade : '',
          estoqueMinAnterior: prev.estoqueMin,
          estoqueMinNovo: updates.estoqueMin !== undefined ? updates.estoqueMin : ''
        };

        const houveAlteracao = Object.keys(updates).some(k => k !== 'atualizadoEm');
        if (!houveAlteracao) {
          semAlteracao++;
          relatorio.push({ codigo, status: 'sem_alteracao', ...changed });
          continue;
        }
        if (batch) {
          const ref = window.db.collection('produtos').doc(id);
          batch.update(ref, updates);
        } else {
          await window.db.collection('produtos').doc(id).update(updates);
        }
        atualizados++;
        relatorio.push({ codigo, status: 'atualizado', ...changed });
      } catch (_) { erros++; }
    }
    if (batch) { await batch.commit(); }
    showToast('success', `Atualização CSV: ${atualizados} atualizados, ${semAlteracao} sem alteração, ${naoEncontrados} não encontrados, ${erros} com erro.`);
    // Gerar relatório detalhado de atualização
    try {
      const headerRel = ['codigo','status','nomeAnterior','nomeNovo','categoriaAnterior','categoriaNova','precoAnterior','precoNovo','quantidadeAnterior','quantidadeNova','estoqueMinAnterior','estoqueMinNovo'];
      const linhasRel = [headerRel.join(',')];
      relatorio.forEach(r => {
        const linha = [
          escapeCSVEstoque(r.codigo ?? ''),
          escapeCSVEstoque(r.status ?? ''),
          escapeCSVEstoque(r.nomeAnterior ?? ''),
          escapeCSVEstoque(r.nomeNovo ?? ''),
          escapeCSVEstoque(r.categoriaAnterior ?? ''),
          escapeCSVEstoque(r.categoriaNova ?? ''),
          String(r.precoAnterior ?? ''),
          String(r.precoNovo ?? ''),
          String(r.quantidadeAnterior ?? ''),
          String(r.quantidadeNova ?? ''),
          String(r.estoqueMinAnterior ?? ''),
          String(r.estoqueMinNovo ?? '')
        ].join(',');
        linhasRel.push(linha);
      });
      const nome = `atualizar-relatorio-${new Date().toISOString().replace(/[:]/g,'-')}.csv`;
      baixarCSVEstoque(linhasRel.join('\n'), nome);
    } catch (e) { console.error('Falha ao gerar relatório de atualização', e); }
    carregarProdutosVenda();
  } catch (err) {
    console.error('Falha ao atualizar via CSV', err);
    showToast('error', 'Erro ao atualizar via CSV.');
  } finally {
    try { evt.target.value = ''; delete evt.target.dataset.mode; } catch (_) {}
  }
}

async function ajustarCSVEstoqueFromInput(evt) {
  const file = evt?.target?.files?.[0];
  if (!file) return;
  try {
    const content = await file.text();
    const linhas = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (linhas.length <= 1) { showToast('warning', 'CSV vazio ou sem dados.'); return; }
    const header = linhas[0].split(',').map(h => h.trim().toLowerCase());
    const okHeader = header.includes('codigo') && header.includes('deltaquantidade');
    if (!okHeader) { showToast('error', 'Cabeçalho inválido. Necessário: codigo,deltaQuantidade'); return; }

    const existentesSnap = await window.db.collection('produtos').get();
    const idByCodigo = new Map(); const qtdByCodigo = new Map(); const minByCodigo = new Map();
    existentesSnap.forEach(d => { const p = d.data(); if (p.codigo) { idByCodigo.set(p.codigo, d.id); qtdByCodigo.set(p.codigo, Number(p.quantidade || 0)); minByCodigo.set(p.codigo, Number(p.estoqueMin || 0)); } });

    let ajustados = 0; let naoEncontrados = 0; let erros = 0; let abaixoMinSkipped = 0; let abaixoMinApplied = 0;
    const relatorio = [];
    const batch = window.db.batch ? window.db.batch() : null;
    for (let i = 1; i < linhas.length; i++) {
      try {
        const cols = parseCSVLine(linhas[i]);
        const map = new Map(); header.forEach((h, idx) => map.set(h, cols[idx] ?? ''));
        const codigoRaw = (map.get('codigo') || '').trim();
        const deltaRaw = (map.get('deltaquantidade') || map.get('deltaQuantidade') || '').trim();
        let codigo = codigoRaw;
        if (!codigo) {
          naoEncontrados++;
          relatorio.push({ codigo: codigoRaw || '(vazio)', delta: deltaRaw, anterior: '', novo: '', min: '', status: 'codigo_vazio' });
          continue;
        }
        const id = idByCodigo.get(codigo);
        if (!id) {
          naoEncontrados++;
          relatorio.push({ codigo, delta: deltaRaw, anterior: '', novo: '', min: '', status: 'nao_encontrado' });
          continue;
        }
        let delta = Number(deltaRaw);
        if (Number.isNaN(delta) || delta === 0) { erros++; relatorio.push({ codigo, delta: deltaRaw, anterior: qtdByCodigo.get(codigo), novo: '', min: minByCodigo.get(codigo), status: 'delta_invalido' }); continue; }
        const anterior = (qtdByCodigo.get(codigo) || 0);
        let novo = anterior + delta; if (novo < 0) novo = 0;
        const min = minByCodigo.get(codigo) || 0;
        if (validarMinAjuste && novo < min) {
          if (!allowBelowMinCSV) { abaixoMinSkipped++; relatorio.push({ codigo, delta, anterior, novo, min, status: 'ignorado_baixo_minimo' }); continue; }
          abaixoMinApplied++;
          relatorio.push({ codigo, delta, anterior, novo, min, status: 'aplicado_baixo_minimo' });
        } else {
          relatorio.push({ codigo, delta, anterior, novo, min, status: 'aplicado' });
        }
        const updates = { quantidade: novo, atualizadoEm: firebase.firestore.Timestamp.now() };
        if (batch) { batch.update(window.db.collection('produtos').doc(id), updates); }
        else { await window.db.collection('produtos').doc(id).update(updates); }
        ajustados++;
      } catch (_) { erros++; }
    }
    if (batch) { await batch.commit(); }
    showToast('success', `Ajuste CSV: ${ajustados} ajustados, ${naoEncontrados} não encontrados, ${abaixoMinSkipped} abaixo do mínimo (ignorados), ${abaixoMinApplied} abaixo do mínimo (aplicados), ${erros} com erro.`);
    // Gerar relatório detalhado
    try {
      const headerRel = ['codigo','delta','quantidadeAnterior','quantidadeNova','estoqueMin','status'];
      const linhasRel = [headerRel.join(',')];
      relatorio.forEach(r => {
        const linha = [
          escapeCSVEstoque(r.codigo ?? ''),
          String(r.delta ?? ''),
          String(r.anterior ?? ''),
          String(r.novo ?? ''),
          String(r.min ?? ''),
          escapeCSVEstoque(r.status ?? '')
        ].join(',');
        linhasRel.push(linha);
      });
      const nome = `ajuste-relatorio-${new Date().toISOString().replace(/[:]/g,'-')}.csv`;
      baixarCSVEstoque(linhasRel.join('\n'), nome);
    } catch (e) { console.error('Falha ao gerar relatório de ajuste', e); }
    carregarProdutosVenda();
  } catch (err) {
    console.error('Falha ao ajustar via CSV', err);
    showToast('error', 'Erro ao ajustar via CSV.');
  } finally {
    try { evt.target.value = ''; delete evt.target.dataset.mode; } catch (_) {}
  }
}

function onCSVInputChange(evt) {
  const mode = evt?.target?.dataset?.mode || 'import';
  if (mode === 'update') return atualizarCSVEstoqueFromInput(evt);
  if (mode === 'adjust') return ajustarCSVEstoqueFromInput(evt);
  return importarCSVEstoqueFromInput(evt);
}

window.gerarModeloCSVEstoque = gerarModeloCSVEstoque;
window.gerarModeloAjusteCSVEstoque = gerarModeloAjusteCSVEstoque;
window.abrirImportacaoCSVEstoque = abrirImportacaoCSVEstoque;
window.abrirAtualizacaoCSVEstoque = abrirAtualizacaoCSVEstoque;
window.abrirAjusteCSVEstoque = abrirAjusteCSVEstoque;
window.atualizacaoRapidaPorCodigo = atualizacaoRapidaPorCodigo;
window.ajusteRapidoPorCodigo = ajusteRapidoPorCodigo;
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('estoque-csv-input');
  if (input) input.addEventListener('change', onCSVInputChange);
  initAjusteMinControls();
});