# 🚀 Deploy ERP-BR via Stack (Portainer Local)

## 📋 Pré-requisitos

1. **Docker Desktop** instalado e rodando
2. **Portainer** instalado localmente
3. **Imagem Docker** disponível: `emerchan2025/erp-br:latest`

## 🛠️ Instalação do Portainer (se não tiver)

```bash
# Criar volume para dados do Portainer
docker volume create portainer_data

# Executar Portainer
docker run -d -p 8000:8000 -p 9443:9443 --name portainer --restart=always -v /var/run/docker.sock:/var/run/docker.sock -v portainer_data:/data portainer/portainer-ce:latest
```

**Acesso:** https://localhost:9443

## 📁 Preparação dos Arquivos

### 1. Criar pasta para dados
```bash
mkdir -p data
```

### 2. Usar o arquivo docker-compose-stack.yml
O arquivo `docker-compose-stack.yml` já está pronto para uso.

## 🎯 Deploy via Stack no Portainer

### Passo 1: Acessar Portainer
1. Abra https://localhost:9443
2. Faça login com suas credenciais
3. Selecione o ambiente **local**

### Passo 2: Criar Stack
1. No menu lateral, clique em **Stacks**
2. Clique em **+ Add stack**
3. Digite o nome: `erp-br-system`

### Passo 3: Configurar Stack

**Opção A: Upload do arquivo**
1. Selecione **Upload**
2. Faça upload do arquivo `docker-compose-stack.yml`

**Opção B: Editor Web**
1. Selecione **Web editor**
2. Cole o conteúdo do arquivo `docker-compose-stack.yml`

### Passo 4: Variáveis de Ambiente (Opcional)
Na seção **Environment variables**, adicione se necessário:
```
PORT=3145
NODE_ENV=production
```

### Passo 5: Deploy
1. Clique em **Deploy the stack**
2. Aguarde o download da imagem e inicialização

## ✅ Verificação

### 1. Status no Portainer
- Vá em **Stacks** → **erp-br-system**
- Verifique se o status está **running**

### 2. Logs
- Clique no container **erp-br-app**
- Vá na aba **Logs** para verificar se iniciou corretamente

### 3. Acesso ao Sistema
- **URL:** http://localhost:3145
- **Health Check:** http://localhost:3145/api/health

## 🔧 Gerenciamento via Portainer

### Parar o Sistema
1. Vá em **Stacks** → **erp-br-system**
2. Clique em **Stop this stack**

### Reiniciar o Sistema
1. Vá em **Stacks** → **erp-br-system**
2. Clique em **Start this stack**

### Atualizar o Sistema
1. Vá em **Stacks** → **erp-br-system**
2. Clique em **Editor**
3. Modifique se necessário
4. Clique em **Update the stack**

### Remover o Sistema
1. Vá em **Stacks** → **erp-br-system**
2. Clique em **Delete this stack**

## 📊 Monitoramento

### Recursos do Container
- **CPU/Memória:** Containers → erp-br-app → Stats
- **Logs em tempo real:** Containers → erp-br-app → Logs
- **Terminal:** Containers → erp-br-app → Console

### Health Check
O sistema possui health check automático:
- **Intervalo:** 30 segundos
- **Endpoint:** /api/health
- **Status:** Visível no Portainer

## 🗂️ Backup dos Dados

### Localização dos Dados
```
./data/erp.sqlite  # Banco de dados principal
```

### Backup Manual
```bash
# Copiar banco de dados
cp ./data/erp.sqlite ./backup/erp-backup-$(date +%Y%m%d).sqlite
```

## 🚨 Solução de Problemas

### Container não inicia
1. Verifique os logs no Portainer
2. Confirme se a porta 3145 não está em uso
3. Verifique se a pasta `./data` existe

### Erro de permissão
```bash
# Dar permissões à pasta data
chmod -R 755 ./data
```

### Porta em uso
```bash
# Verificar o que está usando a porta
netstat -tulpn | grep 3145

# Parar processo se necessário
sudo kill -9 <PID>
```

## 🎉 Pronto!

Seu sistema ERP-BR está rodando via Stack no Portainer local!

**URLs importantes:**
- **Sistema:** http://localhost:3145
- **Portainer:** https://localhost:9443
- **Health Check:** http://localhost:3145/api/health