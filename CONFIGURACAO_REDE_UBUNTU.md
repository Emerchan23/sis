# Configuração de Rede e Firewall - ERP-BR Ubuntu Server

## Configuração do Firewall UFW

### 1. Instalação e Configuração Básica

```bash
# Instalar UFW (geralmente já vem instalado)
sudo apt update
sudo apt install ufw

# Configurar políticas padrão
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Permitir SSH (IMPORTANTE - faça isso primeiro!)
sudo ufw allow ssh
sudo ufw allow 22/tcp

# Habilitar UFW
sudo ufw --force enable
```

### 2. Configuração para ERP-BR

```bash
# Permitir portas do ERP-BR
sudo ufw allow 8000/tcp comment 'ERP-BR Frontend'
sudo ufw allow 8001/tcp comment 'ERP-BR Backend API'

# Para acesso HTTP/HTTPS (se usar nginx)
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Verificar regras
sudo ufw status numbered
sudo ufw status verbose
```

### 3. Configurações Avançadas de Firewall

```bash
# Permitir acesso apenas de IPs específicos
sudo ufw allow from 192.168.1.0/24 to any port 8000
sudo ufw allow from 192.168.1.0/24 to any port 8001

# Permitir acesso de IP específico
sudo ufw allow from 203.0.113.4 to any port 8000

# Limitar tentativas de conexão SSH (proteção contra brute force)
sudo ufw limit ssh

# Bloquear IP específico
sudo ufw deny from 203.0.113.100

# Permitir ping (ICMP)
sudo ufw allow in on eth0 to any port 22 proto tcp
```

### 4. Script de Configuração Automática do Firewall

```bash
#!/bin/bash
# setup-firewall.sh - Configuração automática do firewall

echo "Configurando firewall para ERP-BR..."

# Resetar UFW (cuidado em produção!)
# sudo ufw --force reset

# Configurar políticas padrão
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Permitir SSH
sudo ufw allow ssh

# Permitir ERP-BR
sudo ufw allow 8000/tcp comment 'ERP-BR Frontend'
sudo ufw allow 8001/tcp comment 'ERP-BR Backend'

# Permitir HTTP/HTTPS se necessário
read -p "Permitir HTTP/HTTPS? (y/N): " allow_web
if [[ $allow_web =~ ^[Yy]$ ]]; then
    sudo ufw allow 80/tcp comment 'HTTP'
    sudo ufw allow 443/tcp comment 'HTTPS'
fi

# Habilitar UFW
sudo ufw --force enable

# Mostrar status
sudo ufw status verbose

echo "Firewall configurado com sucesso!"
```

## Configuração de Rede

### 1. Configuração de IP Estático (Netplan)

```yaml
# /etc/netplan/01-network-manager-all.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:  # ou enp0s3, ens33, etc.
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      gateway4: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
          - 1.1.1.1
```

```bash
# Aplicar configuração
sudo netplan apply

# Verificar configuração
ip addr show
ip route show
```

### 2. Configuração de DNS

```bash
# Editar resolv.conf
sudo nano /etc/systemd/resolved.conf

# Adicionar:
[Resolve]
DNS=8.8.8.8 8.8.4.4 1.1.1.1
FallbackDNS=208.67.222.222 208.67.220.220
Domains=~.
DNSSEC=yes
DNSOverTLS=yes

# Reiniciar serviço
sudo systemctl restart systemd-resolved

# Verificar
sudo systemd-resolve --status
```

### 3. Configuração de Proxy Reverso com Nginx

```nginx
# /etc/nginx/sites-available/erp-br
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;
    
    # Redirecionar HTTP para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com www.seu-dominio.com;
    
    # Certificados SSL
    ssl_certificate /etc/ssl/certs/seu-dominio.crt;
    ssl_certificate_key /etc/ssl/private/seu-dominio.key;
    
    # Configurações SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Headers de segurança
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    
    # Proxy para frontend
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Proxy para API backend
    location /api/ {
        proxy_pass http://localhost:8001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers se necessário
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range";
    }
    
    # Logs
    access_log /var/log/nginx/erp-br.access.log;
    error_log /var/log/nginx/erp-br.error.log;
}
```

```bash
# Habilitar site
sudo ln -s /etc/nginx/sites-available/erp-br /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Reiniciar nginx
sudo systemctl restart nginx
```

## Configuração de SSL/TLS

### 1. Certificado Let's Encrypt (Certbot)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com

# Renovação automática
sudo crontab -e
# Adicionar linha:
0 12 * * * /usr/bin/certbot renew --quiet

# Testar renovação
sudo certbot renew --dry-run
```

### 2. Certificado Auto-assinado (Para Teste)

```bash
# Criar diretório
sudo mkdir -p /etc/ssl/private

# Gerar certificado
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/erp-br.key \
    -out /etc/ssl/certs/erp-br.crt \
    -subj "/C=BR/ST=Estado/L=Cidade/O=Empresa/CN=seu-dominio.com"

