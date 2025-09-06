# 🚀 Simulação: Nova Instalação ERP-BR via GitHub + Portainer

## 📋 Cenário da Simulação
Este guia simula uma instalação completamente nova do sistema ERP-BR em um servidor limpo, usando o repositório GitHub e deploy via Portainer.

---

## 🎯 **FASE 1: Preparação do Ambiente**

### 1.1 Pré-requisitos do Servidor
```bash
# Sistema: Ubuntu 20.04+ ou CentOS 8+
# RAM: Mínimo 2GB (Recomendado 4GB)
# Disco: Mínimo 10GB livres
# Portas: 3145, 9000 (Portainer)
```

### 1.2 Instalação do Docker
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
newgrp docker
```

### 1.3 Instalação do Portainer
```bash
# Criar volume para dados do Portainer
docker volume create portainer_data

# Instalar Portainer Community Edition
docker run -d -p 8000:8000 -p 9000:9000 \
  --name portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

---

## 🎯 **FASE 2: Configuração Inicial do Portainer**

### 2.1 Primeiro Acesso
1. **Acessar**: `http://SEU_IP:9000`
2. **Criar usuário admin**:
   - Username: `admin`
   - Password: `MinhaSenh@123!` (mínimo 12 caracteres)
3. **Selecionar**: "Docker" (ambiente local)

### 2.2 Configurar Ambiente Docker
1. **Dashboard** → **Environments**
2. **Verificar**: "local" está ativo
3. **Testar conexão**: Status deve estar "UP"

---

## 🎯 **FASE 3: Obtenção do Código Fonte**

### 3.1 Clone do Repositório
```bash
# Em uma máquina com Git (pode ser local)
git clone https://github.com/Emerchan23/sis.git erp-br-sistema
cd erp-br-sistema

# Verificar arquivos essenciais
ls -la | grep -E "(docker-compose|Dockerfile)"
```

### 3.2 Preparar Arquivos para Upload
```bash
# Criar arquivo ZIP para upload no Portainer
zip -r erp-br-sistema.zip . -x "node_modules/*" ".git/*" "data/*"
```

---

## 🎯 **FASE 4: Deploy via Portainer Stack**

### 4.1 Criar Nova Stack
1. **Portainer** → **Stacks** → **Add stack**
2. **Nome**: `erp-br-sistema`
3. **Método**: "Upload" ou "Repository"

### 4.2 Configuração via Repository (Recomendado)
```yaml
# Repository URL
https://github.com/Emerchan23/sis.git

# Compose file path
docker-compose-stack.yml

# Environment variables
NODE_ENV=production
PORT=3145
DB_PATH=/app/data/erp.sqlite
```

### 4.3 Configuração Manual (Alternativa)
```yaml
# Cole o conteúdo do docker-compose-stack.yml
version: '3.8'

services:
  erp-br:
    build: .
    container_name: erp-br-sistema
    ports:
      - "3145:3145"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3145
      - DB_PATH=/app/data/erp.sqlite
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3145/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - erp-network

volumes:
  erp_data:
    driver: local

networks:
  erp-network:
    driver: bridge
```

---

## 🎯 **FASE 5: Monitoramento do Deploy**

### 5.1 Acompanhar Build
1. **Stacks** → **erp-br-sistema**
2. **Logs** → Verificar processo de build
3. **Aguardar**: "Status: Running"

### 5.2 Logs Esperados
```bash
# Build bem-sucedido
✓ Dependencies installed
✓ TypeScript compiled
✓ Database initialized
✓ Server started on port 3145
✓ Health check passed
```

### 5.3 Verificação de Containers
```bash
# Via terminal (opcional)
docker ps | grep erp-br
docker logs erp-br-sistema
```

---

## 🎯 **FASE 6: Configuração Pós-Deploy**

### 6.1 Verificar Saúde do Sistema
1. **Containers** → **erp-br-sistema**
2. **Status**: "Running" (verde)
3. **Health**: "Healthy"
4. **Uptime**: Crescendo

### 6.2 Teste de Conectividade
```bash
# Teste da API
curl http://SEU_IP:3145/api/health
# Resposta esperada: {"status":"ok","timestamp":"..."}

# Teste da interface
curl -I http://SEU_IP:3145
# Resposta esperada: HTTP/1.1 200 OK
```

