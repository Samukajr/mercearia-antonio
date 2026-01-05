// ===========================
// RBAC - Role-Based Access Control
// Roles: proprietario, gerente, operador_caixa, operador_estoque, viewer
// ===========================

// Definição de permissões por role
const rolePermissions = {
  proprietario: {
    // Usuários
    criar_usuario: true,
    editar_usuario: true,
    deletar_usuario: true,
    listar_usuarios: true,
    
    // Produtos
    criar_produto: true,
    editar_produto: true,
    deletar_produto: true,
    listar_produtos: true,
    
    // Vendas
    criar_venda: true,
    cancelar_venda: true,
    listar_vendas: true,
    
    // Caixa
    abrir_caixa: true,
    fechar_caixa: true,
    registrar_movimentacao: true,
    listar_movimentacoes: true,
    deletar_movimentacao: true,
    
    // Relatórios
    acessar_relatorios: true,
    acessar_relatorio_financeiro: true,
    exportar_dados: true,
    fazer_backup: true,
    restaurar_backup: true,
    
    // Configurações
    acessar_configuracoes: true,
    editar_loja: true
  },
  
  gerente: {
    criar_usuario: false,
    editar_usuario: false,
    deletar_usuario: false,
    listar_usuarios: true,
    
    criar_produto: true,
    editar_produto: true,
    deletar_produto: true,
    listar_produtos: true,
    
    criar_venda: true,
    cancelar_venda: true,
    listar_vendas: true,
    
    abrir_caixa: true,
    fechar_caixa: true,
    registrar_movimentacao: true,
    listar_movimentacoes: true,
    deletar_movimentacao: true,
    
    acessar_relatorios: true,
    acessar_relatorio_financeiro: true,
    exportar_dados: true,
    fazer_backup: false,
    restaurar_backup: false,
    
    acessar_configuracoes: false,
    editar_loja: false
  },
  
  operador_caixa: {
    criar_usuario: false,
    editar_usuario: false,
    deletar_usuario: false,
    listar_usuarios: false,
    
    criar_produto: false,
    editar_produto: false,
    deletar_produto: false,
    listar_produtos: true,
    
    criar_venda: true,
    cancelar_venda: true,
    listar_vendas: true,
    
    abrir_caixa: true,
    fechar_caixa: true,
    registrar_movimentacao: true,
    listar_movimentacoes: true,
    deletar_movimentacao: false,
    
    acessar_relatorios: false,
    acessar_relatorio_financeiro: false,
    exportar_dados: false,
    fazer_backup: false,
    restaurar_backup: false,
    
    acessar_configuracoes: false,
    editar_loja: false
  },
  
  operador_estoque: {
    criar_usuario: false,
    editar_usuario: false,
    deletar_usuario: false,
    listar_usuarios: false,
    
    criar_produto: true,
    editar_produto: true,
    deletar_produto: false,
    listar_produtos: true,
    
    criar_venda: false,
    cancelar_venda: false,
    listar_vendas: true,
    
    abrir_caixa: false,
    fechar_caixa: false,
    registrar_movimentacao: false,
    listar_movimentacoes: true,
    deletar_movimentacao: false,
    
    acessar_relatorios: false,
    acessar_relatorio_financeiro: false,
    exportar_dados: false,
    fazer_backup: false,
    restaurar_backup: false,
    
    acessar_configuracoes: false,
    editar_loja: false
  },
  
  viewer: {
    criar_usuario: false,
    editar_usuario: false,
    deletar_usuario: false,
    listar_usuarios: false,
    
    criar_produto: false,
    editar_produto: false,
    deletar_produto: false,
    listar_produtos: true,
    
    criar_venda: false,
    cancelar_venda: false,
    listar_vendas: true,
    
    abrir_caixa: false,
    fechar_caixa: false,
    registrar_movimentacao: false,
    listar_movimentacoes: true,
    deletar_movimentacao: false,
    
    acessar_relatorios: true,
    acessar_relatorio_financeiro: false,
    exportar_dados: false,
    fazer_backup: false,
    restaurar_backup: false,
    
    acessar_configuracoes: false,
    editar_loja: false
  }
};

// Obter role do usuário autenticado
async function getUserRole() {
  const user = window.auth.currentUser;
  if (!user) return null;
  
  try {
    const idTokenResult = await user.getIdTokenResult();
    return idTokenResult.claims.role || 'viewer';
  } catch (err) {
    console.error('Erro ao obter role do usuário', err);
    return 'viewer';
  }
}

// Verificar se usuário tem permissão
async function hasPermission(permissionName) {
  const role = await getUserRole();
  if (!role) return false;
  
  const permissions = rolePermissions[role] || {};
  return permissions[permissionName] === true;
}

// Verificar múltiplas permissões (AND)
async function hasAllPermissions(permissionNames) {
  const role = await getUserRole();
  if (!role) return false;
  
  const permissions = rolePermissions[role] || {};
  return permissionNames.every(p => permissions[p] === true);
}

// Verificar múltiplas permissões (OR)
async function hasAnyPermission(permissionNames) {
  const role = await getUserRole();
  if (!role) return false;
  
  const permissions = rolePermissions[role] || {};
  return permissionNames.some(p => permissions[p] === true);
}

// Proteger função com verificação de permissão
async function protectAction(permissionName, actionFn) {
  if (!await hasPermission(permissionName)) {
    showToast('error', 'Você não tem permissão para esta ação.');
    return null;
  }
  return await actionFn();
}

// Mostrar/Ocultar elementos conforme permissão
async function applyPermissionVisibility() {
  const role = await getUserRole();
  
  // Elementos com data-permission-required
  document.querySelectorAll('[data-permission-required]').forEach(el => {
    const requiredPerms = el.getAttribute('data-permission-required').split(',');
    const permissions = rolePermissions[role] || {};
    const hasAccess = requiredPerms.some(p => permissions[p.trim()] === true);
    el.style.display = hasAccess ? '' : 'none';
  });
  
  // Elementos com data-role-required
  document.querySelectorAll('[data-role-required]').forEach(el => {
    const requiredRoles = el.getAttribute('data-role-required').split(',');
    const hasRole = requiredRoles.includes(role);
    el.style.display = hasRole ? '' : 'none';
  });
  
  // Desabilitar botões sem permissão
  document.querySelectorAll('[data-permission-disable]').forEach(el => {
    const perm = el.getAttribute('data-permission-disable');
    const permissions = rolePermissions[role] || {};
    if (permissions[perm.trim()] !== true) {
      el.disabled = true;
      el.title = 'Sem permissão para esta ação';
    }
  });
}

// Expor globalmente
window.getUserRole = getUserRole;
window.hasPermission = hasPermission;
window.hasAllPermissions = hasAllPermissions;
window.hasAnyPermission = hasAnyPermission;
window.protectAction = protectAction;
window.applyPermissionVisibility = applyPermissionVisibility;
window.rolePermissions = rolePermissions;
