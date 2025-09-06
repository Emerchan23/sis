# ERP-BR - Sistema de Gestão Empresarial

Sistema ERP completo desenvolvido em Next.js com backend em Node.js, focado em gestão de vendas, clientes, produtos e relatórios financeiros.

## 📦 Instalação via GitHub

### Método Rápido (Recomendado)

```bash
# Clone o repositório
git clone https://github.com/Emerchan23/sis.git
cd sis

# Execute o script de instalação
# Windows:
.\install.ps1

# Linux/Mac:
./install.sh
```

### Instalação Manual

```bash
# Clone o repositório
git clone https://github.com/Emerchan23/sis.git
cd sis

# Instale as dependências
npm install

# Inicie o sistema
npm run dev
```

**📖 Guia completo:** Consulte `INSTALACAO_GITHUB.md` para instruções detalhadas.

---

## 🚀 Instalação Automática (Alternativa)

Este sistema possui instalação **100% automática**. Basta executar um comando e tudo será configurado automaticamente.

### Pré-requisitos

- **Node.js 18+** (será instalado automaticamente se não estiver presente)
- **Docker** (será instalado automaticamente no Linux, manual no Windows/Mac)

### Instalação em 1 Comando

```bash
npm run setup
```

Ou execute diretamente:

```bash
node install.js
```

### O que a instalação automática faz:

1. ✅ Verifica e instala Node.js (se necessário)
2. ✅ Verifica e instala Docker (se necessário)
3. ✅ Cria diretório de dados externo (`./data/`)
4. ✅ Configura arquivo de ambiente (`.env.local`)
5. ✅ Instala todas as dependências npm
6. ✅ Constrói o projeto
7. ✅ Cria scripts de inicialização

## 🎯 Como Usar

### Desenvolvimento
```bash
npm run start-dev
# ou
npm run dev
```
Acesse: http://localhost:3145

### Produção (Docker)
```bash
npm run start-prod
# ou
docker-compose up --build
```
Acesse: http://localhost:4523

### Comandos Docker
```bash
npm run docker:build    # Construir imagem
npm run docker:up       # Iniciar em background
npm run docker:down     # Parar containers
npm run docker:logs     # Ver logs
```

## 📁 Estrutura do Banco de Dados

- **Localização**: `./data/erp.sqlite`
- **Tipo**: SQLite
- **Status**: **Externo ao Docker** (dados persistem mesmo removendo containers)

## 🔧 Configuração

Todas as configurações estão no arquivo `.env.local` (criado automaticamente):

```env
NEXT_PUBLIC_API_URL=http://localhost:3145
DB_PATH=./data/erp.sqlite
NODE_ENV=development
```

## 🔄 Instalação Limpa (Teste)

Para testar uma instalação completamente limpa:

1. Delete a pasta `node_modules`
2. Delete a pasta `data`
3. Delete o arquivo `.env.local`
4. Execute: `npm run setup`

## 🚀 Funcionalidades

- **Gestão de Clientes**: Cadastro completo de clientes com histórico de compras
- **Gestão de Produtos**: Controle de estoque e catálogo de produtos
- **Pedidos e Vendas**: Sistema completo de pedidos com controle de status
- **Recebimentos**: Controle financeiro de recebimentos e pagamentos
- **Relatórios**: Dashboards e relatórios detalhados
- **Backup/Restore**: Sistema completo de backup e restauração de dados
- **Multi-empresa**: Suporte a múltiplas empresas

## 🛠️ Tecnologias

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, SQLite
- **UI Components**: Shadcn/ui, Radix UI
- **Containerização**: Docker, Docker Compose
- **Banco de Dados**: SQLite com suporte a múltiplas empresas

## 📦 Instalação

### Usando Docker (Recomendado)

```bash
# Clone o repositório
git clone https://github.com/Emerchan23/finantest.git
cd finantest

# Execute com Docker Compose
docker-compose up --build
```

### Instalação Manual

```bash
# Clone o repositório
git clone https://github.com/Emerchan23/finantest.git
cd finantest

# Instale as dependências
npm install

# Execute o backend
cd backend
npm start

# Em outro terminal, execute o frontend
npm run dev
```

## 🌐 Acesso

- **Frontend**: http://localhost:4522
- **Backend API**: http://localhost:4523

## 📊 Estrutura do Projeto

```
├── app/                    # Páginas Next.js (App Router)
├── backend/               # API Node.js/Express
├── components/            # Componentes React reutilizáveis
├── lib/                   # Utilitários e configurações
├── public/                # Arquivos estáticos
├── docker-compose.yml     # Configuração Docker
└── README.md             # Este arquivo
```

## 🔧 Configuração

O sistema utiliza SQLite como banco de dados padrão. As configurações podem ser ajustadas nos arquivos:

- `backend/config.js` - Configurações do backend
- `lib/config.ts` - Configurações do frontend

## 💾 Backup e Restauração

O sistema possui funcionalidade completa de backup:

- **Exportar**: Gera arquivo JSON com todos os dados
- **Importar**: Restaura dados com opção de merge ou substituição
- **Dados inclusos**: Clientes, produtos, pedidos, recebimentos, configurações

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor:

1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

## 📞 Suporte

Para suporte e dúvidas, abra uma issue no GitHub.