### 6.3 Configurar Dados Iniciais
1. **Acessar**: `http://SEU_IP:3145`
2. **Primeira empresa**: Cadastrar dados da empresa
3. **Usuário admin**: Configurar credenciais
4. **Teste básico**: Criar cliente/produto de teste

---

## 🎯 **FASE 7: Configurações de Produção**

### 7.1 Backup Automático
```bash
# Criar script de backup
sudo crontab -e

# Adicionar linha para backup diário às 2h
0 2 * * * docker exec erp-br-sistema cp /app/data/erp.sqlite /app/data/backup-$(date +\%Y\%m\%d).sqlite
```

### 7.2 Monitoramento
1. **Portainer** → **Containers** → **Stats**
2. **Configurar alertas** para CPU/Memory
3. **Log rotation** configurado automaticamente

### 7.3 Segurança
```bash
# Firewall (UFW)
sudo ufw allow 3145/tcp
sudo ufw allow 9000/tcp
sudo ufw enable

# SSL/HTTPS (opcional - via Nginx Proxy)
# Configurar certificado Let's Encrypt
```

---

## 🎯 **FASE 8: Testes de Validação**

### 8.1 Testes Funcionais
- [ ] ✅ Login no sistema
- [ ] ✅ Cadastro de empresa
- [ ] ✅ Cadastro de cliente
- [ ] ✅ Cadastro de produto
- [ ] ✅ Criação de orçamento
- [ ] ✅ Processamento de venda
- [ ] ✅ Relatórios dashboard
- [ ] ✅ Backup/restore

### 8.2 Testes de Performance
```bash
# Teste de carga básico
ab -n 100 -c 10 http://SEU_IP:3145/api/dashboard/totals

# Monitorar recursos
docker stats erp-br-sistema
```

### 8.3 Testes de Recuperação
```bash
# Simular restart
docker restart erp-br-sistema

# Verificar integridade dos dados
curl http://SEU_IP:3145/api/health
```

---

## 🎯 **FASE 9: Documentação da Instalação**

### 9.1 Informações do Sistema
```yaml
# Dados da Instalação
Data: $(date)
Versão: Latest (GitHub main branch)
URL Sistema: http://SEU_IP:3145
URL Portainer: http://SEU_IP:9000
Banco de Dados: SQLite (/app/data/erp.sqlite)
Backups: /app/data/backup-*.sqlite
```

### 9.2 Credenciais
```yaml
# Portainer
Usuário: admin
Senha: [DEFINIDA_NA_INSTALACAO]

# Sistema ERP-BR
Configurado durante primeiro acesso
```

### 9.3 Comandos Úteis
```bash
# Logs do sistema
docker logs -f erp-br-sistema

# Restart do sistema
docker restart erp-br-sistema

# Backup manual
docker exec erp-br-sistema cp /app/data/erp.sqlite /app/data/backup-manual.sqlite

# Atualizar sistema
docker-compose pull && docker-compose up -d
```

---

## 🎯 **FASE 10: Troubleshooting**

### 10.1 Problemas Comuns

#### Container não inicia
```bash
# Verificar logs
docker logs erp-br-sistema

# Verificar recursos
docker system df
free -h
```

#### Erro de conexão
```bash
# Verificar portas
netstat -tlnp | grep 3145

# Verificar firewall
sudo ufw status
```

#### Banco de dados corrompido
```bash
# Restaurar backup
docker exec erp-br-sistema cp /app/data/backup-YYYYMMDD.sqlite /app/data/erp.sqlite
docker restart erp-br-sistema
```

### 10.2 Contatos de Suporte
- **GitHub Issues**: https://github.com/Emerchan23/sis/issues
- **Documentação**: Arquivos README no repositório

---

## ✅ **RESULTADO ESPERADO**

Após completar todos os passos:

1. ✅ **Sistema funcionando** em `http://SEU_IP:3145`
2. ✅ **Portainer gerenciando** em `http://SEU_IP:9000`
3. ✅ **Dados persistentes** em volume Docker
4. ✅ **Backups automáticos** configurados
5. ✅ **Monitoramento ativo** via Portainer
6. ✅ **Sistema pronto** para uso em produção

---

## 📞 **Próximos Passos**

1. **Configurar domínio** (opcional)
2. **Implementar HTTPS** (recomendado)
3. **Configurar backup externo** (recomendado)
4. **Treinar usuários** no sistema
5. **Monitorar performance** regularmente

**🎉 Instalação Concluída com Sucesso!**