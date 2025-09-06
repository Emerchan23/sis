#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando servidor de desenvolvimento...');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

const child = spawn(npmCmd, ['run', 'dev'], {
  stdio: 'inherit',
  cwd: __dirname,
  shell: isWindows
});

child.on('close', (code) => {
  console.log(`Servidor finalizado com código ${code}`);
});

process.on('SIGINT', () => {
  child.kill('SIGINT');
});
