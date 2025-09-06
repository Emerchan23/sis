# 🌍 Sistema ERP Universal

## 🎉 Funciona em Qualquer Ambiente!

Este sistema ERP foi projetado para funcionar **automaticamente** em qualquer ambiente sem necessidade de configuração manual de IPs.

## ✅ Ambientes Suportados

- 🖥️ **Desenvolvimento Local** (Windows, Mac, Linux)
- 🌐 **Rede Local** (acesso via IP da rede)
- 🐳 **Docker** (containers e compose)
- ☁️ **VPS/Cloud** (AWS, DigitalOcean, etc.)
- 🏢 **Servidores de Produção**
- 📱 **Acesso Mobile** (via IP da rede)

## 🚀 Instalação Universal

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd erp-br
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Inicie o sistema
```bash
npm run dev
```

**Pronto!** O sistema detecta automaticamente o ambiente e configura tudo.

## 🔧 Como Funciona a Detecção Automática

### No Servidor (SSR)
- Detecta se está em Docker via `DOCKER_ENV`
- Usa variáveis de ambiente quando definidas
- Fallback para localhost em desenvolvimento

### No Cliente (Navegador)
- **localhost/127.0.0.1** → API em `localhost:3145`
- **IP da rede** → API no mesmo IP na porta 3145
- **Domínio** → API no mesmo domínio na porta 3145

### Exemplos Automáticos
- Acesso: `http://localhost:3000` → API: `http://localhost:3145`
- Acesso: `http://192.168.1.100:3000` → API: `http://192.168.1.100:3145`
- Acesso: `http://meusite.com:3000` → API: `http://meusite.com:3145`

## 🐳 Docker

```bash
# Opcional: definir no .env.local
DOCKER_ENV=true
```

O sistema detecta automaticamente o ambiente Docker e configura as URLs corretamente.

## ☁️ Produção

```bash
# Configure apenas se necessário forçar uma URL específica
NEXT_PUBLIC_API_URL=https://meudominio.com:3145
NODE_ENV=production
```

## 🔥 Firewall (Linux/Ubuntu)

```bash
# Libere a porta da API se necessário
sudo ufw allow 3145
```

## 📱 Acesso Mobile

1. Descubra o IP do servidor:
   ```bash
   hostname -I
   ```

2. Acesse do celular:
   ```
   http://192.168.1.100:3000
   ```

3. **Funciona automaticamente!** A API será detectada como `http://192.168.1.100:3145`

## 🛠️ Configurações Avançadas

### Forçar URL Específica
```bash
# No .env.local
NEXT_PUBLIC_API_URL=http://meu-ip-especifico:3145
```

### Debug da Detecção
Abra o console do navegador (F12) e veja a URL da API sendo usada.

## 🎯 Vantagens

- ✅ **Zero Configuração**: Funciona imediatamente
- ✅ **Universal**: Qualquer ambiente
- ✅ **Portável**: Copie e use em qualquer lugar
- ✅ **Inteligente**: Detecta automaticamente o contexto
- ✅ **Flexível**: Permite override quando necessário

## 🔍 Verificação

### Teste Rápido
```bash
# Teste a API
curl http://localhost:3145/api/health

# Ou com seu IP
curl http://SEU_IP:3145/api/health
```

### No Navegador
1. Acesse o sistema
2. Abra o console (F12)
3. Não deve haver erros de "Failed to fetch"

## 🆘 Solução de Problemas

### Porta em Uso
```bash
# Encontre o processo
sudo lsof -i :3145

# Mate o processo
sudo kill -9 PID
```

### Firewall
```bash
# Verifique o status
sudo ufw status

# Libere a porta
sudo ufw allow 3145
```

---

## 🎉 Resultado Final

**Sistema 100% portável e universal!**

- Desenvolvedores: `npm install && npm run dev`
- Docker: Funciona automaticamente
- Produção: Detecta o ambiente
- Mobile: Acesse via IP da rede

**Sem mais problemas de "Failed to fetch"!** 🚀