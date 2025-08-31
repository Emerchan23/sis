# ERP-BR - Instalação via Docker no Ubuntu

## 🚀 Instalação Automática (Recomendada)

### Pré-requisitos
- Ubuntu 18.04 ou superior
- Acesso sudo
- Conexão com internet

### Instalação em Um Comando

```bash
# Baixar e executar script de instalação
curl -fsSL https://raw.githubusercontent.com/seu-usuario/erp-br/main/install-docker-ubuntu.sh | bash
```

**OU** se você já tem o projeto:

```bash
# Dar permissão de execução
chmod +x install-docker-ubuntu.sh

# Executar instalação
./install-docker-ubuntu.sh
```

## 🐳 Instalação Manual

### 1. Instalar Docker e Docker Compose

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências
sudo apt install -y curl wget git apt-transport-https ca-certificates gnupg lsb-release

# Instalar Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Reiniciar sessão ou executar:
newgrp docker
```

### 2. Executar o Sistema

```bash
# Clonar o repositório (se necessário)
git clone <url-do-repositorio>
cd erp-br

# Criar diretório de dados
mkdir -p ./backend/data

# Construir e iniciar containers
docker-compose up --build -d
```

## 📱 Acessar o Sistema

- **Frontend (Interface Web)**: http://localhost:4522
- **Backend (API)**: http://localhost:8001

## 🔧 Comandos Úteis

```bash
# Ver status dos containers
docker-compose ps

# Ver logs em tempo real
docker-compose logs -f

# Ver logs específicos
docker-compose logs frontend
docker-compose logs backend

# Parar o sistema
docker-compose down

# Reiniciar o sistema
docker-compose restart

# Atualizar o sistema (após mudanças no código)
docker-compose up --build -d

# Limpar containers e volumes (CUIDADO: apaga dados)
docker-compose down -v
docker system prune -a
```

## 🗄️ Backup dos Dados

```bash
# Fazer backup do banco de dados
cp ./backend/data/erp.sqlite ./backup-$(date +%Y%m%d-%H%M%S).sqlite

# Restaurar backup
cp ./backup-YYYYMMDD-HHMMSS.sqlite ./backend/data/erp.sqlite
docker-compose restart backend
```

## 🔒 Configurações de Segurança

### Firewall (UFW)
```bash
# Permitir apenas as portas necessárias
sudo ufw allow 4522/tcp  # Frontend
sudo ufw allow 8001/tcp  # Backend (opcional, apenas se precisar de acesso externo)
sudo ufw enable
```

### Acesso Externo
Para permitir acesso de outras máquinas na rede:

1. Edite o `docker-compose.yml`:
```yaml
services:
  frontend:
    ports:
      - "0.0.0.0:4522:4522"  # Permite acesso externo
  backend:
    ports:
      - "0.0.0.0:8001:8001"  # Permite acesso externo
```

2. Configure o firewall:
```bash
sudo ufw allow from 192.168.0.0/16 to any port 4522
sudo ufw allow from 192.168.0.0/16 to any port 8001
```

## 🚨 Solução de Problemas

### Container não inicia
```bash
# Ver logs detalhados
docker-compose logs

# Reconstruir containers
docker-compose down
docker-compose up --build
```

### Erro de permissão
```bash
# Verificar se usuário está no grupo docker
groups $USER

# Se não estiver, adicionar:
sudo usermod -aG docker $USER
newgrp docker
```

### Porta já em uso
```bash
# Verificar o que está usando a porta
sudo netstat -tulpn | grep :4522

# Parar processo se necessário
sudo kill -9 <PID>
```

### Problemas de rede
```bash
# Resetar rede Docker
docker network prune
docker-compose down
docker-compose up
```

## 📊 Monitoramento

### Verificar recursos
```bash
# Ver uso de recursos dos containers
docker stats

# Ver espaço em disco
docker system df
```

### Logs estruturados
```bash
# Configurar logrotate para logs do Docker
sudo nano /etc/logrotate.d/docker-containers
```

## 🔄 Atualizações

```bash
# Atualizar código
git pull origin main

# Reconstruir e reiniciar
docker-compose down
docker-compose up --build -d
```

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs: `docker-compose logs`
2. Verifique o status: `docker-compose ps`
3. Reinicie o sistema: `docker-compose restart`
4. Se persistir, reconstrua: `docker-compose up --build -d`

---

**Desenvolvido para Ubuntu com Docker** 🐧🐳