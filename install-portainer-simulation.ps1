# 🚀 Script de Simulação: Instalação ERP-BR via GitHub + Portainer (Windows)
# Autor: Sistema ERP-BR
# Versão: 1.0
# Data: $(Get-Date -Format "yyyy-MM-dd")

# Configurar política de execução (se necessário)
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Cores para output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Cyan"
$White = "White"

# Funções de log
function Write-Log {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" -ForegroundColor $Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[AVISO] $Message" -ForegroundColor $Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[ERRO] $Message" -ForegroundColor $Red
    exit 1
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Blue
}

# Banner
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor $Blue
Write-Host "🚀 SIMULAÇÃO: INSTALAÇÃO ERP-BR VIA GITHUB + PORTAINER (WINDOWS)" -ForegroundColor $Blue
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor $Blue

# Verificar se está executando como administrador
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if ($currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warn "Executando como Administrador. Recomendado executar como usuário normal."
}

# FASE 1: Verificar pré-requisitos
Write-Log "FASE 1: Verificando pré-requisitos..."

# Verificar Docker
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Log "Docker encontrado: $dockerVersion"
    } else {
        Write-Error-Custom "Docker não encontrado! Instale o Docker Desktop primeiro."
    }
} catch {
    Write-Error-Custom "Docker não encontrado! Instale o Docker Desktop primeiro."
}

# Verificar Docker Compose
try {
    $composeVersion = docker-compose --version 2>$null
    if ($composeVersion) {
        Write-Log "Docker Compose encontrado: $composeVersion"
    } else {
        Write-Error-Custom "Docker Compose não encontrado!"
    }
} catch {
    Write-Error-Custom "Docker Compose não encontrado!"
}

# Verificar Git
try {
    $gitVersion = git --version 2>$null
    if ($gitVersion) {
        Write-Log "Git encontrado: $gitVersion"
    } else {
        Write-Error-Custom "Git não encontrado! Instale o Git primeiro."
    }
} catch {
    Write-Error-Custom "Git não encontrado! Instale o Git primeiro."
}

# Verificar PowerShell version
$psVersion = $PSVersionTable.PSVersion
Write-Log "PowerShell versão: $psVersion"

# FASE 2: Configurar diretórios
Write-Log "FASE 2: Configurando diretórios..."

$WorkDir = "$env:USERPROFILE\erp-br-deploy"
$DataDir = "$WorkDir\data"
$BackupDir = "$WorkDir\backups"

