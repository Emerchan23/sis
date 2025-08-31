# Configuração para Acesso Externo ao ERP

## Problema Identificado
O erro "HTTP 401 Unauthorized" ao tentar acessar de outro computador ocorre porque:

1. ✅ **Backend configurado corretamente**: Está rodando em `0.0.0.0:8001` (acessível externamente)
2. ✅ **Usuário admin existe**: Criado no banco com senha correta
3. ✅ **CORS configurado**: Permite requisições de qualquer origem
4. ✅ **Frontend configurado**: Arquivo `.env.local` criado com IP da rede

## Solução

### 1. Configurar Firewall do Windows
Execute como **Administrador** no PowerShell:
```powershell
netsh advfirewall firewall add rule name="ERP Backend Port 8001" dir=in action=allow protocol=TCP localport=8001
```

### 2. Verificar IP da Máquina
O IP atual da máquina é: **192.168.1.10**

### 3. Acessar de Outro Computador
No outro computador, acesse:
- **Frontend**: `http://192.168.1.10:8000`
- **Backend**: `http://192.168.1.10:8001`

### 4. Credenciais de Login
- **Usuário**: admin
- **Senha**: admin

## Verificações Adicionais

### Testar Conectividade
No outro computador, teste se consegue acessar o backend:
```bash
curl http://192.168.1.10:8001/health
```

### Verificar Portas Abertas
Na máquina do servidor:
```powershell
netstat -an | findstr :8001
netstat -an | findstr :8000
```

### Logs do Backend
Monitore os logs do backend para ver se as requisições estão chegando:
```bash
npm run dev
```

## Configuração Atual

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://192.168.1.10:8001
```

### Backend (server.ts)
```javascript
app.listen({ port: 8001, host: "0.0.0.0" })
```

### CORS (server.ts)
```javascript
app.register(cors, {
  origin: true,
  credentials: true,
})
```

## Troubleshooting

1. **Firewall**: Principal causa de bloqueio de acesso externo
2. **Antivírus**: Pode bloquear conexões de rede
3. **Router**: Verificar se não há bloqueios na rede local
4. **IP dinâmico**: O IP pode mudar, verificar com `ipconfig`

## Comandos Úteis

```powershell
# Verificar IP atual
ipconfig | findstr "IPv4"

# Verificar portas em uso
netstat -an | findstr :8001

# Testar conectividade local
Invoke-WebRequest -Uri "http://localhost:8001/health" -UseBasicParsing

# Testar conectividade externa (substitua o IP)
Invoke-WebRequest -Uri "http://192.168.1.10:8001/health" -UseBasicParsing
```