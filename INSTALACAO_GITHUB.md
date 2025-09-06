# 📦 Guia de Instalação - Sistema ERP-BR

## 🚀 Instalação via GitHub

### Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** (versão 18 ou superior)
- **npm** ou **yarn**
- **Git**

### 📋 Passo a Passo

#### 1. Clone o Repositório

```bash
git clone https://github.com/Emerchan23/sis.git
cd sis
```

#### 2. Instale as Dependências

```bash
npm install
```

ou se preferir usar yarn:

```bash
yarn install
```

#### 3. Configure o Ambiente

O sistema está configurado para funcionar em modo de desenvolvimento. Não são necessárias configurações adicionais.

#### 4. Inicie o Sistema

```bash
npm run dev
```

ou com yarn:

```bash
yarn dev
```

#### 5. Acesse o Sistema

Após iniciar, o sistema estará disponível em:

```
http://localhost:3000
```

*Nota: A porta pode variar. Verifique a saída do terminal para a porta exata.*

---

## 🛠️ Comandos Disponíveis

| Comando | Descrição |
|---------|----------|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera build de produção |
| `npm run start` | Inicia servidor de produção |
| `npm run lint` | Executa verificação de código |

---

## 📁 Estrutura do Projeto

```
erp-br/
├── app/                 # Páginas e rotas da aplicação
├── components/          # Componentes reutilizáveis
├── lib/                 # Utilitários e configurações
├── public/              # Arquivos estáticos
├── styles/              # Estilos globais
└── package.json         # Dependências e scripts
```

---

## 🔧 Tecnologias Utilizadas

- **Next.js 15** - Framework React
- **TypeScript** - Linguagem de programação
- **Tailwind CSS v4** - Framework CSS
- **Shadcn/ui** - Biblioteca de componentes
- **React Hook Form** - Gerenciamento de formulários
- **Recharts** - Gráficos e visualizações

---

## 📞 Suporte

Em caso de problemas durante a instalação:

1. Verifique se todas as dependências estão instaladas
2. Certifique-se de estar usando Node.js versão 18+
3. Limpe o cache do npm: `npm cache clean --force`
4. Delete `node_modules` e `package-lock.json`, depois execute `npm install` novamente

---

## 🎯 Funcionalidades Principais

- ✅ Gestão de Vendas
- ✅ Controle de Clientes
- ✅ Orçamentos
- ✅ Produtos e Estoque
- ✅ Relatórios
- ✅ Dashboard Analítico
- ✅ Sistema de Acertos
- ✅ Controle de Vales

---

**Sistema ERP-BR** - Gestão Completa para seu Negócio 🚀