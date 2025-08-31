# Guia de Troubleshooting - ERP-BR no Ubuntu

## Problemas Comuns e Soluções

### 1. Erro de Permissão do TypeScript

**Problema**: `sh: tsc: Permission denied` ou `The command '/bin/sh -c npm run build' returned a non-zero code: 126`

**Soluções**:

```bash
# Solução 1: Reconstruir com cache limpo
docker compose build --no-cache backend

# Solução 2: Limpar sistema Docker
docker system prune -f
docker compose build --no-cache

# Solução 3: Verificar Dockerfile
# Certifique-se que o Dockerfile contém:
# RUN npm install -g typescript
# RUN chmod -R 755 node_modules/.bin/
# RUN npx tsc -p tsconfig.json
```

### 2. Docker não Funciona Após Instalação

**Problema**: `permission denied while trying to connect to the Docker daemon socket`

**Soluções**:

```bash
# Solução 1: Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
newgrp docker

# Solução 2: Reiniciar sessão
# Faça logout e login novamente

# Solução 3: Reiniciar Docker
sudo systemctl restart docker

# Verificar se funcionou
docker --version
docker ps
```

### 3. Portas Já em Uso

**Problema**: `Error starting userland proxy: listen tcp4 0.0.0.0:8000: bind: address already in use`

**Soluções**:

```bash
# Verificar processos usando as portas
sudo netstat -tulpn | grep :8000
sudo netstat -tulpn | grep :8001

# Matar processo específico
sudo kill -9 <PID>

# Ou parar todos os contêineres
docker compose down

# Verificar se há outros Docker Compose rodando
docker ps -a

# Alterar portas no docker-compose.yml se necessário
# ports:
#   - "8080:8000"  # Usar porta 8080 em vez de 8000
```

### 4. Problemas de Rede Docker

**Problema**: Contêineres não conseguem se comunicar

**Soluções**:

```bash
# Reiniciar rede Docker
docker compose down
docker network prune -f
docker compose up -d

# Verificar redes Docker
docker network ls

# Inspecionar rede específica
docker network inspect erp-br_erp-network

# Recriar completamente
docker compose down -v
docker compose up -d
```

### 5. Falta de Espaço em Disco

**Problema**: `no space left on device`

**Soluções**:

```bash
# Verificar uso de espaço
df -h
docker system df

# Limpar imagens não utilizadas
docker image prune -a -f

# Limpar volumes não utilizados
docker volume prune -f

# Limpar tudo (CUIDADO!)
docker system prune -a -f --volumes

# Verificar logs grandes
sudo find /var/lib/docker -name "*.log" -exec ls -lh {} \; | sort -k5 -hr | head -10

# Limpar logs do sistema
sudo journalctl --vacuum-time=7d
```

### 6. Contêiner Não Inicia

**Problema**: Contêiner para imediatamente após iniciar

**Soluções**:

```bash
# Verificar logs detalhados
docker compose logs backend
docker compose logs frontend

# Verificar status
docker compose ps

# Executar contêiner interativamente para debug
docker run -it --rm erp-br-backend /bin/sh

# Verificar saúde do contêiner
docker inspect erp-br-backend-1 | grep -A 10 "Health"

# Reconstruir imagem
docker compose build --no-cache backend
docker compose up -d
```

### 7. Banco de Dados SQLite Corrompido

**Problema**: Erro ao acessar banco de dados

**Soluções**:

```bash
# Verificar integridade do banco
docker compose exec backend sqlite3 /app/data/erp.sqlite "PRAGMA integrity_check;"

# Fazer backup antes de qualquer correção
docker compose exec backend cp /app/data/erp.sqlite /app/data/erp-backup-$(date +%Y%m%d).sqlite

# Tentar reparar
docker compose exec backend sqlite3 /app/data/erp.sqlite ".recover" > recovered.sql

# Recriar banco se necessário
docker compose exec backend rm /app/data/erp.sqlite
docker compose restart backend
```

### 8. Problemas de Performance

**Problema**: Sistema lento ou travando

**Soluções**:

```bash
# Verificar uso de recursos
docker stats --no-stream

# Verificar logs de erro
docker compose logs --tail=100 | grep -i error

# Aumentar limites de memória no docker-compose.yml
# deploy:
#   resources:
#     limits:
#       memory: 1G
#     reservations:
#       memory: 512M

# Verificar uso de disco
df -h
du -sh /var/lib/docker

# Otimizar banco SQLite
docker compose exec backend sqlite3 /app/data/erp.sqlite "VACUUM;"
```

### 9. Problemas de Firewall

**Problema**: Não consegue acessar o sistema externamente

**Soluções**:

