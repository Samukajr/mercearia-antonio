async function gerarRelatorioVendas() {
  const periodo = document.getElementById('periodo-vendas').value;
  const range = obterRangePeriodo(periodo);
  const snap = await window.db.collection('vendas')
    .where('data', '>=', range.inicio)
    .where('data', '<=', range.fim)
    .get();
  const total = snap.docs.reduce((s, d) => s + (d.data().total || 0), 0);
  const qtd = snap.size;
  document.getElementById('rel-total-vendas').textContent = formatCurrency(total);
  document.getElementById('rel-qtd-vendas').textContent = String(qtd);
  showToast('success', 'Relatório atualizado!');

  // Gerar PDF com jsPDF
  try {
    const { jsPDF } = window.jspdf || {};
    if (jsPDF) {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Mercearia do Antonio', 14, 20);
      doc.setFontSize(12);
      doc.text(`Relatório de Vendas - Período: ${periodo.toUpperCase()}`, 14, 30);
      doc.text(`Total de Vendas: ${formatCurrency(total)}`, 14, 40);
      doc.text(`Quantidade de Vendas: ${qtd}`, 14, 50);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 60);
      doc.save(`relatorio-vendas-${periodo}.pdf`);
      showToast('success', 'PDF gerado com sucesso!');
    }
  } catch (err) {
    console.error('Falha ao gerar PDF', err);
    showToast('error', 'Falha ao gerar PDF');
  }
}

function obterRangePeriodo(tipo) {
  const now = new Date();
  let inicio, fim;
  switch (tipo) {
    case 'hoje':
      inicio = new Date(); inicio.setHours(0,0,0,0);
      fim = new Date(); fim.setHours(23,59,59,999);
      break;
    case 'semana':
      const d = new Date(now); const day = d.getDay();
      inicio = new Date(d); inicio.setDate(d.getDate() - day + 1); inicio.setHours(0,0,0,0);
      fim = new Date(inicio); fim.setDate(inicio.getDate() + 6); fim.setHours(23,59,59,999);
      break;
    case 'mes':
      inicio = new Date(now.getFullYear(), now.getMonth(), 1);
      fim = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'ano':
      inicio = new Date(now.getFullYear(), 0, 1);
      fim = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    default:
      inicio = new Date(); inicio.setHours(0,0,0,0);
      fim = new Date(); fim.setHours(23,59,59,999);
  }
  return { inicio: firebase.firestore.Timestamp.fromDate(inicio), fim: firebase.firestore.Timestamp.fromDate(fim) };
}

async function carregarRankingProdutos() {
  const snap = await window.db.collection('vendas').get();
  const mapa = new Map();
  snap.forEach((d) => {
    const itens = d.data().itens || [];
    itens.forEach((i) => {
      const m = mapa.get(i.nome) || { qtd: 0, valor: 0 };
      m.qtd += i.qtd; m.valor += i.qtd * i.preco; mapa.set(i.nome, m);
    });
  });
  const arr = Array.from(mapa.entries()).map(([nome, m]) => ({ nome, ...m }));
  arr.sort((a, b) => b.valor - a.valor);
  const container = document.getElementById('produtos-mais-vendidos');
  container.innerHTML = '';
  if (arr.length === 0) {
    container.innerHTML = '<p class="empty-state">Nenhuma venda registrada</p>';
    return;
  }
  arr.slice(0, 20).forEach((p, idx) => {
    const row = document.createElement('div');
    row.className = 'ranking-item';
    row.innerHTML = `
      <div class="ranking-position">${idx + 1}</div>
      <div class="ranking-info">
        <div class="ranking-nome">${p.nome}</div>
        <div class="ranking-qtd">${p.qtd} unidades</div>
      </div>
      <div class="ranking-valor">${formatCurrency(p.valor)}</div>`;
    container.appendChild(row);
  });
}

// Expor globais
window.gerarRelatorioVendas = gerarRelatorioVendas;
window.carregarRankingProdutos = carregarRankingProdutos;
window.exportarProdutosCSV = exportarProdutosCSV;
window.exportarMovimentacoesCSV = exportarMovimentacoesCSV;

async function exportarProdutosCSV() {
  try {
    const snap = await window.db.collection('produtos').orderBy('nome').get();
    const linhas = ['nome,categoria,preco,quantidade,estoqueMin'];
    snap.forEach((d) => {
      const p = d.data();
      const linha = [
        escapeCSV(p.nome || ''),
        escapeCSV(p.categoria || ''),
        String(p.preco ?? 0),
        String(p.quantidade ?? 0),
        String(p.estoqueMin ?? 0)
      ].join(',');
      linhas.push(linha);
    });
    baixarCSV(linhas.join('\n'), `produtos-${new Date().toISOString().slice(0,10)}.csv`);
    showToast('success', 'CSV de produtos gerado!');
  } catch (err) {
    console.error(err);
    showToast('error', 'Falha ao exportar produtos');
  }
}

async function exportarMovimentacoesCSV() {
  try {
    const snap = await window.db.collection('movimentacoes').orderBy('data', 'desc').get();
    const linhas = ['data,tipo,descricao,valor'];
    snap.forEach((d) => {
      const m = d.data();
      const dataStr = m.data?.toDate ? m.data.toDate().toISOString() : '';
      const linha = [
        dataStr,
        escapeCSV(m.tipo || ''),
        escapeCSV(m.descricao || ''),
        String(m.valor ?? 0)
      ].join(',');
      linhas.push(linha);
    });
    baixarCSV(linhas.join('\n'), `movimentacoes-${new Date().toISOString().slice(0,10)}.csv`);
    showToast('success', 'CSV de movimentações gerado!');
  } catch (err) {
    console.error(err);
    showToast('error', 'Falha ao exportar movimentações');
  }
}

function baixarCSV(conteudo, nome) {
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

function escapeCSV(str) {
  const s = String(str ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}