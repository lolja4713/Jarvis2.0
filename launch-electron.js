const { spawn } = require('child_process');

const electronPath = require('electron');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, ['.', ...process.argv.slice(2)], { stdio: 'inherit', env });
child.on('error', error => {
  console.error(`No se pudo iniciar Electron: ${error.message}`);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  process.exitCode = signal ? 1 : (code ?? 0);
});
