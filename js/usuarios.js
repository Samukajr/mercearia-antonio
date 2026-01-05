// ===========================
// Gestão de Usuários
// Criar, editar, deletar usuários e atribuir roles
// ===========================

async function listarUsuarios() {
  try {
    const snap = await window.db.collection('usuarios').where('userId', '==', getUserId()).get();
    const usuarios = [];
    snap.forEach(doc => {
      usuarios.push({ id: doc.id, ...doc.data() });
    });
    return usuarios;
  } catch (err) {
    console.error('Erro ao listar usuários', err);
    return [];
  }
}

async function criarUsuario(email, senha, nome, role) {
  try {
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

    // Criar usuário no Firebase Auth via Admin SDK (via Callable Function)
    // Por enquanto, criamos um documento no Firestore com status pending
    const userData = {
      userId: getUserId(), // proprietário que criou
      email: email.toLowerCase(),
      nome: nome.trim(),
      role: role,
      status: 'pendente', // Aguardando aceitação de convite
      criadoEm: firebase.firestore.Timestamp.now(),
      criadoPor: window.auth.currentUser.email,
      atualizadoEm: firebase.firestore.Timestamp.now()
    };

    const docRef = await window.db.collection('usuarios').add(userData);
    
    // Registrar auditoria
    await registrarAuditoria('criar_usuario', 'usuarios', { email, role, docId: docRef.id });
    
    showToast('success', `Usuário ${email} criado com role ${role}. Aguardando aceitação.`);
    return true;
  } catch (err) {
    console.error('Erro ao criar usuário', err);
    showToast('error', 'Erro ao criar usuário.');
    return false;
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

    if (!confirm('Tem certeza que deseja deletar este usuário? Todos os seus dados serão marcados como deletados.')) {
      return false;
    }

    // Soft delete: marcar como deletado em vez de remover
    await window.db.collection('usuarios').doc(usuarioId).update({
      deletado: true,
      deletadoEm: firebase.firestore.Timestamp.now(),
      deletadoPor: window.auth.currentUser.email
    });

    await registrarAuditoria('deletar_usuario', 'usuarios', { usuarioId });
    
    showToast('success', 'Usuário deletado com sucesso!');
    return true;
  } catch (err) {
    console.error('Erro ao deletar usuário', err);
    showToast('error', 'Erro ao deletar usuário.');
    return false;
  }
}

// Renderizar tabela de usuários
async function renderizarTabelaUsuarios() {
  const tbody = document.getElementById('tbody-usuarios');
  if (!tbody) return;

  try {
    const usuarios = await listarUsuarios();
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
    await deletarUsuario(usuarioId);
    await renderizarTabelaUsuarios();
  }
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

      if (!email || !nome || !role) {
        showToast('error', 'Preencha todos os campos.');
        return;
      }

      if (usuarioId) {
        // Editar
        await atualizarUsuario(usuarioId, { nome, role });
      } else {
        // Criar
        await criarUsuario(email, '', nome, role);
      }

      closeModal('modal-usuario');
      await renderizarTabelaUsuarios();
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
