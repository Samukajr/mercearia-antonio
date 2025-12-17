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
    categoria: document.getElementById('produto-categoria').value,
    preco: Number(document.getElementById('produto-preco').value),
    quantidade: Number(document.getElementById('produto-quantidade').value),
    estoqueMin: Number(document.getElementById('produto-estoque-min').value),
    atualizadoEm: firebase.firestore.Timestamp.now()
  };
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