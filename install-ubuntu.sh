#!/bin/bash

# Script de Instalação Automática - ERP-BR no Ubuntu Server
# Autor: Sistema ERP-BR
# Versão: 1.0

set -e  # Parar execução em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[AVISO] $1${NC}"
}

error() {
    echo -e "${RED}[ERRO] $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Verificar se é Ubuntu
if ! grep -q "Ubuntu" /etc/os-release; then
    error "Este script é específico para Ubuntu. Sistema detectado: $(lsb_release -d | cut -f2)"
fi

# Verificar se é executado como usuário normal (não root)
if [ "$EUID" -eq 0 ]; then
    error "Não execute este script como root. Execute como usuário normal com sudo."
fi

log "Iniciando instalação do ERP-BR no Ubuntu..."

# 1. Atualizar sistema
log "Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

# 2. Instalar dependências básicas
log "Instalando dependências básicas..."
sudo apt install -y curl wget git build-essential software-properties-common \
    apt-transport-https ca-certificates gnupg lsb-release ufw

# 3. Remover versões antigas do Docker
log "Removendo versões antigas do Docker..."
sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# 4. Instalar Docker
log "Instalando Docker..."

# Adicionar chave GPG do Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Adicionar repositório do Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. Configurar Docker para usuário atual
log "Configurando Docker..."
sudo usermod -aG docker $USER
sudo systemctl enable docker
sudo systemctl start docker

# 6. Configurar firewall
log "Configurando firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 8000/tcp  # Frontend
sudo ufw allow 8001/tcp  # Backend

# 7. Instalar Node.js (opcional para desenvolvimento)
read -p "Deseja instalar Node.js para desenvolvimento? (y/N): " install_node
if [[ $install_node =~ ^[Yy]$ ]]; then
    log "Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    info "Node.js $(node --version) instalado"
    info "npm $(npm --version) instalado"
fi

# 8. Configurar diretório do projeto
PROJECT_DIR="/opt/erp-br"
read -p "Diretório de instalação [$PROJECT_DIR]: " custom_dir
if [ ! -z "$custom_dir" ]; then
    PROJECT_DIR="$custom_dir"
fi

log "Configurando diretório do projeto: $PROJECT_DIR"

# Criar diretório se não existir
if [ ! -d "$PROJECT_DIR" ]; then
    sudo mkdir -p "$PROJECT_DIR"
    sudo chown -R $USER:$USER "$PROJECT_DIR"
fi

# 9. Clonar ou copiar projeto
if [ -d "$(pwd)/.git" ]; then
    log "Copiando projeto atual para $PROJECT_DIR..."
    cp -r . "$PROJECT_DIR/"
else
    warn "Repositório Git não detectado no diretório atual."
    read -p "URL do repositório Git (deixe vazio para pular): " repo_url
    if [ ! -z "$repo_url" ]; then
        log "Clonando repositório..."
        git clone "$repo_url" "$PROJECT_DIR"
    else
        warn "Pulando clonagem. Certifique-se de copiar os arquivos manualmente."
    fi
fi

# 10. Navegar para diretório do projeto
cd "$PROJECT_DIR"

# 11. Configurar permissões
log "Configurando permissões..."
chmod -R 755 .
if [ -f "backend/Dockerfile" ]; then
    chmod +x backend/Dockerfile
fi

# 12. Verificar arquivos necessários
log "Verificando arquivos necessários..."
if [ ! -f "docker-compose.yml" ]; then
    error "Arquivo docker-compose.yml não encontrado em $PROJECT_DIR"
fi

if [ ! -f "backend/Dockerfile" ]; then
    error "Arquivo backend/Dockerfile não encontrado"
fi

# 13. Construir e executar contêineres
log "Construindo imagens Docker..."
# Aguardar Docker estar pronto para o usuário atual
info "Aguardando Docker estar pronto... (pode ser necessário fazer logout/login)"
sudo -u $USER docker --version || {
    warn "Docker não está acessível para o usuário atual."
    warn "Execute 'newgrp docker' ou faça logout/login e execute novamente:"
    warn "cd $PROJECT_DIR && docker compose build && docker compose up -d"
    exit 0
}

docker compose build

log "Executando contêineres..."
docker compose up -d

# 14. Verificar status
log "Verificando status dos contêineres..."
sleep 5
docker compose ps

# 15. Mostrar logs
log "Verificando logs..."
docker compose logs --tail=20

# 16. Configurar backup automático
read -p "Deseja configurar backup automático diário? (y/N): " setup_backup
if [[ $setup_backup =~ ^[Yy]$ ]]; then
    log "Configurando backup automático..."
    
    # Criar script de backup
    sudo tee /usr/local/bin/backup-erp.sh > /dev/null <<EOF
#!/bin/bash
cd $PROJECT_DIR
docker compose exec -T backend cp /app/data/erp.sqlite /app/data/backup-\$(date +%Y%m%d-%H%M%S).sqlite
EOF
    
    sudo chmod +x /usr/local/bin/backup-erp.sh
    
    # Adicionar ao crontab
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-erp.sh") | crontab -
    
    info "Backup automático configurado para executar diariamente às 2h"
fi

# 17. Criar script de gerenciamento
log "Criando script de gerenciamento..."
tee "$PROJECT_DIR/manage.sh" > /dev/null <<EOF
#!/bin/bash
# Script de Gerenciamento ERP-BR

case "\$1" in
    start)
        echo "Iniciando ERP-BR..."
        docker compose up -d
        ;;
    stop)
        echo "Parando ERP-BR..."
        docker compose down
        ;;
    restart)
        echo "Reiniciando ERP-BR..."
        docker compose restart
        ;;
    rebuild)
        echo "Reconstruindo ERP-BR..."
        docker compose down
        docker compose build
        docker compose up -d
        ;;
    logs)
        docker compose logs -f
        ;;
    status)
        docker compose ps
        ;;
    backup)
        docker compose exec backend cp /app/data/erp.sqlite /app/data/backup-\$(date +%Y%m%d-%H%M%S).sqlite
        echo "Backup criado"
        ;;
    *)
        echo "Uso: \$0 {start|stop|restart|rebuild|logs|status|backup}"
        exit 1
        ;;
esac
EOF

chmod +x "$PROJECT_DIR/manage.sh"

# 18. Obter IP do servidor
SERVER_IP=$(hostname -I | awk '{print $1}')

# 19. Finalização
log "Instalação concluída com sucesso!"
echo
info "=== INFORMAÇÕES DE ACESSO ==="
info "Frontend: http://$SERVER_IP:8000"
info "Backend API: http://$SERVER_IP:8001"
echo
info "=== COMANDOS ÚTEIS ==="
info "Gerenciar sistema: $PROJECT_DIR/manage.sh {start|stop|restart|rebuild|logs|status|backup}"
info "Ver logs: docker compose logs -f"
info "Status: docker compose ps"
echo
info "=== PRÓXIMOS PASSOS ==="
info "1. Acesse http://$SERVER_IP:8000 no navegador"
info "2. Se necessário, configure o firewall do seu provedor/router"
info "3. Para desenvolvimento, instale Node.js se não foi instalado"
echo
warn "IMPORTANTE: Se o Docker não funcionar imediatamente, execute:"
warn "newgrp docker"
warn "ou faça logout/login e execute: cd $PROJECT_DIR && docker compose up -d"
echo
log "Instalação finalizada!"