# Configurar permissões
sudo chmod 600 /etc/ssl/private/erp-br.key
sudo chmod 644 /etc/ssl/certs/erp-br.crt
```

## Monitoramento de Rede

### 1. Ferramentas de Monitoramento

```bash
# Instalar ferramentas
sudo apt install net-tools iftop nethogs nmap

# Monitorar conexões
sudo netstat -tulpn | grep -E ':(8000|8001)'
sudo ss -tulpn | grep -E ':(8000|8001)'

# Monitorar tráfego
sudo iftop -i eth0
sudo nethogs eth0

# Verificar portas abertas
nmap -sT -O localhost
```

### 2. Script de Monitoramento de Rede

```bash
#!/bin/bash
# network-monitor.sh - Monitoramento de rede

echo "=== Status da Rede ==="
echo "Interface de rede:"
ip addr show | grep -E '^[0-9]+:|inet '

echo "\n=== Portas ERP-BR ==="
echo "Frontend (8000):"
sudo netstat -tulpn | grep :8000 || echo "Porta 8000 não está em uso"
echo "Backend (8001):"
sudo netstat -tulpn | grep :8001 || echo "Porta 8001 não está em uso"

echo "\n=== Conectividade Externa ==="
ping -c 3 8.8.8.8 > /dev/null && echo "Internet: OK" || echo "Internet: FALHA"

echo "\n=== Status do Firewall ==="
sudo ufw status

echo "\n=== Conexões Ativas ==="
sudo netstat -an | grep -E ':(8000|8001)' | grep ESTABLISHED | wc -l
echo "conexões ativas nas portas 8000/8001"
```

## Configuração de Backup de Rede

### 1. Backup via rsync

```bash
# Instalar rsync
sudo apt install rsync

# Script de backup remoto
#!/bin/bash
# backup-remote.sh

REMOTE_HOST="backup-server.com"
REMOTE_USER="backup"
REMOTE_PATH="/backup/erp-br"
LOCAL_PATH="/opt/erp-br"

# Fazer backup
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'logs' \
    $LOCAL_PATH/ $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/

echo "Backup concluído: $(date)"
```

### 2. Configuração de VPN (Opcional)

```bash
# Instalar OpenVPN
sudo apt install openvpn

# Configurar cliente VPN
sudo nano /etc/openvpn/client.conf

# Iniciar VPN
sudo systemctl start openvpn@client
sudo systemctl enable openvpn@client
```

## Otimização de Performance de Rede

### 1. Configurações do Kernel

```bash
# Editar sysctl.conf
sudo nano /etc/sysctl.conf

# Adicionar otimizações:
# Aumentar buffers de rede
net.core.rmem_default = 262144
net.core.rmem_max = 16777216
net.core.wmem_default = 262144
net.core.wmem_max = 16777216

# Otimizar TCP
net.ipv4.tcp_rmem = 4096 65536 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_congestion_control = bbr

# Aplicar configurações
sudo sysctl -p
```

### 2. Configuração do Docker para Rede

```bash
# Editar daemon.json do Docker
sudo nano /etc/docker/daemon.json

{
  "default-address-pools": [
    {
      "base": "172.20.0.0/16",
      "size": 24
    }
  ],
  "dns": ["8.8.8.8", "8.8.4.4"],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}

# Reiniciar Docker
sudo systemctl restart docker
```

## Segurança de Rede

### 1. Fail2Ban para Proteção

```bash
# Instalar Fail2Ban
sudo apt install fail2ban

# Configurar para SSH
sudo nano /etc/fail2ban/jail.local

[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3

# Iniciar serviço
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Verificar status
sudo fail2ban-client status
```

### 2. Configuração de Rate Limiting no Nginx

```nginx
# Adicionar ao nginx.conf
http {
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=web:10m rate=1r/s;
    
    server {
        # Aplicar rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            # ... resto da configuração
        }
        
        location / {
            limit_req zone=web burst=5 nodelay;
            # ... resto da configuração
        }
    }
}
```

---

## Scripts Úteis

### Script Completo de Configuração de Rede

```bash
#!/bin/bash
# setup-network.sh - Configuração completa de rede

set -e

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "Iniciando configuração de rede..."

# 1. Configurar firewall
log "Configurando firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 8000/tcp comment 'ERP-BR Frontend'
sudo ufw allow 8001/tcp comment 'ERP-BR Backend'
sudo ufw --force enable

# 2. Instalar ferramentas
log "Instalando ferramentas de rede..."
sudo apt update
sudo apt install -y net-tools iftop nethogs nmap fail2ban

# 3. Configurar Fail2Ban
log "Configurando Fail2Ban..."
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# 4. Otimizar rede
log "Aplicando otimizações de rede..."
echo 'net.core.rmem_default = 262144' | sudo tee -a /etc/sysctl.conf
echo 'net.core.rmem_max = 16777216' | sudo tee -a /etc/sysctl.conf
echo 'net.core.wmem_default = 262144' | sudo tee -a /etc/sysctl.conf
echo 'net.core.wmem_max = 16777216' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

log "Configuração de rede concluída!"
log "Firewall status:"
sudo ufw status
```

**Nota**: Sempre teste as configurações em ambiente de desenvolvimento antes de aplicar em produção!