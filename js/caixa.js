function carregarMovimentacoes() {
  window.db.collection('movimentacoes')
    .orderBy('data', 'desc')
    .limit(100)
    .onSnapshot((snap) => {
      const tbody = document.getElementById('tbody-movimentacoes');
      tbody.innerHTML = '';
      if (snap.empty) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhuma movimentação registrada</td></tr>';
        return;
      }
      snap.forEach((doc) => {
        const m = doc.data();
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${new Date(m.data.toDate()).toLocaleString('pt-BR')}</td>
          <td>${m.tipo}</td>
          <td>${m.descricao}</td>
          <td>${formatCurrency(m.valor)}</td>
          <td>
            <button class="btn-icon-table delete" title="Excluir" onclick="excluirMov('${doc.id}')"><i class="fas fa-trash"></i></button>
          </td>`;
        tbody.appendChild(tr);
      });
    });
}

async function atualizarSaldoCaixa() {
  const entradas = await window.db.collection('movimentacoes').where('tipo', '==', 'entrada').get();
  const saidas = await window.db.collection('movimentacoes').where('tipo', '==', 'saida').get();
  const soma = (snap) => snap.docs.reduce((s, d) => s + (d.data().valor || 0), 0);
  const saldo = soma(entradas) - soma(saidas);
  document.getElementById('saldo-atual').textContent = formatCurrency(saldo);
}

function showModalMovimentacao(tipo) {
  document.getElementById('movimentacao-tipo').value = tipo;
  document.getElementById('modal-movimentacao-title').textContent = tipo === 'entrada' ? 'Nova Entrada' : 'Nova Saída';
  document.getElementById('movimentacao-descricao').value = '';
  document.getElementById('movimentacao-valor').value = '';
  document.getElementById('modal-movimentacao').classList.add('active');
}

document.getElementById('form-movimentacao').addEventListener('submit', async (e) => {
  e.preventDefault();
  const tipo = document.getElementById('movimentacao-tipo').value;
  const descricao = document.getElementById('movimentacao-descricao').value.trim();
  const valor = Number(document.getElementById('movimentacao-valor').value);
  try {
    await window.db.collection('movimentacoes').add({ tipo, descricao, valor, data: firebase.firestore.Timestamp.now() });
    closeModal('modal-movimentacao');
    showToast('success', 'Movimentação registrada!');
    atualizarSaldoCaixa();
  } catch (err) {
    console.error(err);
    showToast('error', 'Erro ao registrar movimentação');
  }
});

async function excluirMov(id) {
  if (!confirm('Excluir esta movimentação?')) return;
  try {
    await window.db.collection('movimentacoes').doc(id).delete();
    showToast('success', 'Movimentação excluída!');
    atualizarSaldoCaixa();
  } catch (err) {
    console.error(err);
    showToast('error', 'Erro ao excluir movimentação');
  }
}

// Expor globais
window.carregarMovimentacoes = carregarMovimentacoes;
window.showModalMovimentacao = showModalMovimentacao;
window.excluirMov = excluirMov;
window.atualizarSaldoCaixa = atualizarSaldoCaixa;