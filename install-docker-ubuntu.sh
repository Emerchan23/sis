#!/bin/bash

# Script de instalação automática do ERP-BR no Ubuntu via Docker
# Executa na porta 4522

set -e

echo "🚀 Iniciando instalação do ERP-BR no Ubuntu..."

# Atualizar sistema
echo "📦 Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

# Instalar dependências básicas
echo "🔧 Instalando dependências básicas..."
sudo apt install -y curl wget git apt-transport-https ca-certificates gnupg lsb-release

# Verificar se Docker já está instalado
if ! command -v docker &> /dev/null; then
    echo "🐳 Instalando Docker..."
    
    # Adicionar chave GPG oficial do Docker
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Adicionar repositório Docker
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Instalar Docker
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io
    
    # Adicionar usuário ao grupo docker
    sudo usermod -aG docker $USER
    
    echo "✅ Docker instalado com sucesso!"
else
    echo "✅ Docker já está instalado!"
fi

# Verificar se Docker Compose já está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "🔨 Instalando Docker Compose..."
    
    # Baixar Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    
    # Dar permissão de execução
    sudo chmod +x /usr/local/bin/docker-compose
    
    echo "✅ Docker Compose instalado com sucesso!"
else
    echo "✅ Docker Compose já está instalado!"
fi

# Iniciar serviço Docker
echo "🔄 Iniciando serviço Docker..."
sudo systemctl start docker
sudo systemctl enable docker

# Criar diretório de dados se não existir
echo "📁 Criando diretório de dados..."
mkdir -p ./backend/data

# Parar containers existentes se estiverem rodando
echo "🛑 Parando containers existentes..."
docker-compose down 2>/dev/null || true

# Construir e iniciar containers
echo "🏗️ Construindo e iniciando containers..."
docker-compose up --build -d

# Aguardar containers iniciarem
echo "⏳ Aguardando containers iniciarem..."
sleep 10

# Verificar status dos containers
echo "📊 Status dos containers:"
docker-compose ps

# Verificar logs do backend
echo "📋 Logs do backend:"
docker-compose logs backend --tail=10

# Verificar logs do frontend
echo "📋 Logs do frontend:"
docker-compose logs frontend --tail=10

echo ""
echo "🎉 Instalação concluída!"
echo "📱 Sistema disponível em: http://localhost:4522"
echo "🔧 API Backend disponível em: http://localhost:8001"
echo ""
echo "📝 Comandos úteis:"
echo "   - Ver logs: docker-compose logs -f"
echo "   - Parar sistema: docker-compose down"
echo "   - Reiniciar sistema: docker-compose restart"
echo "   - Atualizar sistema: docker-compose up --build -d"
echo ""
echo "⚠️  IMPORTANTE: Se você acabou de instalar o Docker, faça logout e login novamente"
echo "   ou execute: newgrp docker"
echo ""