# Criar diretórios se não existirem
if (!(Test-Path $WorkDir)) { New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null }
if (!(Test-Path $DataDir)) { New-Item -ItemType Directory -Path $DataDir -Force | Out-Null }
if (!(Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null }

Write-Log "Diretório de trabalho: $WorkDir"
Write-Log "Diretório de dados: $DataDir"
Write-Log "Diretório de backups: $BackupDir"

# FASE 3: Verificar Portainer
Write-Log "FASE 3: Verificando Portainer..."

$portainerRunning = docker ps --format "table {{.Names}}" | Select-String "portainer"

if ($portainerRunning) {
    Write-Log "Portainer já está rodando ✓"
    $PortainerUrl = "http://localhost:9000"
} else {
    Write-Warn "Portainer não encontrado. Instalando..."
    
    # Criar volume do Portainer
    docker volume create portainer_data
    
    # Instalar Portainer
    docker run -d -p 8000:8000 -p 9000:9000 `
        --name portainer --restart=always `
        -v /var/run/docker.sock:/var/run/docker.sock `
        -v portainer_data:/data `
        portainer/portainer-ce:latest
    
    Write-Log "Portainer instalado com sucesso!"
    $PortainerUrl = "http://localhost:9000"
    
    Write-Info "Aguarde 30 segundos para o Portainer inicializar..."
    Start-Sleep -Seconds 30
}

# FASE 4: Clone do repositório
Write-Log "FASE 4: Clonando repositório..."

Set-Location $WorkDir

if (Test-Path "sis") {
    Write-Warn "Repositório já existe. Atualizando..."
    Set-Location "sis"
    git pull origin main
} else {
    Write-Log "Clonando repositório do GitHub..."
    git clone https://github.com/Emerchan23/sis.git
    Set-Location "sis"
}

Write-Log "Repositório clonado/atualizado com sucesso ✓"

# FASE 5: Verificar arquivos essenciais
Write-Log "FASE 5: Verificando arquivos essenciais..."

$EssentialFiles = @(
    "docker-compose-stack.yml",
    "Dockerfile",
    "package.json",
    "start-dev.js"
)

foreach ($file in $EssentialFiles) {
    if (Test-Path $file) {
        Write-Log "✓ $file encontrado"
    } else {
        Write-Error-Custom "✗ $file não encontrado!"
    }
}

# FASE 6: Preparar configuração
Write-Log "FASE 6: Preparando configuração..."

# Criar arquivo .env para produção
$envContent = @"
NODE_ENV=production
PORT=3145
DB_PATH=/app/data/erp.sqlite
NEXT_PUBLIC_API_URL=http://localhost:3145
"@

$envContent | Out-File -FilePath ".env.production" -Encoding UTF8
Write-Log "Arquivo .env.production criado ✓"

# FASE 7: Verificar portas disponíveis
Write-Log "FASE 7: Verificando portas..."

function Test-Port {
    param([int]$Port)
    $connection = Test-NetConnection -ComputerName "localhost" -Port $Port -WarningAction SilentlyContinue
    return $connection.TcpTestSucceeded
}

if (Test-Port -Port 3145) {
    Write-Warn "Porta 3145 já está em uso"
} else {
    Write-Log "Porta 3145 disponível ✓"
}

if (Test-Port -Port 9000) {
    Write-Warn "Porta 9000 já está em uso"
} else {
    Write-Log "Porta 9000 disponível ✓"
}

# FASE 8: Simular deploy
Write-Log "FASE 8: Simulando deploy..."

Write-Info "Comandos que seriam executados no Portainer:"
Write-Host "1. Acessar: $PortainerUrl" -ForegroundColor $Yellow
Write-Host "2. Login com credenciais de admin" -ForegroundColor $Yellow
Write-Host "3. Stacks → Add stack" -ForegroundColor $Yellow
Write-Host "4. Nome: erp-br-sistema" -ForegroundColor $Yellow
Write-Host "5. Repository: https://github.com/Emerchan23/sis.git" -ForegroundColor $Yellow
Write-Host "6. Compose file: docker-compose-stack.yml" -ForegroundColor $Yellow
Write-Host "7. Environment variables:" -ForegroundColor $Yellow
Write-Host "   - NODE_ENV=production" -ForegroundColor $Yellow
Write-Host "   - PORT=3145" -ForegroundColor $Yellow
Write-Host "   - DB_PATH=/app/data/erp.sqlite" -ForegroundColor $Yellow
Write-Host "8. Deploy stack" -ForegroundColor $Yellow

# FASE 9: Teste local (opcional)
$response = Read-Host "Deseja fazer um teste local com docker-compose? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    Write-Log "FASE 9: Executando teste local..."
    
    # Usar docker-compose-stack.yml se existir, senão docker-compose.yml
    if (Test-Path "docker-compose-stack.yml") {
        $ComposeFile = "docker-compose-stack.yml"
    } else {
        $ComposeFile = "docker-compose.yml"
    }
    
    Write-Log "Usando arquivo: $ComposeFile"
    
    # Build e start
    docker-compose -f $ComposeFile up -d --build
    
    Write-Log "Aguardando sistema inicializar..."
    Start-Sleep -Seconds 30
    
    # Teste de saúde
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3145/api/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Log "✅ Sistema está respondendo corretamente!"
            Write-Info "Acesse: http://localhost:3145"
        }
    } catch {
        Write-Warn "Sistema pode não estar totalmente inicializado ainda"
        Write-Info "Verifique os logs: docker-compose -f $ComposeFile logs"
    }
    
    Read-Host "Pressione Enter para parar o teste local..."
    docker-compose -f $ComposeFile down
} else {
    Write-Log "Teste local pulado."
}

