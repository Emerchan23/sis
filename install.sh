#!/bin/bash

# Script de Instalação Automatizada - Sistema ERP-BR
# Bash Script para Linux/Mac

echo "🚀 Iniciando instalação do Sistema ERP-BR..."
echo ""

# Verificar se Node.js está instalado
echo "📋 Verificando pré-requisitos..."

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js encontrado: $NODE_VERSION"
else
    echo "❌ Node.js não encontrado!"
    echo "Por favor, instale Node.js 18+ em: https://nodejs.org"
    exit 1
fi

# Verificar se npm está disponível
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm encontrado: $NPM_VERSION"
else
    echo "❌ npm não encontrado!"
    exit 1
fi

echo ""
echo "📦 Instalando dependências..."

# Instalar dependências
if npm install; then
    echo "✅ Dependências instaladas com sucesso!"
else
    echo "❌ Erro ao instalar dependências!"
    echo "Tente executar: npm cache clean --force"
    exit 1
fi

echo ""
echo "🎉 Instalação concluída com sucesso!"
echo ""
echo "Para iniciar o sistema, execute:"
echo "npm run dev"
echo ""
echo "O sistema estará disponível em: http://localhost:3000"
echo ""
echo "📖 Consulte INSTALACAO_GITHUB.md para mais informações"

# Perguntar se deseja iniciar o sistema
read -p "Deseja iniciar o sistema agora? (s/n): " response
if [[ "$response" =~ ^([sS][iI][mM]|[sS])$ ]]; then
    echo ""
    echo "🚀 Iniciando sistema..."
    npm run dev
fi