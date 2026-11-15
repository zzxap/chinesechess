const {spawn} = require('node:child_process');
const path = require('node:path');

const cliPackagePath = require.resolve('@react-native-community/cli/package.json');
const cliPackage = require(cliPackagePath);
const cliBin = typeof cliPackage.bin === 'string'
  ? cliPackage.bin
  : cliPackage.bin['rnc-cli'];
const macOS = process.platform === 'darwin';
const child = spawn(process.execPath, [
  path.resolve(path.dirname(cliPackagePath), cliBin),
  'start',
  ...(!process.argv.slice(2).some(arg => arg === '--port' || arg.startsWith('--port='))
    ? ['--port', '16001'] : []),
  ...(macOS ? ['--config', 'metro.macos.config.js'] : []),
  ...process.argv.slice(2),
], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  env: {...process.env, ...(macOS ? {RN_PLATFORM: 'macos'} : {})},
});

child.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal === 'SIGINT' ? 130 : 1);
});
