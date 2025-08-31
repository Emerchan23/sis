# Guia de Instalação - ERP-BR no Ubuntu Server

## Pré-requisitos do Sistema

### 1. Atualizar o Sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Instalar Dependências Básicas
```bash
sudo apt install -y curl wget git build-essential software-properties-common apt-transport-https ca-certificates gnupg lsb-release
```

## Instalação do Docker

### 1. Remover versões antigas do Docker (se existirem)
```bash
sudo apt remove docker docker-engine docker.io containerd runc
```

### 2. Adicionar repositório oficial do Docker
```bash
# Adicionar chave GPG oficial do Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Adicionar repositório do Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

### 3. Instalar Docker Engine
```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 4. Configurar Docker para usuário atual
```bash
# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Reiniciar sessão ou executar:
newgrp docker

# Habilitar Docker para iniciar automaticamente
sudo systemctl enable docker
sudo systemctl start docker
```

### 5. Verificar instalação do Docker
```bash
docker --version
docker compose version
```

## Instalação do Node.js (Opcional - para desenvolvimento)

### 1. Instalar Node.js via NodeSource
```bash
# Instalar Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalação
node --version
npm --version
```

## Configuração do Firewall

### 1. Configurar UFW (Ubuntu Firewall)
```bash
# Habilitar UFW
sudo ufw enable

# Permitir SSH (importante!)
sudo ufw allow ssh

# Permitir portas do ERP-BR
sudo ufw allow 8000/tcp  # Frontend
sudo ufw allow 8001/tcp  # Backend

# Verificar status
sudo ufw status
```

## Instalação do ERP-BR

### 1. Clonar o repositório
```bash
# Navegar para diretório desejado
cd /opt

# Clonar repositório (substitua pela URL correta)
sudo git clone <URL_DO_REPOSITORIO> erp-br

# Alterar proprietário
sudo chown -R $USER:$USER /opt/erp-br

# Navegar para o diretório
cd /opt/erp-br
```

### 2. Configurar permissões
```bash
# Dar permissões adequadas
chmod +x backend/Dockerfile
chmod -R 755 .
```

### 3. Construir e executar os contêineres
```bash
# Construir imagens
docker compose build

# Executar em modo detached
docker compose up -d

# Verificar status
docker compose ps
```

### 4. Verificar logs
```bash
# Ver logs do backend
docker compose logs backend

# Ver logs do frontend
docker compose logs frontend

# Ver logs em tempo real
docker compose logs -f
```

## Comandos Úteis

### Gerenciamento do Sistema
```bash
# Parar serviços
docker compose down

# Reiniciar serviços
docker compose restart

# Reconstruir e reiniciar
docker compose down && docker compose build && docker compose up -d

# Ver uso de recursos
docker stats

# Limpar cache do Docker
docker system prune -f
```

### Backup do Banco de Dados
```bash
# Fazer backup do SQLite
docker compose exec backend cp /app/data/erp.sqlite /app/data/backup-$(date +%Y%m%d-%H%M%S).sqlite

# Copiar backup para host
docker compose cp backend:/app/data/backup-*.sqlite ./
```

## Solução de Problemas Comuns

### 1. Erro de permissão do TypeScript
```bash
# Se ocorrer erro "tsc: Permission denied"
docker compose build --no-cache backend
```

### 2. Porta já em uso
```bash
# Verificar processos usando as portas
sudo netstat -tulpn | grep :8000
sudo netstat -tulpn | grep :8001

# Matar processo se necessário
sudo kill -9 <PID>
```

### 3. Problemas de rede
```bash
# Reiniciar Docker
sudo systemctl restart docker

# Recriar rede do Docker Compose
docker compose down
docker network prune -f
docker compose up -d
```

### 4. Falta de espaço em disco
```bash
# Limpar imagens não utilizadas
docker image prune -a -f

# Limpar volumes não utilizados
docker volume prune -f

# Verificar uso de espaço
df -h
docker system df
```

## Acesso ao Sistema

Após a instalação bem-sucedida:

- **Frontend**: http://SEU_IP:8000
- **Backend API**: http://SEU_IP:8001

## Monitoramento

### 1. Verificar status dos serviços
```bash
# Status dos contêineres
docker compose ps

# Logs em tempo real
docker compose logs -f

# Uso de recursos
docker stats --no-stream
```

### 2. Configurar reinicialização automática
```bash
# Adicionar ao crontab para reiniciar se necessário
crontab -e

# Adicionar linha (verificar a cada 5 minutos):
*/5 * * * * cd /opt/erp-br && docker compose ps | grep -q "Up" || docker compose up -d
```

## Segurança

### 1. Configurações básicas de segurança
```bash
# Atualizar sistema regularmente
sudo apt update && sudo apt upgrade -y

# Configurar fail2ban (opcional)
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### 2. Backup automático
```bash
# Criar script de backup
sudo nano /usr/local/bin/backup-erp.sh

# Conteúdo do script:
#!/bin/bash
cd /opt/erp-br
docker compose exec -T backend cp /app/data/erp.sqlite /app/data/backup-$(date +%Y%m%d-%H%M%S).sqlite

# Tornar executável
sudo chmod +x /usr/local/bin/backup-erp.sh

# Adicionar ao crontab (backup diário às 2h)
0 2 * * * /usr/local/bin/backup-erp.sh
```

---

**Nota**: Este guia assume Ubuntu Server 20.04 LTS ou superior. Para outras versões, alguns comandos podem precisar de ajustes.