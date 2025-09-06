#!/bin/bash

# 🚀 Script de Simulação: Instalação ERP-BR via GitHub + Portainer
# Autor: Sistema ERP-BR
# Versão: 1.0
# Data: $(date +"%Y-%m-%d")

set -e  # Parar em caso de erro

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

# Banner
echo -e "${BLUE}"
echo "═══════════════════════════════════════════════════════════════"
echo "🚀 SIMULAÇÃO: INSTALAÇÃO ERP-BR VIA GITHUB + PORTAINER"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${NC}"

# Verificar se é root
if [[ $EUID -eq 0 ]]; then
   error "Este script não deve ser executado como root!"
fi

# Verificar sistema operacional
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    log "Sistema Linux detectado ✓"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    log "Sistema macOS detectado ✓"
else
    warn "Sistema não testado: $OSTYPE"
fi

# FASE 1: Verificar pré-requisitos
log "FASE 1: Verificando pré-requisitos..."

# Verificar Docker
if command -v docker &> /dev/null; then
    log "Docker encontrado: $(docker --version)"
else
    error "Docker não encontrado! Instale o Docker primeiro."
fi

# Verificar Docker Compose
if command -v docker-compose &> /dev/null; then
    log "Docker Compose encontrado: $(docker-compose --version)"
else
    error "Docker Compose não encontrado! Instale o Docker Compose primeiro."
fi

# Verificar Git
if command -v git &> /dev/null; then
    log "Git encontrado: $(git --version)"
else
    error "Git não encontrado! Instale o Git primeiro."
fi

# Verificar curl
if command -v curl &> /dev/null; then
    log "curl encontrado ✓"
else
    error "curl não encontrado! Instale o curl primeiro."
fi

# FASE 2: Configurar diretórios
log "FASE 2: Configurando diretórios..."

WORK_DIR="$HOME/erp-br-deploy"
DATA_DIR="$WORK_DIR/data"
BACKUP_DIR="$WORK_DIR/backups"

mkdir -p "$WORK_DIR"
mkdir -p "$DATA_DIR"
mkdir -p "$BACKUP_DIR"

log "Diretório de trabalho: $WORK_DIR"
log "Diretório de dados: $DATA_DIR"
log "Diretório de backups: $BACKUP_DIR"

# FASE 3: Verificar Portainer
log "FASE 3: Verificando Portainer..."

if docker ps | grep -q "portainer"; then
    log "Portainer já está rodando ✓"
    PORTAINER_URL="http://localhost:9000"
else
    warn "Portainer não encontrado. Instalando..."
    
    # Criar volume do Portainer
    docker volume create portainer_data
    
    # Instalar Portainer
    docker run -d -p 8000:8000 -p 9000:9000 \
        --name portainer --restart=always \
        -v /var/run/docker.sock:/var/run/docker.sock \
        -v portainer_data:/data \
        portainer/portainer-ce:latest
    
    log "Portainer instalado com sucesso!"
    PORTAINER_URL="http://localhost:9000"
    
    info "Aguarde 30 segundos para o Portainer inicializar..."
    sleep 30
fi

# FASE 4: Clone do repositório
log "FASE 4: Clonando repositório..."

cd "$WORK_DIR"

if [ -d "sis" ]; then
    warn "Repositório já existe. Atualizando..."
    cd sis
    git pull origin main
else
    log "Clonando repositório do GitHub..."
    git clone https://github.com/Emerchan23/sis.git
    cd sis
fi

log "Repositório clonado/atualizado com sucesso ✓"

# FASE 5: Verificar arquivos essenciais
log "FASE 5: Verificando arquivos essenciais..."

ESSENTIAL_FILES=(
    "docker-compose-stack.yml"
    "Dockerfile"
    "package.json"
    "start-dev.js"
)

for file in "${ESSENTIAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        log "✓ $file encontrado"
    else
        error "✗ $file não encontrado!"
    fi
done

# FASE 6: Preparar configuração
log "FASE 6: Preparando configuração..."

# Criar arquivo .env para produção
cat > .env.production << EOF
NODE_ENV=production
PORT=3145
DB_PATH=/app/data/erp.sqlite
NEXT_PUBLIC_API_URL=http://localhost:3145
EOF

log "Arquivo .env.production criado ✓"

# FASE 7: Verificar portas disponíveis
log "FASE 7: Verificando portas..."

check_port() {
    local port=$1
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
        warn "Porta $port já está em uso"
        return 1
    else
        log "Porta $port disponível ✓"
        return 0
    fi
}

check_port 3145 || warn "Sistema ERP-BR pode ter conflito na porta 3145"
check_port 9000 || warn "Portainer pode ter conflito na porta 9000"

