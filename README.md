# ERP-BR - Sistema de Gestão Empresarial

Sistema ERP completo desenvolvido em Next.js com backend em Node.js, focado em gestão de vendas, clientes, produtos e relatórios financeiros.

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
- **Backend API**: http://localhost:8001

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