# Backend (Fastify + SQLite) Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm install --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
RUN npm install -g typescript
RUN chmod -R 755 node_modules/.bin/
COPY . .
RUN npx tsc -p tsconfig.json

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./package.json
# volume para o arquivo .sqlite (ajuste path se necessário)
VOLUME ["/app/data"]
EXPOSE 4523
CMD ["npm", "start"]
