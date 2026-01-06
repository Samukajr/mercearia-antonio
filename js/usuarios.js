// ===========================
// Gestão de Usuários
// Criar, editar, deletar usuários e atribuir roles
// ===========================

// Gerar senha temporária aleatória
function gerarSenhaTemporaria(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let senha = '';
  for (let i = 0; i < length; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return senha;
}

async function listarUsuarios() {
  try {
    // Proprietários veem todos os usuários
    // Não proprietários veem apenas a si mesmos
    const role = window.currentRole || 'viewer';
    let query = window.db.collection('usuarios');

    if (role !== 'proprietario') {
      // Usuários não-proprietários: apenas seus próprios dados
      query = query.where('userId', '==', getUserId());
    }
    // Se proprietário: sem filtro = todos

    const snap = await query.get({ source: 'server' }); // força servidor para não usar cache

    const usuarios = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }));

    console.log('📋 Usuários carregados:', usuarios.length, 'Role:', role);
    return usuarios;
  } catch (err) {
    console.error('Erro ao listar usuários', err);
    return [];
  }
}

async function criarUsuario(email, senha, nome, role) {
  try {
    console.log('🔍 criarUsuario - Recebido:', { email, senha: '***', nome, role });

    // Validar permissão
    if (!await hasPermission('criar_usuario')) {
      showToast('error', 'Você não tem permissão para criar usuários.');
      return false;
    }

    // Validar role
    if (!rolePermissions[role]) {
      showToast('error', 'Role inválido.');
      return false;
    }

    // Validar campos obrigatórios - email e nome são obrigatórios
    // senha é opcional se usando Cloud Function (será gerada automática)
    if (!email || !nome) {
      console.error('❌ Campos obrigatórios faltando:', { email: !!email, nome: !!nome });
      showToast('error', 'Email e nome são obrigatórios.');
      return false;
    }

    // Tentar criar via Cloud Function (se disponível)
    // Caso contrário, criar apenas no Firestore
    const email_lower = email.toLowerCase();
    let criadoComCloudFunction = false;
    let novoUsuarioId = null;

    try {
      // Se temos senha, usar Cloud Function
      if (senha && senha.trim()) {
        console.log('📞 Tentando criar via Cloud Function com senha...');
        const createUserFn = firebase.functions().httpsCallable('createUserWithRole');
        const resultado = await createUserFn({
          email: email_lower,
          password: senha,
          name: nome.trim(),
          role: role
        });

        if (resultado.data && resultado.data.success) {
          novoUsuarioId = resultado.data.uid;
          criadoComCloudFunction = true;
          console.log('✅ Criado via Cloud Function, UID:', novoUsuarioId);
          showToast('success', `Usuário ${email_lower} criado com sucesso no Firebase Auth!`);
        }
      } else {
        console.log('📝 Sem senha - criando apenas no Firestore (pendente)');
      }
    } catch (fnErr) {
      // Erro 409 = email já existe no Firebase Auth
      if (fnErr.code === 'functions/already-exists' || fnErr.message?.includes('already-exists') || fnErr.message?.includes('409')) {
        console.error('❌ Email já cadastrado no Firebase Auth:', email_lower);
        showToast('error', `Email ${email_lower} já cadastrado no Firebase Auth. Use outro email ou faça login com este.`);
        return false;
      }
      
      // Cloud Function não disponível ainda (normal antes do deploy)
      console.warn('⚠️ Cloud Function não está disponível. Criando apenas no Firestore.', fnErr.message);
      
      // Criar usuário apenas no Firestore com status "pendente"
      // O usuário será criado no Firebase Auth via Admin Dashboard ou depois
    }

    // Criar documento no Firestore
    const userData = {
      userId: getUserId(), // proprietário que criou
      email: email_lower,
      nome: nome.trim(),
      role: role,
      status: criadoComCloudFunction ? 'ativo' : 'pendente',
      deletado: false,
      criadoEm: firebase.firestore.Timestamp.now(),
      criadoPor: window.auth.currentUser.email,
      atualizadoEm: firebase.firestore.Timestamp.now()
    };

    // Se foi criado via Cloud Function, usar UID do Auth
    let docRef;
    if (novoUsuarioId) {
      await window.db.collection('usuarios').doc(novoUsuarioId).set(userData);
      docRef = { id: novoUsuarioId };
      console.log('✅ Documento criado no Firestore com UID:', novoUsuarioId);
    } else {
      docRef = await window.db.collection('usuarios').add(userData);
      console.log('✅ Documento criado no Firestore:', docRef.id);
    }
    
    // Registrar auditoria
    await registrarAuditoria('criar_usuario', 'usuarios', { 
      email: email_lower, 
      role, 
      docId: docRef.id,
      viaPCP: criadoComCloudFunction ? 'CloudFunction' : 'Firestore'
    });
    
    const msg = criadoComCloudFunction 
      ? `Usuário ${email_lower} criado com role ${role}.`
      : `Usuário ${email_lower} criado (pendente). Defina uma senha para ativar.`;
    
    console.log('📢 Sucesso:', msg);
    showToast('success', msg);
    return { sucesso: true, status: criadoComCloudFunction ? 'ativo' : 'pendente' };
  } catch (err) {
    console.error('❌ Erro ao criar usuário', err);
    showToast('error', `Erro ao criar usuário: ${err.message}`);
    return false;
  }
}