```bash
# Verificar status do UFW
sudo ufw status

# Permitir portas necessárias
sudo ufw allow 8000/tcp
sudo ufw allow 8001/tcp

# Verificar se portas estão abertas
sudo netstat -tulpn | grep :8000
sudo netstat -tulpn | grep :8001

# Testar conectividade local
curl -I http://localhost:8000
curl -I http://localhost:8001

# Verificar iptables
sudo iptables -L -n

# Para provedor de nuvem, verificar security groups
```

### 10. Problemas de SSL/HTTPS

**Problema**: Certificados SSL não funcionam

**Soluções**:

```bash
# Verificar certificados
openssl x509 -in /path/to/cert.pem -text -noout

# Gerar certificado auto-assinado para teste
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Configurar nginx para SSL
# server {
#     listen 443 ssl;
#     ssl_certificate /etc/nginx/ssl/cert.pem;
#     ssl_certificate_key /etc/nginx/ssl/key.pem;
# }

# Usar Let's Encrypt (Certbot)
sudo apt install certbot
sudo certbot --nginx -d seu-dominio.com
```

### 11. Problemas de Backup

**Problema**: Backup não funciona ou falha

**Soluções**:

```bash
# Verificar espaço disponível
df -h

# Testar backup manual
docker compose exec backend sqlite3 /app/data/erp.sqlite ".backup /app/data/manual-backup.sqlite"

# Verificar permissões
ls -la backend/data/

# Criar backup com timestamp
docker compose exec backend sqlite3 /app/data/erp.sqlite ".backup /app/data/backup-$(date +%Y%m%d-%H%M%S).sqlite"

# Script de backup robusto
#!/bin/bash
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
docker compose exec -T backend sqlite3 /app/data/erp.sqlite ".backup /app/data/backup-$TIMESTAMP.sqlite"
docker compose cp backend:/app/data/backup-$TIMESTAMP.sqlite $BACKUP_DIR/
```

### 12. Problemas de Atualização

**Problema**: Falha ao atualizar sistema ou contêineres

**Soluções**:

```bash
# Fazer backup antes de atualizar
./manage.sh backup

# Parar sistema
docker compose down

# Atualizar código
git pull origin main

# Reconstruir imagens
docker compose build --no-cache

# Iniciar novamente
docker compose up -d

# Se falhar, reverter
git checkout HEAD~1
docker compose build
docker compose up -d

# Restaurar backup se necessário
docker compose exec backend cp /app/data/backup-TIMESTAMP.sqlite /app/data/erp.sqlite
docker compose restart backend
```

## Comandos de Diagnóstico

### Verificação Geral do Sistema

```bash
# Status dos serviços
sudo systemctl status docker
docker compose ps

# Uso de recursos
top
htop
docker stats --no-stream

# Espaço em disco
df -h
du -sh /var/lib/docker

# Memória
free -h

# Logs do sistema
sudo journalctl -u docker.service --since "1 hour ago"
```

### Verificação de Rede

```bash
# Conectividade
ping google.com
curl -I http://localhost:8000
curl -I http://localhost:8001

# Portas abertas
sudo netstat -tulpn | grep -E ':(8000|8001)'
ss -tulpn | grep -E ':(8000|8001)'

# Redes Docker
docker network ls
docker network inspect bridge
```

### Logs Detalhados

```bash
# Logs dos contêineres
docker compose logs -f
docker compose logs backend --tail=100
docker compose logs frontend --tail=100

# Logs do Docker
sudo journalctl -u docker.service -f

# Logs do sistema
sudo tail -f /var/log/syslog
```

## Scripts de Manutenção

### Script de Limpeza Automática

```bash
#!/bin/bash
# cleanup.sh - Limpeza automática do sistema

echo "Iniciando limpeza do sistema..."

# Limpar Docker
docker system prune -f
docker image prune -a -f

# Limpar logs antigos
sudo journalctl --vacuum-time=7d

# Limpar backups antigos (mais de 30 dias)
find ./backups -name "*.sqlite" -mtime +30 -delete

echo "Limpeza concluída!"
```

### Script de Monitoramento

```bash
#!/bin/bash
# monitor.sh - Monitoramento básico

echo "=== Status dos Contêineres ==="
docker compose ps

echo "\n=== Uso de Recursos ==="
docker stats --no-stream

echo "\n=== Espaço em Disco ==="
df -h | grep -E '(Filesystem|/$)'

echo "\n=== Últimos Logs (Erros) ==="
docker compose logs --tail=20 | grep -i error

echo "\n=== Conectividade ==="
curl -s -o /dev/null -w "Frontend: %{http_code}\n" http://localhost:8000
curl -s -o /dev/null -w "Backend: %{http_code}\n" http://localhost:8001
```

## Contatos e Suporte

Para problemas não cobertos neste guia:

1. Verifique os logs detalhados
2. Consulte a documentação oficial do Docker
3. Procure por issues similares no repositório do projeto
4. Crie um backup antes de tentar soluções experimentais

---

**Lembre-se**: Sempre faça backup antes de aplicar correções que possam afetar dados!