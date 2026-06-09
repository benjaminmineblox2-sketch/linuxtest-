const { spawn } = require('child_process');
const path = require('path');

const sampleExt = path.resolve(__dirname, '..', 'sample-extension');
const isHostMode = process.argv.includes('--extension-host');

if (isHostMode) {
  require(path.resolve(__dirname, '..', 'extension-host', 'index.js'));
  return;
}

function startHost() {
  const hostArgs = process.execPath.toLowerCase().endsWith('node.exe') || process.execPath.toLowerCase().endsWith('node')
    ? [__filename, '--extension-host']
    : ['--extension-host'];

  const child = spawn(process.execPath, hostArgs, { stdio: ['pipe', 'pipe', 'inherit'] });

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    // chunk may contain multiple lines
    for (const line of chunk.split(/\r?\n/).filter(Boolean)) {
      try {
        const msg = JSON.parse(line);
        handleHostMessage(msg);
      } catch (err) {
        console.error('Invalid json from host:', line);
      }
    }
  });

  return child;
}

let seq = 1;
const pending = new Map();

function sendRequest(child, method, params) {
  const id = seq++;
  const req = { type: 'request', id, method, params };
  pending.set(id, req);
  child.stdin.write(JSON.stringify(req) + '\n');
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
}

function handleHostMessage(msg) {
  if (!msg) return;
  if (msg.type === 'response' && msg.id) {
    const p = pending.get(msg.id);
    if (p) {
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error)); else p.resolve(msg.result);
    }
  } else if (msg.type === 'event') {
    console.log('[host event]', msg.event, msg.payload);
  }
}

async function main() {
  console.log('Starting extension host...');
  const host = startHost();

  try {
    console.log('Loading sample extension from', sampleExt);
    const res = await sendRequest(host, 'loadExtension', { path: sampleExt });
    console.log('loadExtension result:', res);

    console.log('Invoking sample.hello command...');
    const r2 = await sendRequest(host, 'invokeCommand', { command: 'sample.hello', args: { who: 'Fernanda' } });
    console.log('invokeCommand result:', r2);
  } catch (err) {
    console.error('Error during host interaction:', err);
  }

  console.log('Demo finished. The process will remain open until you close it or press Ctrl+C.');
  console.log('If you want, type a command name and press Enter (for future implementation).');
  process.stdin.resume();

  const cleanup = () => {
    console.log('\nShutting down...');
    host.kill();
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main();
