#!/usr/bin/env node

/**
 * Script de Instalação Automática do Sistema ERP
 * Instala todas as dependências e configura o ambiente automaticamente
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function checkCommand(command) {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function installNode() {
  const platform = os.platform();
  
  if (checkCommand('node')) {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
    
    if (majorVersion >= 18) {
      logSuccess(`Node.js ${nodeVersion} já está instalado`);
      return;
    } else {
      logWarning(`Node.js ${nodeVersion} encontrado, mas versão 18+ é recomendada`);
    }
  }
  
  logStep('1', 'Instalando Node.js...');
  
  switch (platform) {
    case 'win32':
      log('Por favor, baixe e instale Node.js 18+ de: https://nodejs.org/', 'yellow');
      log('Após a instalação, execute este script novamente.', 'yellow');
      process.exit(1);
      break;
      
    case 'darwin':
      if (checkCommand('brew')) {
        execSync('brew install node@18', { stdio: 'inherit' });
      } else {
        log('Por favor, instale Homebrew primeiro: https://brew.sh/', 'yellow');
        process.exit(1);
      }
      break;
      
    case 'linux':
      try {
        // Tentar instalar via NodeSource
        execSync('curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -', { stdio: 'inherit' });
        execSync('sudo apt-get install -y nodejs', { stdio: 'inherit' });
      } catch {
        log('Erro ao instalar Node.js. Por favor, instale manualmente.', 'red');
        process.exit(1);
      }
      break;
      
    default:
      log('Sistema operacional não suportado para instalação automática.', 'red');
      log('Por favor, instale Node.js 18+ manualmente.', 'yellow');
      process.exit(1);
  }
  
  logSuccess('Node.js instalado com sucesso!');
}

function installDocker() {
  if (checkCommand('docker')) {
    logSuccess('Docker já está instalado');
    return;
  }
  
  logStep('2', 'Instalando Docker...');
  const platform = os.platform();
  
  switch (platform) {
    case 'win32':
      log('Por favor, baixe e instale Docker Desktop de: https://www.docker.com/products/docker-desktop/', 'yellow');
      log('Após a instalação, execute este script novamente.', 'yellow');
      process.exit(1);
      break;
      
    case 'darwin':
      log('Por favor, baixe e instale Docker Desktop de: https://www.docker.com/products/docker-desktop/', 'yellow');
      process.exit(1);
      break;
      
    case 'linux':
      try {
        execSync('curl -fsSL https://get.docker.com -o get-docker.sh', { stdio: 'inherit' });
        execSync('sh get-docker.sh', { stdio: 'inherit' });
        execSync('sudo usermod -aG docker $USER', { stdio: 'inherit' });
        execSync('rm get-docker.sh', { stdio: 'ignore' });
      } catch {
        log('Erro ao instalar Docker. Por favor, instale manualmente.', 'red');
        process.exit(1);
      }
      break;
  }
  
  logSuccess('Docker instalado com sucesso!');
}

function setupEnvironment() {
  logStep('3', 'Configurando ambiente...');
  
  // Criar diretório de dados se não existir
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    logSuccess('Diretório de dados criado');
  }
  
  // Verificar se .env existe, se não, criar um básico
  const envFile = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envFile)) {
    const envContent = `# Configurações do Sistema ERP
NEXT_PUBLIC_API_URL=http://localhost:3145
DB_PATH=./data/erp.sqlite
NODE_ENV=development
`;
    fs.writeFileSync(envFile, envContent);
    logSuccess('Arquivo .env.local criado');
  }
  
  logSuccess('Ambiente configurado!');
}

function installDependencies() {
  logStep('4', 'Instalando dependências do projeto...');
  
  try {
    log('Instalando dependências npm...', 'blue');
    execSync('npm install', { stdio: 'inherit' });
    logSuccess('Dependências instaladas com sucesso!');
  } catch (error) {
    logError('Erro ao instalar dependências');
    console.error(error.message);
    process.exit(1);
  }
}

function buildProject() {
  logStep('5', 'Construindo o projeto...');
  
  try {
    log('Executando build...', 'blue');
    execSync('npm run build', { stdio: 'inherit' });
    logSuccess('Projeto construído com sucesso!');
  } catch (error) {
    logError('Erro ao construir o projeto');
    console.error(error.message);
    process.exit(1);
  }
}

function createStartScript() {
  logStep('6', 'Criando scripts de inicialização...');
  
  // Script para desenvolvimento
  const startDevScript = `#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando servidor de desenvolvimento...');

const child = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  cwd: __dirname
});

child.on('close', (code) => {
  console.log(\`Servidor finalizado com código \${code}\`);
});

process.on('SIGINT', () => {
  child.kill('SIGINT');
});
`;
  
  fs.writeFileSync(path.join(process.cwd(), 'start-dev.js'), startDevScript);
  
  // Script para produção com Docker
  const startProdScript = `#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🐳 Iniciando servidor em produção com Docker...');

const child = spawn('docker-compose', ['up', '--build'], {
  stdio: 'inherit',
  cwd: __dirname
});

child.on('close', (code) => {
  console.log(\`Docker finalizado com código \${code}\`);
});

process.on('SIGINT', () => {
  spawn('docker-compose', ['down'], { stdio: 'inherit', cwd: __dirname });
  child.kill('SIGINT');
});
`;
  
  fs.writeFileSync(path.join(process.cwd(), 'start-prod.js'), startProdScript);
  
  logSuccess('Scripts de inicialização criados!');
}

function showCompletionMessage() {
  log('\n' + '='.repeat(60), 'green');
  log('🎉 INSTALAÇÃO CONCLUÍDA COM SUCESSO! 🎉', 'green');
  log('='.repeat(60), 'green');
  
  log('\n📋 Como usar o sistema:', 'cyan');
  log('\n• Para desenvolvimento:', 'yellow');
  log('  node start-dev.js', 'bright');
  log('  ou: npm run dev', 'bright');
  
  log('\n• Para produção:', 'yellow');
  log('  node start-prod.js', 'bright');
  log('  ou: docker-compose up --build', 'bright');
  
  log('\n🌐 Acesse o sistema em:', 'cyan');
  log('  http://localhost:3145 (desenvolvimento)', 'bright');
  log('  http://localhost:4523 (produção)', 'bright');
  
  log('\n📁 Banco de dados:', 'cyan');
  log('  Localizado em: ./data/erp.sqlite', 'bright');
  log('  (Fora do container Docker)', 'bright');
  
  log('\n✨ Sistema pronto para uso!', 'magenta');
}

async function main() {
  log('🚀 Iniciando instalação automática do Sistema ERP', 'bright');
  log('Este processo irá instalar todas as dependências necessárias\n', 'blue');
  
  try {
    installNode();
    installDocker();
    setupEnvironment();
    installDependencies();
    buildProject();
    createStartScript();
    showCompletionMessage();
  } catch (error) {
    logError('Erro durante a instalação:');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };