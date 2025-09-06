# Script de Instalação Automatizada - Sistema ERP-BR
# PowerShell Script para Windows

Write-Host "🚀 Iniciando instalação do Sistema ERP-BR..." -ForegroundColor Green
Write-Host ""

# Verificar se Node.js está instalado
Write-Host "📋 Verificando pré-requisitos..." -ForegroundColor Yellow

try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js não encontrado!" -ForegroundColor Red
    Write-Host "Por favor, instale Node.js 18+ em: https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Verificar se npm está disponível
try {
    $npmVersion = npm --version
    Write-Host "✅ npm encontrado: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm não encontrado!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow

# Instalar dependências
try {
    npm install
    Write-Host "✅ Dependências instaladas com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao instalar dependências!" -ForegroundColor Red
    Write-Host "Tente executar: npm cache clean --force" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🎉 Instalação concluída com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Para iniciar o sistema, execute:" -ForegroundColor Cyan
Write-Host "npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "O sistema estará disponível em: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "📖 Consulte INSTALACAO_GITHUB.md para mais informações" -ForegroundColor Yellow

# Perguntar se deseja iniciar o sistema
$response = Read-Host "Deseja iniciar o sistema agora? (s/n)"
if ($response -eq "s" -or $response -eq "S" -or $response -eq "sim" -or $response -eq "Sim") {
    Write-Host ""
    Write-Host "🚀 Iniciando sistema..." -ForegroundColor Green
    npm run dev
}