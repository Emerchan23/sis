# 🚀 Simulação de Nova Instalação - ERP-BR via GitHub + Portainer

## 📖 Visão Geral

Este conjunto de arquivos simula uma instalação completamente nova do sistema ERP-BR usando o repositório GitHub e deploy via Portainer. É ideal para:

- ✅ **Testar o processo de instalação** antes do deploy real
- ✅ **Treinar equipes** no processo de deploy
- ✅ **Validar configurações** em ambiente controlado
- ✅ **Documentar procedimentos** de instalação

---

## 📁 Arquivos da Simulação

### 📚 **Documentação**
- `SIMULACAO_INSTALACAO_GITHUB_PORTAINER.md` - Guia completo passo a passo
- `README_SIMULACAO_INSTALACAO.md` - Este arquivo (visão geral)

### 🔧 **Scripts de Automação**
- `install-portainer-simulation.sh` - Script para Linux/macOS
- `install-portainer-simulation.ps1` - Script para Windows PowerShell

### ⚙️ **Configurações**
- `docker-compose-stack.yml` - Configuração otimizada para Portainer Stack
- `.env.production` - Variáveis de ambiente (criado pelos scripts)

---

## 🎯 Cenários de Uso

### 🏢 **Cenário 1: Empresa Nova**
```
✅ Servidor limpo (Ubuntu/CentOS/Windows)
✅ Sem Docker instalado
✅ Primeira instalação do sistema
✅ Configuração completa do zero
```

### 🔄 **Cenário 2: Migração**
```
✅ Servidor existente
✅ Docker já instalado
✅ Portainer já configurado
✅ Substituição de sistema antigo
```

### 🧪 **Cenário 3: Ambiente de Teste**
```
✅ Máquina local/desenvolvimento
✅ Teste de funcionalidades
✅ Validação de configurações
✅ Treinamento de equipe
```

---

## 🚀 Como Usar

### 🐧 **Linux/macOS**

1. **Dar permissão de execução:**
   ```bash
   chmod +x install-portainer-simulation.sh
   ```

2. **Executar simulação:**
   ```bash
   ./install-portainer-simulation.sh
   ```

3. **Seguir instruções** do script interativo

### 🪟 **Windows**

1. **Abrir PowerShell como Administrador**

2. **Configurar política de execução (se necessário):**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **Executar simulação:**
   ```powershell
   .\install-portainer-simulation.ps1
   ```

4. **Seguir instruções** do script interativo

---

## 📋 Pré-requisitos

### 🔧 **Software Necessário**
- **Docker** (versão 20.10+)
- **Docker Compose** (versão 1.29+)
- **Git** (versão 2.0+)
- **curl** (para testes de conectividade)

### 💻 **Recursos do Sistema**
- **RAM**: Mínimo 2GB (Recomendado 4GB)
- **Disco**: Mínimo 10GB livres
- **CPU**: 2 cores (recomendado)
- **Rede**: Acesso à internet para download

### 🌐 **Portas Necessárias**
- **3145**: Sistema ERP-BR
- **9000**: Interface Portainer
- **8000**: Portainer Edge Agent (opcional)

---

## 🎬 Fluxo da Simulação

### **Fase 1: Verificação** ✅
- Verificar pré-requisitos instalados
- Testar conectividade Docker
- Validar portas disponíveis

### **Fase 2: Preparação** 🔧
- Criar diretórios de trabalho
- Configurar Portainer (se necessário)
- Clonar repositório GitHub

### **Fase 3: Validação** 🔍
- Verificar arquivos essenciais
- Preparar configurações
- Testar ambiente local (opcional)

### **Fase 4: Simulação** 🎭
- Mostrar comandos do Portainer
- Gerar relatório de instalação
- Fornecer próximos passos

---

## 📊 Relatórios Gerados

### 📄 **installation-report.txt**
Relatório completo contendo:
- ✅ Data e hora da simulação
- ✅ Informações do sistema
- ✅ Diretórios configurados
- ✅ URLs de acesso
- ✅ Próximos passos detalhados
- ✅ Comandos úteis
- ✅ Verificações realizadas

### 📋 **Checklist de Validação**
- [ ] Docker funcionando
- [ ] Portainer acessível
- [ ] Repositório clonado
- [ ] Arquivos essenciais presentes
- [ ] Portas disponíveis
- [ ] Configurações preparadas

---

## 🔗 URLs Importantes

### 🌐 **Acesso Local**
- **Portainer**: http://localhost:9000
- **ERP-BR**: http://localhost:3145 (após deploy)
- **API Health**: http://localhost:3145/api/health

### 📚 **Recursos Online**
- **Repositório**: https://github.com/Emerchan23/sis.git
- **Docker Hub**: https://hub.docker.com/
- **Portainer Docs**: https://docs.portainer.io/

---

## 🛠️ Comandos Úteis

### 🐳 **Docker**
```bash
# Ver containers rodando
docker ps

# Ver logs do sistema
docker logs erp-br-sistema

# Restart do container
docker restart erp-br-sistema

# Backup do banco
docker exec erp-br-sistema cp /app/data/erp.sqlite /app/data/backup-$(date +%Y%m%d).sqlite
```

### 📦 **Docker Compose**
```bash
# Subir sistema
docker-compose -f docker-compose-stack.yml up -d

# Ver logs
docker-compose -f docker-compose-stack.yml logs -f

# Parar sistema
docker-compose -f docker-compose-stack.yml down
```

### 🔍 **Diagnóstico**
```bash
# Testar conectividade
curl -f http://localhost:3145/api/health

# Ver uso de recursos
docker stats erp-br-sistema

# Verificar portas
netstat -tlnp | grep -E "(3145|9000)"
```

---

## 🚨 Troubleshooting

### ❌ **Problemas Comuns**

#### **Docker não encontrado**
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install docker.io

# CentOS/RHEL
sudo yum install docker

# Windows
# Instalar Docker Desktop
```

#### **Porta em uso**
```bash
# Verificar processo usando a porta
sudo netstat -tlnp | grep :3145

# Parar processo (se necessário)
sudo kill -9 PID
```

#### **Permissão negada**
```bash
# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
newgrp docker
```

#### **Container não inicia**
```bash
# Ver logs detalhados
docker logs --details erp-br-sistema

# Verificar recursos
docker system df
free -h
```

---

## 📞 Suporte

### 🆘 **Em caso de problemas:**
1. **Consultar logs** dos containers
2. **Verificar documentação** completa
3. **Executar comandos** de diagnóstico
4. **Criar issue** no GitHub se necessário

### 📧 **Recursos de Ajuda:**
- **GitHub Issues**: https://github.com/Emerchan23/sis/issues
- **Documentação**: Arquivos README no repositório
- **Logs do sistema**: Sempre incluir nos reports

---

## 🎉 Próximos Passos

Após executar a simulação com sucesso:

1. ✅ **Revisar relatório** gerado
2. ✅ **Acessar Portainer** e familiarizar-se
3. ✅ **Seguir guia completo** de instalação
4. ✅ **Fazer deploy real** via Portainer Stack
5. ✅ **Configurar sistema** para produção
6. ✅ **Treinar usuários** finais

---

## 📝 Notas Importantes

> ⚠️ **Esta é uma simulação** - nenhum sistema real é instalado automaticamente

> 🔒 **Segurança** - Configure senhas fortes e firewall em produção

> 💾 **Backup** - Configure rotinas de backup automático

> 📊 **Monitoramento** - Use o Portainer para acompanhar performance

---

**🚀 Boa sorte com sua instalação do ERP-BR!**

*Sistema desenvolvido com ❤️ para gestão empresarial eficiente*