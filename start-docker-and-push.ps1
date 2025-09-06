# Script para iniciar Docker Desktop e fazer push para Docker Hub
# Autor: Sistema ERP-BR
# Usuario: emerchan2025

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INICIAR DOCKER E ENVIAR PARA HUB" -ForegroundColor Cyan
Write-Host "  Usuario: emerchan2025" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Função para verificar se Docker Desktop está rodando
function Test-DockerRunning {
    try {
        docker info > $null 2>&1
        return $?
    } catch {
        return $false
    }
}

# Função para iniciar Docker Desktop
function Start-DockerDesktop {
    Write-Host "[1/6] Iniciando Docker Desktop..." -ForegroundColor Yellow
    
    # Procurar pelo executável do Docker Desktop
    $dockerPaths = @(
        "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe",
        "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe",
        "${env:LOCALAPPDATA}\Docker\Docker Desktop.exe"
    )
    
    $dockerExe = $null
    foreach ($path in $dockerPaths) {
        if (Test-Path $path) {
            $dockerExe = $path
            break
        }
    }
    
    if ($dockerExe) {
        Write-Host "Encontrado Docker Desktop em: $dockerExe" -ForegroundColor Green
        Start-Process -FilePath $dockerExe -WindowStyle Hidden
        Write-Host "Docker Desktop iniciado. Aguardando inicialização..." -ForegroundColor Yellow
        
        # Aguardar até Docker estar rodando (máximo 2 minutos)
        $timeout = 120
        $elapsed = 0
        
        while (-not (Test-DockerRunning) -and $elapsed -lt $timeout) {
            Start-Sleep -Seconds 5
            $elapsed += 5
            Write-Host "Aguardando Docker Desktop... ($elapsed/$timeout segundos)" -ForegroundColor Yellow
        }
        
        if (Test-DockerRunning) {
            Write-Host "Docker Desktop está rodando!" -ForegroundColor Green
            return $true
        } else {
            Write-Host "TIMEOUT: Docker Desktop não iniciou em $timeout segundos" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "ERRO: Docker Desktop não encontrado" -ForegroundColor Red
        Write-Host "Instale o Docker Desktop em: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
        return $false
    }
}

# Verificar se Docker já está rodando
Write-Host "[1/6] Verificando Docker..." -ForegroundColor Yellow
if (Test-DockerRunning) {
    Write-Host "Docker já está rodando!" -ForegroundColor Green
} else {
    Write-Host "Docker não está rodando. Tentando iniciar..." -ForegroundColor Yellow
    if (-not (Start-DockerDesktop)) {
        Write-Host "ERRO: Não foi possível iniciar o Docker Desktop" -ForegroundColor Red
        Write-Host "Por favor, inicie manualmente o Docker Desktop e tente novamente" -ForegroundColor Yellow
        exit 1
    }
}

# Verificar versão do Docker
try {
    $dockerVersion = docker --version
    Write-Host "Docker encontrado: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "ERRO: Docker não está instalado ou não está no PATH" -ForegroundColor Red
    exit 1
}

# Build da imagem
Write-Host "[2/6] Fazendo build da imagem..." -ForegroundColor Yellow
try {
    docker build -t erp-br .
    if ($LASTEXITCODE -ne 0) {
        throw "Build falhou"
    }
    Write-Host "Build concluído com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "ERRO: Falha no build da imagem" -ForegroundColor Red
    Write-Host "Verifique o Dockerfile e tente novamente" -ForegroundColor Yellow
    exit 1
}

# Tag da imagem
Write-Host "[3/6] Criando tag para emerchan2025/erp-br..." -ForegroundColor Yellow
try {
    docker tag erp-br emerchan2025/erp-br:latest
    if ($LASTEXITCODE -ne 0) {
        throw "Tag falhou"
    }
    Write-Host "Tag criada com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "ERRO: Falha ao criar tag" -ForegroundColor Red
    exit 1
}

# Login no Docker Hub
Write-Host "[4/6] Fazendo login no Docker Hub..." -ForegroundColor Yellow
Write-Host "Digite suas credenciais do Docker Hub:" -ForegroundColor Cyan
try {
    docker login
    if ($LASTEXITCODE -ne 0) {
        throw "Login falhou"
    }
    Write-Host "Login realizado com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "ERRO: Falha no login do Docker Hub" -ForegroundColor Red
    Write-Host "Verifique suas credenciais e tente novamente" -ForegroundColor Yellow
    exit 1
}

# Push da imagem
Write-Host "[5/6] Enviando imagem para Docker Hub..." -ForegroundColor Yellow
try {
    docker push emerchan2025/erp-br:latest
    if ($LASTEXITCODE -ne 0) {
        throw "Push falhou"
    }
    Write-Host "Imagem enviada com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "ERRO: Falha no envio da imagem" -ForegroundColor Red
    Write-Host "Verifique sua conexão e credenciais" -ForegroundColor Yellow
    exit 1
}

# Verificação final
Write-Host "[6/6] Verificação final..." -ForegroundColor Yellow
try {
    docker images emerchan2025/erp-br
    Write-Host "" 
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  SUCESSO! IMAGEM ENVIADA" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "" 
    Write-Host "Sua imagem está disponível em:" -ForegroundColor Cyan
    Write-Host "https://hub.docker.com/r/emerchan2025/erp-br" -ForegroundColor Yellow
    Write-Host "" 
    Write-Host "Para usar a imagem:" -ForegroundColor Cyan
    Write-Host "docker pull emerchan2025/erp-br:latest" -ForegroundColor Yellow
    Write-Host "docker run -p 3145:3145 emerchan2025/erp-br:latest" -ForegroundColor Yellow
    Write-Host "" 
} catch {
    Write-Host "AVISO: Não foi possível verificar a imagem local" -ForegroundColor Yellow
}

Write-Host "Processo concluído!" -ForegroundColor Green
Write-Host "Pressione qualquer tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")