# Setup Docker - ERP-BR

## ⚠️ Pré-requisitos

### 1. Docker Desktop deve estar rodando
O Docker está instalado no seu sistema, mas o **Docker Desktop precisa estar executando** para funcionar.

**Para iniciar o Docker Desktop:**
- Procure por "Docker Desktop" no menu Iniciar do Windows
- Clique para abrir o Docker Desktop
- Aguarde até que o ícone do Docker na bandeja do sistema fique verde
- Você verá "Docker Desktop is running" quando estiver pronto

### 2. Verificar se Docker está funcionando
```bash
docker --version
docker info
```

## 🚀 Comandos Rápidos

### Build da imagem
```bash
npm run docker:build
# ou
docker build -t erp-br .
```

### Executar com Docker Compose (Recomendado)
```bash
npm run docker:compose:up
# ou
docker-compose up -d
```

### Executar diretamente
```bash
npm run docker:run
# ou
docker run -d --name erp-br-app -p 3145:3145 -v ./data:/app/data erp-br
```

### Ver logs
```bash
npm run docker:logs
# ou
docker logs erp-br-app
```

### Parar container
```bash
npm run docker:stop
# ou
docker stop erp-br-app
```

## 📋 Processo Completo

### 1. Iniciar Docker Desktop
- Abra o Docker Desktop
- Aguarde ficar verde na bandeja do sistema

### 2. Build da imagem
```bash
npm run docker:build
```

### 3. Executar o sistema
```bash
npm run docker:compose:up
```

### 4. Acessar o sistema
- Abra o navegador em: http://localhost:3145

### 5. Para parar
```bash
npm run docker:compose:down
```

## 🌐 Upload para Docker Hub

### 1. Fazer login
```bash
docker login
```

### 2. Tag da imagem
```bash
docker tag erp-br SEU_USUARIO/erp-br:latest
```

### 3. Push para Docker Hub
```bash
docker push SEU_USUARIO/erp-br:latest
```

## 🔧 Troubleshooting

### Erro: "The system cannot find the file specified"
- **Solução**: Inicie o Docker Desktop

### Erro: "port is already allocated"
- **Solução**: Pare outros containers na porta 3145
```bash
docker ps
docker stop CONTAINER_ID
```

### Erro: "container name already exists"
- **Solução**: Remova o container existente
```bash
docker rm erp-br-app
```

## 📁 Estrutura de Arquivos Docker

- `Dockerfile` - Configuração da imagem
- `docker-compose.yml` - Orquestração do container
- `.dockerignore` - Arquivos ignorados no build
- `DOCKER_DEPLOY.md` - Instruções detalhadas de deploy
- `DOCKER_SETUP.md` - Este arquivo de setup

## ✅ Verificação Final

Após executar, verifique:
1. Container rodando: `docker ps`
2. Logs sem erro: `docker logs erp-br-app`
3. Sistema acessível: http://localhost:3145
4. Health check: http://localhost:3145/api/health