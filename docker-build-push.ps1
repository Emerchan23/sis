# Build e Push Docker - ERP-BR
# Usuario: emerchan2025

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BUILD E PUSH DOCKER - ERP-BR" -ForegroundColor Cyan
Write-Host "  Usuario: emerchan2025" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "[1/5] Verificando Docker..." -ForegroundColor Yellow
    $dockerVersion = docker --version
    Write-Host "Docker encontrado: $dockerVersion" -ForegroundColor Green
    
    Write-Host "[2/5] Fazendo build da imagem..." -ForegroundColor Yellow
    docker build -t erp-br .
    if ($LASTEXITCODE -ne 0) { throw "Falha no build da imagem" }
    Write-Host "Build concluido com sucesso!" -ForegroundColor Green
    
    Write-Host "[3/5] Criando tag para Docker Hub..." -ForegroundColor Yellow
    docker tag erp-br emerchan2025/erp-br:latest
    if ($LASTEXITCODE -ne 0) { throw "Falha ao criar tag" }
    Write-Host "Tag criada: emerchan2025/erp-br:latest" -ForegroundColor Green
    
    Write-Host "[4/5] Fazendo login no Docker Hub..." -ForegroundColor Yellow
    Write-Host "Por favor, insira suas credenciais do Docker Hub:" -ForegroundColor Cyan
    docker login
    if ($LASTEXITCODE -ne 0) { throw "Falha no login" }
    Write-Host "Login realizado com sucesso!" -ForegroundColor Green
    
    Write-Host "[5/5] Enviando imagem para Docker Hub..." -ForegroundColor Yellow
    docker push emerchan2025/erp-br:latest
    if ($LASTEXITCODE -ne 0) { throw "Falha no push" }
    
    Write-Host "" 
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  SUCESSO!" -ForegroundColor Green
    Write-Host "  Imagem disponivel em:" -ForegroundColor Green
    Write-Host "  docker pull emerchan2025/erp-br:latest" -ForegroundColor White
    Write-Host "========================================" -ForegroundColor Green
    
} catch {
    Write-Host "" 
    Write-Host "ERRO: $_" -ForegroundColor Red
    Write-Host "" 
    Write-Host "Verifique se:" -ForegroundColor Yellow
    Write-Host "1. Docker Desktop esta rodando" -ForegroundColor Yellow
    Write-Host "2. Voce tem acesso a internet" -ForegroundColor Yellow
    Write-Host "3. Suas credenciais do Docker Hub estao corretas" -ForegroundColor Yellow
    exit 1
}

Read-Host "Pressione Enter para continuar..."