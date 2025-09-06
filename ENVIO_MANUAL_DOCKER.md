# 🐳 Envio Manual para Docker Hub

## ❌ Problema Identificado

O Docker Desktop não conseguiu inicializar automaticamente (timeout de 120 segundos).

## ✅ Solução Manual

### Passo 1: Iniciar Docker Desktop Manualmente

1. **Clique no ícone do Docker Desktop** na área de trabalho ou menu iniciar
2. **Aguarde** até aparecer "Docker Desktop is running" na bandeja do sistema
3. **Verifique** se o ícone do Docker na bandeja está **verde** (não cinza)

### Passo 2: Executar Envio

Após o Docker Desktop estar rodando (ícone verde), execute **UM** dos comandos abaixo:

#### Opção A: Script Automático (Recomendado)
```powershell
powershell -ExecutionPolicy Bypass -File docker-build-push.ps1
```

#### Opção B: NPM Script
```bash
npm run docker:build-push
```

#### Opção C: Comandos Manuais
```bash
# 1. Build
docker build -t erp-br .

# 2. Tag
docker tag erp-br emerchan2025/erp-br:latest

# 3. Login (vai pedir usuário e senha)
docker login

# 4. Push
docker push emerchan2025/erp-br:latest
```

## 🎯 Verificação de Sucesso

Após o envio, sua imagem estará em:
- **URL**: https://hub.docker.com/r/emerchan2025/erp-br
- **Pull**: `docker pull emerchan2025/erp-br:latest`

## ⚠️ Dicas Importantes

- **Aguarde** o Docker Desktop carregar completamente antes de executar comandos
- **Verifique** se tem conexão com a internet
- **Tenha** suas credenciais do Docker Hub em mãos
- **Não feche** o Docker Desktop durante o processo

## 🔧 Se ainda não funcionar

1. **Reinicie** o Docker Desktop
2. **Reinicie** o computador
3. **Verifique** se o Docker Desktop está atualizado
4. **Execute** como administrador se necessário