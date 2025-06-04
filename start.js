const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function killProcessOnPort(port) {
  try {
    // On Linux/Mac
    const { stdout } = await execAsync(`lsof -i :${port} -t`);
    if (stdout.trim()) {
      console.log(`Processo encontrado na porta ${port}, matando...`);
      await execAsync(`kill -9 ${stdout.trim()}`);
      console.log('Processo morto com sucesso!');
    }
  } catch (error) {
    // Se não encontrar processo, ignora o erro
    if (!error.message.includes('no process')) {
      console.error('Erro ao verificar porta:', error);
    }
  }
}

async function start() {
  // Mata processos nas portas 3001 (backend) e 5173 (frontend)
  await killProcessOnPort(3001);
  await killProcessOnPort(5173);

  // Inicia o servidor
  console.log('Iniciando servidor...');
  exec('npm run dev', (error, stdout, stderr) => {
    if (error) {
      console.error(`Erro ao iniciar servidor: ${error}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  });
}

start(); 