# Deploy Docker - ERP-BR

## Pré-requisitos
- Docker instalado
- Conta no Docker Hub (para upload da imagem)

## Build da Imagem

### 1. Build local
```bash
docker build -t erp-br .
```

### 2. Build com tag para Docker Hub
```bash
docker build -t emerchan2025/erp-br:latest .
```

## Executar Localmente

### Usando Docker Compose (Recomendado)
```bash
docker-compose up -d
```

### Usando Docker diretamente
```bash
docker run -d \
  --name erp-br-app \
  -p 3145:3145 \
  -v $(pwd)/data:/app/data \
  erp-br
```

## Upload para Docker Hub

### 1. Login no Docker Hub
```bash
docker login
```

### 2. Tag da imagem
```bash
docker tag erp-br emerchan2025/erp-br:latest
```

### 3. Push para Docker Hub
```bash
docker push emerchan2025/erp-br:latest
```

## Deploy em Produção

### Pull da imagem
```bash
docker pull emerchan2025/erp-br:latest
```

### Executar em produção
```bash
docker run -d \
  --name erp-br-prod \
  -p 3145:3145 \
  -v /caminho/para/dados:/app/data \
  --restart unless-stopped \
  emerchan2025/erp-br:latest
```

## Comandos Úteis

### Ver logs
```bash
docker logs erp-br-app
```

### Parar container
```bash
docker stop erp-br-app
```

### Remover container
```bash
docker rm erp-br-app
```

### Listar imagens
```bash
docker images
```

### Remover imagem
```bash
docker rmi erp-br
```

## Configurações

- **Porta**: 3145
- **Volume de dados**: `./data:/app/data`
- **Health check**: Disponível em `/api/health`
- **Restart policy**: `unless-stopped`

## Notas Importantes

1. Certifique-se de que a pasta `data` existe no host para persistência dos dados
2. O sistema usa SQLite, então os dados ficam no volume montado
3. A aplicação está configurada para rodar na porta 3145
4. O health check verifica se a API está respondendo corretamente