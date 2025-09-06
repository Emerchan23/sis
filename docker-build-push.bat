@echo off
echo ========================================
echo  BUILD E PUSH DOCKER - ERP-BR
echo  Usuario: emerchan2025
echo ========================================
echo.

echo [1/5] Verificando Docker...
docker --version
if %errorlevel% neq 0 (
    echo ERRO: Docker nao encontrado!
    pause
    exit /b 1
)

echo [2/5] Fazendo build da imagem...
docker build -t erp-br .
if %errorlevel% neq 0 (
    echo ERRO: Falha no build da imagem!
    pause
    exit /b 1
)

echo [3/5] Criando tag para Docker Hub...
docker tag erp-br emerchan2025/erp-br:latest
if %errorlevel% neq 0 (
    echo ERRO: Falha ao criar tag!
    pause
    exit /b 1
)

echo [4/5] Fazendo login no Docker Hub...
echo Por favor, insira suas credenciais do Docker Hub:
docker login
if %errorlevel% neq 0 (
    echo ERRO: Falha no login!
    pause
    exit /b 1
)

echo [5/5] Enviando imagem para Docker Hub...
docker push emerchan2025/erp-br:latest
if %errorlevel% neq 0 (
    echo ERRO: Falha no push!
    pause
    exit /b 1
)

echo.
echo ========================================
echo  SUCESSO!
echo  Imagem disponivel em:
echo  docker pull emerchan2025/erp-br:latest
echo ========================================
pause