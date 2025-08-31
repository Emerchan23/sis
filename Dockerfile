# Frontend (Next.js) Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Se você usa envs em build, ajuste aqui com ARG/ENV
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Copia somente o necessário para o start
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY public ./public
COPY package.json ./package.json
EXPOSE 4522
ENV PORT=4522
CMD ["npm", "start"]
