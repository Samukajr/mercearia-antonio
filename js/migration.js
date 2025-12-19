// Rotina de migração para preencher userId em documentos antigos
// Compatível com Firebase compat v9 já utilizado no projeto

(function () {
  const db = firebase.firestore();

  async function getCurrentUserId() {
    try {
      if (window.getUserId) {
        return window.getUserId();
      }
      const user = firebase.auth().currentUser;
      return user ? user.uid : null;
    } catch (e) {
      return null;
    }
  }

  async function fetchDocsMissingUserId(collectionName) {
    const snap = await db.collection(collectionName).get();
    const missing = [];
    snap.forEach((doc) => {
      const data = doc.data() || {};
      if (!data.userId) {
        missing.push({ id: doc.id, ref: doc.ref, data });
      }
    });
    return missing;
  }

  async function chunkedBatchUpdate(docs, updateObject) {
    let updated = 0;
    for (let i = 0; i < docs.length; i += 400) {
      const chunk = docs.slice(i, i + 400);
      const batch = db.batch();
      chunk.forEach((d) => batch.update(d.ref, updateObject));
      await batch.commit();
      updated += chunk.length;
    }
    return updated;
  }

  async function backfillCollection(collectionName, userId) {
    const missing = await fetchDocsMissingUserId(collectionName);
    if (!missing.length) return { collection: collectionName, updated: 0, missing: 0 };
    try {
      const updated = await chunkedBatchUpdate(missing, { userId });
      return { collection: collectionName, updated, missing: missing.length };
    } catch (err) {
      return { collection: collectionName, updated: 0, missing: missing.length, error: err && err.message ? err.message : String(err) };
    }
  }

  async function runUserIdBackfill() {
    const uid = await getCurrentUserId();
    if (!uid) {
      alert('Você precisa estar logado para executar a migração.');
      return;
    }

    const ok = confirm(
      'Esta rotina irá atualizar documentos antigos sem userId, marcando-os como seus. Deseja continuar?'
    );
    if (!ok) return;

    const reportEl = document.getElementById('migration-report');
    if (reportEl) {
      reportEl.textContent = 'Executando migração...';
    }

    const results = [];
    // Coleções alvo: produtos e movimentacoes
    results.push(await backfillCollection('produtos', uid));
    results.push(await backfillCollection('movimentacoes', uid));

    // Vendas: regra atual pode restringir updates; reportamos apenas a contagem
    let vendasMissing = 0;
    try {
      const vendasSnap = await db.collection('vendas').get();
      vendasSnap.forEach((doc) => {
        const data = doc.data() || {};
        if (!data.userId) vendasMissing++;
      });
    } catch (e) {
      // ignorar erros de leitura por segurança
    }

    const summaryLines = results.map((r) => {
      const base = `Coleção ${r.collection}: ${r.updated} atualizados de ${r.missing} sem userId`;
      return r.error ? `${base} (erro: ${r.error})` : base;
    });
    summaryLines.push(
      `Coleção vendas: ${vendasMissing} detectados sem userId (atualização bloqueada pelas regras, somente relatório)`
    );

    const finalMsg = summaryLines.join('\n');
    if (reportEl) {
      reportEl.textContent = finalMsg;
    } else {
      alert(finalMsg);
    }

    try {
      if (window.registerAuditLog) {
        await window.registerAuditLog('migration_userId', {
          results,
          vendasMissing,
        });
      }
    } catch (e) {
      // auditoria não deve impedir a migração; silencioso
    }
  }

  // Expor global
  window.runUserIdBackfill = runUserIdBackfill;
})();