// Criar usuários de teste rapidamente (apenas proprietario)
async function criarUsuariosTeste() {
  try {
    const user = window.auth.currentUser;
    if (!user) {
      showToast('error', 'Faça login primeiro.');
      return;
    }

    // Garantir que é proprietario
    const token = await user.getIdTokenResult(true);
    const role = token?.claims?.role || window.currentRole;
    if (role !== 'proprietario') {
      showToast('error', 'Apenas o proprietário pode criar usuários de teste.');
      return;
    }

    const lista = [
      { email: 'caixa@test.com', senha: 'Caixa@123456', nome: 'Operador de Caixa', role: 'operador_caixa' },
      { email: 'gerente@test.com', senha: 'Gerente@123456', nome: 'Gerente da Loja', role: 'gerente' },
      { email: 'proprietario@test.com', senha: 'Proprietario@123456', nome: 'Proprietário', role: 'proprietario' },
      { email: 'admin@test.com', senha: 'Admin@123456', nome: 'Administrador', role: 'proprietario' }
    ];

    const createUserWithRole = firebase.functions().httpsCallable('createUserWithRole');

    for (const u of lista) {
      try {
        await createUserWithRole({ email: u.email, password: u.senha, nome: u.nome, role: u.role });
        showToast('success', `Usuário criado: ${u.email} (${u.role})`);
      } catch (e) {
        if ((e?.message || '').includes('already') || e?.code === 'already-exists' || (e?.details && e.details.code === 409)) {
          showToast('info', `Usuário já existe: ${u.email}`);
        } else {
          console.error('Erro ao criar usuário de teste', u.email, e);
          showToast('error', `Falha ao criar ${u.email}: ${e.message || e}`);
        }
      }
      await new Promise(r => setTimeout(r, 300));
    }

    await renderizarTabelaUsuarios();
  } catch (err) {
    console.error('Erro no seed de usuários de teste', err);
    showToast('error', 'Erro ao criar usuários de teste. Veja o console.');
  }
}

async function atualizarUsuario(usuarioId, dados) {
  try {
    if (!await hasPermission('editar_usuario')) {
      showToast('error', 'Você não tem permissão para editar usuários.');
      return false;
    }

    // Se alterar role, validar nova role
    if (dados.role && !rolePermissions[dados.role]) {
      showToast('error', 'Role inválido.');
      return false;
    }

    dados.atualizadoEm = firebase.firestore.Timestamp.now();
    
    await window.db.collection('usuarios').doc(usuarioId).update(dados);
    
    await registrarAuditoria('editar_usuario', 'usuarios', { usuarioId, dados });
    
    showToast('success', 'Usuário atualizado com sucesso!');
    return true;
  } catch (err) {
    console.error('Erro ao atualizar usuário', err);
    showToast('error', 'Erro ao atualizar usuário.');
    return false;
  }
}

async function deletarUsuario(usuarioId) {
  try {
    if (!await hasPermission('deletar_usuario')) {
      showToast('error', 'Você não tem permissão para deletar usuários.');
      return false;
    }

    // Checar role atual no token
    try {
      const user = window.auth.currentUser;
      const token = user ? await user.getIdTokenResult() : null;
      console.log('🛂 Role atual no token:', token?.claims?.role);
      if (!token?.claims?.role || token.claims.role !== 'proprietario') {
        showToast('error', 'Seu login não tem role proprietario; refaça o login.');
        return false;
      }
    } catch (e) {
      console.warn('⚠️ Não foi possível ler claims do token', e);
    }

    if (!confirm('Tem certeza que deseja deletar este usuário? Este registro será removido.')) {
      return false;
    }

    console.log('🗑️ Deletando usuário:', usuarioId);

    // Delete definitivo
    await window.db.collection('usuarios').doc(usuarioId).delete();
    console.log('✅ Documento removido do Firestore');

    await registrarAuditoria('deletar_usuario', 'usuarios', { usuarioId });
    
    showToast('success', 'Usuário deletado com sucesso!');
    
    // Atualizar a tabela imediatamente
    await renderizarTabelaUsuarios();
    
    return true;
  } catch (err) {
    console.error('❌ Erro ao deletar usuário', err);
    const code = err?.code || 'desconhecido';
    if (code === 'permission-denied') {
      showToast('error', 'Sem permissão para deletar este usuário.');
    } else {
      showToast('error', `Erro ao deletar usuário: ${code}`);
    }
    return false;
  }
}

