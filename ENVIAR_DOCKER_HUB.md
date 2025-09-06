# 🐳 Como Enviar para Docker Hub

## Passo 1: Iniciar Docker Desktop

1. **Abra o Docker Desktop** no seu computador
2. **Aguarde** até que apareça "Docker Desktop is running" na bandeja do sistema
3. **Verifique** se o ícone do Docker na bandeja está verde

## Passo 2: Executar o Script Automático

Após o Docker Desktop estar rodando, execute um dos comandos abaixo:

### Opção 1: Script PowerShell (Recomendado)
```powershell
powershell -ExecutionPolicy Bypass -File docker-build-push.ps1
```

### Opção 2: NPM Script
```bash
npm run docker:build-push
```

### Opção 3: Comandos Manuais
```bash
# 1. Build da imagem
docker build -t erp-br .

# 2. Tag para seu usuário
docker tag erp-br emerchan2025/erp-br:latest

# 3. Login no Docker Hub
docker login

# 4. Push para Docker Hub
docker push emerchan2025/erp-br:latest
```

## Passo 3: Verificar no Docker Hub

Após o envio, sua imagem estará disponível em:
- **URL**: https://hub.docker.com/r/emerchan2025/erp-br
- **Pull**: `docker pull emerchan2025/erp-br:latest`

## ⚠️ Problemas Comuns

- **Docker Desktop não está rodando**: Inicie o Docker Desktop e aguarde
- **Erro de login**: Execute `docker login` e insira suas credenciais
- **Erro de rede**: Verifique sua conexão com a internet

## 🎯 Status Atual

✅ Docker instalado  
❌ Docker Desktop não está rodando  
⏳ Aguardando inicialização do Docker Desktop