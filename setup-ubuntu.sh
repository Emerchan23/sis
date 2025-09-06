#!/bin/bash

# Script de configuração para Ubuntu
# Este script ajuda a configurar o sistema ERP no Ubuntu

echo "=== Configuração do Sistema ERP para Ubuntu ==="
echo

# Descobrir o IP do servidor
echo "1. Descobrindo o IP do servidor..."
IP=$(hostname -I | awk '{print $1}')
echo "IP encontrado: $IP"
echo

# Criar arquivo .env.local com IP correto
echo "2. Configurando arquivo .env.local..."
cat > .env.local << EOF
# Configurações do Sistema ERP
NEXT_PUBLIC_API_URL=http://$IP:3145
DB_PATH=./data/erp.sqlite
NODE_ENV=development
EOF

echo "Arquivo .env.local criado com IP: $IP"
echo

# Verificar se Node.js está instalado
echo "3. Verificando Node.js..."
if command -v node &> /dev/null; then
    echo "Node.js encontrado: $(node --version)"
else
    echo "ERRO: Node.js não encontrado!"
    echo "Instale com: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi
echo

# Verificar se as dependências estão instaladas
echo "4. Verificando dependências..."
if [ ! -d "node_modules" ]; then
    echo "Instalando dependências..."
    npm install
else
    echo "Dependências já instaladas"
fi
echo

# Verificar firewall
echo "5. Verificando firewall..."
if command -v ufw &> /dev/null; then
    echo "Liberando porta 3145 no firewall..."
    sudo ufw allow 3145
    echo "Porta 3145 liberada"
else
    echo "UFW não encontrado, verifique manualmente se a porta 3145 está liberada"
fi
echo

echo "=== Configuração Concluída ==="
echo
echo "Para iniciar o sistema:"
echo "  npm run dev"
echo "  ou"
echo "  node start-dev.js"
echo
echo "O sistema estará disponível em:"
echo "  Local: http://localhost:3145"
echo "  Rede: http://$IP:3145"
echo
echo "Se ainda houver erros de conectividade:"
echo "1. Verifique se o servidor está rodando"
echo "2. Teste a conectividade: curl http://$IP:3145/api/health"
echo "3. Verifique os logs do servidor"
echo