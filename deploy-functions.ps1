#!/usr/bin/env pwsh

# Script de Deploy da Cloud Function
# Execute no PowerShell como Administrador

Write-Host "🚀 Iniciando deploy da Cloud Function..." -ForegroundColor Green

# Verificar se está no diretório correto
if (-not (Test-Path "functions/package.json")) {
    Write-Host "❌ Erro: Não está na pasta do projeto!" -ForegroundColor Red
    Write-Host "Execute: cd e:\APP\mercearia-antonio" -ForegroundColor Yellow
    exit 1
}

# Verificar instalação do firebase
if (-not (firebase --version)) {
    Write-Host "❌ Firebase CLI não está instalado!" -ForegroundColor Red
    Write-Host "Execute: npm install -g firebase-tools@latest" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✅ Verificações OK" -ForegroundColor Green
Write-Host ""

# Fazer deploy
Write-Host "📤 Enviando Cloud Functions para Firebase..." -ForegroundColor Cyan
Write-Host ""

firebase deploy --only "functions" --project mercearia-antonio-62e60

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ DEPLOY CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Suas Cloud Functions estão online!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximos passos:" -ForegroundColor Yellow
    Write-Host "  1. Abra o app e faça LOGOUT"
    Write-Host "  2. Faça LOGIN novamente"
    Write-Host "  3. Você deve ver 'Usuários' e 'Configurações' no menu"
    Write-Host "  4. Crie um novo usuário para testar"
    Write-Host ""
    Write-Host "Dashboard: https://console.firebase.google.com/project/mercearia-antonio-62e60/functions" -ForegroundColor Blue
} else {
    Write-Host ""
    Write-Host "❌ ERRO NO DEPLOY" -ForegroundColor Red
    Write-Host "Verifique se você tem permissão no Firebase Console:" -ForegroundColor Yellow
    Write-Host "https://console.cloud.google.com/iam-admin/iam?project=mercearia-antonio-62e60" -ForegroundColor Blue
}

exit $LASTEXITCODE
