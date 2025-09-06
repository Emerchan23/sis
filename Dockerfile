# Use Node.js 18 Alpine como base
FROM node:18-alpine AS base

# Instalar dependências necessárias incluindo Python e ferramentas de build
RUN apk add --no-cache libc6-compat python3 make g++ sqlite-dev
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY .npmrc ./

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Copiar código fonte
COPY . .

# Criar diretório para dados
RUN mkdir -p /app/data

# Expor porta
EXPOSE 3145

# Comando para iniciar a aplicação
CMD ["node", "start-dev.js"]