// Renderizar tabela de usuários
async function renderizarTabelaUsuarios() {
  const tbody = document.getElementById('tbody-usuarios');
  if (!tbody) return;

  try {
    // Garantir que não exibimos deletados mesmo se vierem do fallback (mantido para segurança)
    const usuarios = (await listarUsuarios()).filter(u => u.deletado !== true && u.status !== 'deletado');
    console.log('📋 Usuários carregados:', usuarios.length);
    tbody.innerHTML = '';

    if (usuarios.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Nenhum usuário cadastrado</td></tr>';
      return;
    }

    usuarios.forEach(u => {
      const tr = document.createElement('tr');
      const statusBadge = u.status === 'ativo' 
        ? '<span class="badge badge-success">Ativo</span>'
        : u.status === 'pendente'
        ? '<span class="badge badge-warning">Pendente</span>'
        : '<span class="badge badge-danger">Deletado</span>';
      
      tr.innerHTML = `
        <td>${u.email}</td>
        <td>${u.nome}</td>
        <td><span class="badge badge-info">${u.role}</span></td>
        <td>${u.status}</td>
        <td>${u.criadoEm?.toDate?.() ? new Date(u.criadoEm.toDate()).toLocaleDateString('pt-BR') : '-'}</td>
        <td class="action-buttons">
          <button class="btn-icon-table edit" title="Editar" onclick="editarUsuarioModal('${u.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn-icon-table delete" title="Deletar" onclick="deletarUsuarioModal('${u.id}')"><i class="fas fa-trash"></i></button>
        </td>`;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Erro ao renderizar usuários', err);
  }
}

// Modal para novo usuário
function mostrarModalNovoUsuario() {
  document.getElementById('usuario-id').value = '';
  document.getElementById('usuario-email').value = '';
  document.getElementById('usuario-nome').value = '';
  document.getElementById('usuario-role').value = 'operador_caixa';
  document.getElementById('modal-usuario-title').textContent = 'Novo Usuário';
  document.getElementById('modal-usuario').classList.add('active');
}

// Modal para editar usuário
async function editarUsuarioModal(usuarioId) {
  try {
    const doc = await window.db.collection('usuarios').doc(usuarioId).get();
    if (!doc.exists) {
      showToast('error', 'Usuário não encontrado.');
      return;
    }

    const u = doc.data();
    document.getElementById('usuario-id').value = usuarioId;
    document.getElementById('usuario-email').value = u.email || '';
    document.getElementById('usuario-nome').value = u.nome || '';
    document.getElementById('usuario-role').value = u.role || 'viewer';
    document.getElementById('modal-usuario-title').textContent = 'Editar Usuário';
    document.getElementById('modal-usuario').classList.add('active');
  } catch (err) {
    console.error('Erro ao carregar usuário', err);
    showToast('error', 'Erro ao carregar usuário.');
  }
}

// Deletar com confirmação
async function deletarUsuarioModal(usuarioId) {
  const doc = await window.db.collection('usuarios').doc(usuarioId).get();
  const u = doc.data();
  
  if (confirm(`Tem certeza que deseja deletar ${u.email}?`)) {
    const resultado = await deletarUsuario(usuarioId);
    if (resultado) {
      console.log('✅ Usuário deletado, recarregando lista...');
      await new Promise(r => setTimeout(r, 500));  // Aguardar um pouco
      await renderizarTabelaUsuarios();

      // Remover linha da tabela caso ainda esteja visível (fallback UI)
      const row = document.querySelector(`button[onclick="deletarUsuarioModal('${usuarioId}')"]`)?.closest('tr');
      if (row) row.remove();
    }
  }
}

// Mostrar modal com senha temporária para cópia
function mostrarModalSenhaTemporaria(email, senha, status) {
  // Criar modal dinamicamente
  const modalHTML = `
    <div id="modal-senha-temp" class="modal active">
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h3><i class="fas fa-key"></i> Senha Temporária - ${status === 'ativo' ? 'Usuário Criado' : 'Usuário Pendente'}</h3>
          <button class="modal-close" onclick="document.getElementById('modal-senha-temp').remove()">&times;</button>
        </div>
        <div class="modal-body" style="padding: 2rem;">
          <p style="margin-bottom: 1rem;">
            <strong>Email:</strong> ${email}
          </p>
          <div style="background: #f0f4f8; padding: 1rem; border-radius: 8px; border-left: 4px solid #8bafd9; margin-bottom: 1rem;">
            <p style="margin: 0 0 0.5rem 0; font-size: 0.9rem; color: #666;">Senha Temporária:</p>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <code style="flex: 1; background: white; padding: 0.75rem; border-radius: 6px; font-size: 1.1rem; font-weight: 600; color: #2c3e50; word-break: break-all;" id="senha-temp-display">${senha}</code>
              <button class="btn btn-primary" onclick="copiarSenhaParaPapeleta('${senha}')" style="white-space: nowrap;">
                <i class="fas fa-copy"></i> Copiar
              </button>
            </div>
          </div>
          <p style="background: #fff3cd; padding: 1rem; border-radius: 8px; border-left: 4px solid #f39c12; margin-bottom: 1rem; font-size: 0.95rem;">
            <strong><i class="fas fa-exclamation-triangle"></i> Importante:</strong> Esta é a única vez que a senha será exibida. 
            Compartilhe com o usuário ou anote em local seguro.
          </p>
          <p style="color: #666; font-size: 0.9rem; margin-bottom: 0;">
            O usuário deve fazer login com seu email e esta senha no primeiro acesso.
            Poderá alterar a senha no menu "Minha Conta" após entrar no sistema.
          </p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" onclick="document.getElementById('modal-senha-temp').remove(); showToast('success', 'Usuário criado! Senha anotada.');">
            <i class="fas fa-check"></i> Entendi, Fechar
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Focar no campo de senha para cópia fácil
  setTimeout(() => {
    const display = document.getElementById('senha-temp-display');
    if (display) {
      // Selecionar texto do code element
      const range = document.createRange();
      range.selectNodeContents(display);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, 100);
}

// Copiar senha para papeleta/clipboard
function copiarSenhaParaPapeleta(senha) {
  navigator.clipboard.writeText(senha).then(() => {
    showToast('success', '✅ Senha copiada para a área de transferência!');
  }).catch(err => {
    console.error('Erro ao copiar:', err);
    showToast('error', 'Erro ao copiar. Copie manualmente.');
  });
}

// Salvar usuário (criar ou atualizar)
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-usuario');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const usuarioId = document.getElementById('usuario-id').value;
      const email = document.getElementById('usuario-email').value.trim();
      const nome = document.getElementById('usuario-nome').value.trim();
      const role = document.getElementById('usuario-role').value;

      console.log('📋 Form Submit - Debug:', {
        usuarioId,
        email,
        nome,
        role,
        roleElement: document.getElementById('usuario-role'),
        roleValue: document.getElementById('usuario-role')?.value,
        isEmpty: {
          email: !email,
          nome: !nome,
          role: !role
        }
      });

      if (!email || !nome || !role) {
        console.error('❌ Validação falhou:', { email: !!email, nome: !!nome, role: !!role });
        showToast('error', 'Email, nome e papel são obrigatórios.');
        return;
      }

      try {
        if (usuarioId) {
          // Editar
          console.log('✏️ Atualizando usuário:', usuarioId);
          await atualizarUsuario(usuarioId, { nome, role });
        } else {
          // Criar - gerar senha temporária automaticamente
          const senhaTemporaria = gerarSenhaTemporaria();
          console.log('➕ Criando novo usuário:', email, 'com senha temporária');
          const resultado = await criarUsuario(email, senhaTemporaria, nome, role);
          
          // Se sucesso, mostrar modal com senha temporária
          if (resultado && resultado.sucesso) {
            mostrarModalSenhaTemporaria(email, senhaTemporaria, resultado.status);
          }
        }

        closeModal('modal-usuario');
        await renderizarTabelaUsuarios();
      } catch (err) {
        console.error('❌ Erro ao salvar usuário:', err);
      }
    });
  }
});

// Expor globalmente
window.listarUsuarios = listarUsuarios;
window.criarUsuario = criarUsuario;
window.atualizarUsuario = atualizarUsuario;
window.deletarUsuario = deletarUsuario;
window.renderizarTabelaUsuarios = renderizarTabelaUsuarios;
window.mostrarModalNovoUsuario = mostrarModalNovoUsuario;
window.editarUsuarioModal = editarUsuarioModal;
window.deletarUsuarioModal = deletarUsuarioModal;
window.gerarSenhaTemporaria = gerarSenhaTemporaria;
window.mostrarModalSenhaTemporaria = mostrarModalSenhaTemporaria;
window.copiarSenhaParaPapeleta = copiarSenhaParaPapeleta;
window.criarUsuariosTeste = criarUsuariosTeste;
