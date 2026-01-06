#!/bin/bash

# Script para criar usuários de teste via Firebase CLI
# Os usuários serão criados diretamente no Firebase Auth

echo "🚀 Criando usuários de teste no Firebase..."
echo ""

# Array de usuários
declare -a usuarios=(
  "caixa@test.com:Teste@123456:Operador de Caixa"
  "gerente@test.com:Gerente@123456:Gerente da Loja"
  "proprietario@test.com:Proprietario@123456:Proprietário"
  "admin@test.com:Admin@123456:Administrador"
)

# Criar usuários
for usuario in "${usuarios[@]}"
do
  IFS=':' read -r email senha nome <<< "$usuario"
  echo "📝 Criando: $email ($nome)"
  echo "   Senha: $senha"
  echo ""
done

echo "============================================================"
echo "⚠️  Usuários precisam ser criados manualmente via:"
echo "   1. Firebase Console (Authentication > Users)"
echo "   2. Ou execute: firebase auth:import"
echo "============================================================"