# FASE 8: Simular deploy
log "FASE 8: Simulando deploy..."

info "Comandos que seriam executados no Portainer:"
echo -e "${YELLOW}"
echo "1. Acessar: $PORTAINER_URL"
echo "2. Login com credenciais de admin"
echo "3. Stacks → Add stack"
echo "4. Nome: erp-br-sistema"
echo "5. Repository: https://github.com/Emerchan23/sis.git"
echo "6. Compose file: docker-compose-stack.yml"
echo "7. Environment variables:"
echo "   - NODE_ENV=production"
echo "   - PORT=3145"
echo "   - DB_PATH=/app/data/erp.sqlite"
echo "8. Deploy stack"
echo -e "${NC}"

# FASE 9: Teste local (opcional)
read -p "Deseja fazer um teste local com docker-compose? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "FASE 9: Executando teste local..."
    
    # Usar docker-compose-stack.yml se existir, senão docker-compose.yml
    if [ -f "docker-compose-stack.yml" ]; then
        COMPOSE_FILE="docker-compose-stack.yml"
    else
        COMPOSE_FILE="docker-compose.yml"
    fi
    
    log "Usando arquivo: $COMPOSE_FILE"
    
    # Build e start
    docker-compose -f "$COMPOSE_FILE" up -d --build
    
    log "Aguardando sistema inicializar..."
    sleep 30
    
    # Teste de saúde
    if curl -f http://localhost:3145/api/health &>/dev/null; then
        log "✅ Sistema está respondendo corretamente!"
        info "Acesse: http://localhost:3145"
    else
        warn "Sistema pode não estar totalmente inicializado ainda"
        info "Verifique os logs: docker-compose -f $COMPOSE_FILE logs"
    fi
    
    read -p "Pressione Enter para parar o teste local..."
    docker-compose -f "$COMPOSE_FILE" down
else
    log "Teste local pulado."
fi

# FASE 10: Relatório final
log "FASE 10: Gerando relatório..."

REPORT_FILE="$WORK_DIR/installation-report.txt"

cat > "$REPORT_FILE" << EOF
═══════════════════════════════════════════════════════════════
🚀 RELATÓRIO DE SIMULAÇÃO - ERP-BR VIA GITHUB + PORTAINER
═══════════════════════════════════════════════════════════════

Data: $(date)
Usuário: $(whoami)
Sistema: $(uname -a)

📁 DIRETÓRIOS:
- Trabalho: $WORK_DIR
- Dados: $DATA_DIR
- Backups: $BACKUP_DIR

🔗 URLs:
- Portainer: $PORTAINER_URL
- Sistema ERP-BR: http://localhost:3145 (após deploy)
- Repositório: https://github.com/Emerchan23/sis.git

📋 PRÓXIMOS PASSOS:
1. Acessar Portainer em: $PORTAINER_URL
2. Criar/configurar usuário admin (se primeira vez)
3. Criar nova Stack com nome: erp-br-sistema
4. Configurar repositório: https://github.com/Emerchan23/sis.git
5. Usar arquivo: docker-compose-stack.yml
6. Definir variáveis de ambiente:
   - NODE_ENV=production
   - PORT=3145
   - DB_PATH=/app/data/erp.sqlite
7. Fazer deploy da stack
8. Aguardar build e inicialização
9. Acessar sistema em: http://localhost:3145
10. Configurar primeira empresa e usuário

🛠️ COMANDOS ÚTEIS:
- Ver logs: docker logs erp-br-sistema
- Restart: docker restart erp-br-sistema
- Backup: docker exec erp-br-sistema cp /app/data/erp.sqlite /app/data/backup-\$(date +%Y%m%d).sqlite

✅ VERIFICAÇÕES REALIZADAS:
- Docker instalado e funcionando
- Docker Compose disponível
- Git instalado
- Portainer instalado/verificado
- Repositório clonado
- Arquivos essenciais verificados
- Portas verificadas
- Configuração preparada

═══════════════════════════════════════════════════════════════
EOF

log "Relatório salvo em: $REPORT_FILE"

# Mostrar resumo
echo -e "${GREEN}"
echo "═══════════════════════════════════════════════════════════════"
echo "✅ SIMULAÇÃO CONCLUÍDA COM SUCESSO!"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${NC}"

info "Próximos passos:"
echo "1. 🌐 Acesse o Portainer: $PORTAINER_URL"
echo "2. 📚 Consulte o guia: SIMULACAO_INSTALACAO_GITHUB_PORTAINER.md"
echo "3. 📄 Veja o relatório: $REPORT_FILE"
echo "4. 🚀 Faça o deploy via Portainer Stack"

echo -e "\n${BLUE}Obrigado por usar o sistema ERP-BR! 🎉${NC}"

exit 0