# FASE 10: Relatório final
Write-Log "FASE 10: Gerando relatório..."

$ReportFile = "$WorkDir\installation-report.txt"

$reportContent = @"
═══════════════════════════════════════════════════════════════
🚀 RELATÓRIO DE SIMULAÇÃO - ERP-BR VIA GITHUB + PORTAINER
═══════════════════════════════════════════════════════════════

Data: $(Get-Date)
Usuário: $env:USERNAME
Computador: $env:COMPUTERNAME
Sistema: $((Get-WmiObject Win32_OperatingSystem).Caption)

📁 DIRETÓRIOS:
- Trabalho: $WorkDir
- Dados: $DataDir
- Backups: $BackupDir

🔗 URLs:
- Portainer: $PortainerUrl
- Sistema ERP-BR: http://localhost:3145 (após deploy)
- Repositório: https://github.com/Emerchan23/sis.git

📋 PRÓXIMOS PASSOS:
1. Acessar Portainer em: $PortainerUrl
2. Criar/configurar usuário admin (se primeira vez)
3. Criar nova Stack com nome: erp-br-sistema
4. Configurar repositório: https://github.com/Emerchan23/sis.git
5. Usar arquivo: docker-compose-stack.yml
6. Definir variáveis de ambiente:
   - NODE_ENV=production
   - PORT=3145
   - DB_PATH=/app/data/erp.sqlite
7. Fazer deploy da stack
8. Aguardar build e inicialização
9. Acessar sistema em: http://localhost:3145
10. Configurar primeira empresa e usuário

🛠️ COMANDOS ÚTEIS (PowerShell):
- Ver logs: docker logs erp-br-sistema
- Restart: docker restart erp-br-sistema
- Backup: docker exec erp-br-sistema cp /app/data/erp.sqlite /app/data/backup-`$(Get-Date -Format "yyyyMMdd").sqlite

✅ VERIFICAÇÕES REALIZADAS:
- Docker instalado e funcionando
- Docker Compose disponível
- Git instalado
- Portainer instalado/verificado
- Repositório clonado
- Arquivos essenciais verificados
- Portas verificadas
- Configuração preparada

═══════════════════════════════════════════════════════════════
"@

$reportContent | Out-File -FilePath $ReportFile -Encoding UTF8
Write-Log "Relatório salvo em: $ReportFile"

# Mostrar resumo
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor $Green
Write-Host "✅ SIMULAÇÃO CONCLUÍDA COM SUCESSO!" -ForegroundColor $Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor $Green

Write-Info "Próximos passos:"
Write-Host "1. 🌐 Acesse o Portainer: $PortainerUrl" -ForegroundColor $White
Write-Host "2. 📚 Consulte o guia: SIMULACAO_INSTALACAO_GITHUB_PORTAINER.md" -ForegroundColor $White
Write-Host "3. 📄 Veja o relatório: $ReportFile" -ForegroundColor $White
Write-Host "4. 🚀 Faça o deploy via Portainer Stack" -ForegroundColor $White

Write-Host "`nObrigado por usar o sistema ERP-BR! 🎉" -ForegroundColor $Blue

# Abrir Portainer no navegador (opcional)
$openBrowser = Read-Host "Deseja abrir o Portainer no navegador? (y/n)"
if ($openBrowser -eq "y" -or $openBrowser -eq "Y") {
    Start-Process $PortainerUrl
}

Write-Host "Pressione qualquer tecla para sair..." -ForegroundColor $Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")