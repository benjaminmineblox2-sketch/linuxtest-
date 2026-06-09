const readline = require('readline');
const path = require('path');
const fs = require('fs');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });

let pending = {};
let commands = new Map();

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

async function handleMessage(msg) {
  if (!msg || msg.type !== 'request') return;
  const { id, method, params } = msg;
  try {
    if (method === 'loadExtension') {
      const extPath = params.path;
      const mainFile = path.resolve(extPath, 'extension.js');
      if (!fs.existsSync(mainFile)) throw new Error('extension.js not found in ' + extPath);

      // sandbox: require in this process (PoC). Real product should sandbox.
      const ext = require(mainFile);
      if (typeof ext.activate === 'function') {
        const context = {
          registerCommand: (name, fn) => {
            commands.set(name, fn);
          },
          log: (message) => {
            send({ type: 'event', event: 'log', payload: String(message) });
          }
        };
        await ext.activate(context);
      }
      send({ type: 'response', id, result: { ok: true } });
    } else if (method === 'invokeCommand') {
      const { command, args } = params;
      const fn = commands.get(command);
      if (!fn) throw new Error('Command not found: ' + command);
      // execute command
      Promise.resolve()
        .then(() => fn(args))
        .then((res) => send({ type: 'response', id, result: { ok: true, return: res } }))
        .catch((err) => send({ type: 'response', id, error: String(err) }));
    } else {
      send({ type: 'response', id, error: 'Unknown method ' + method });
    }
  } catch (err) {
    send({ type: 'response', id, error: String(err) });
  }
}

rl.on('line', (line) => {
  try {
    const msg = JSON.parse(line);
    handleMessage(msg);
  } catch (err) {
    send({ type: 'event', event: 'error', payload: 'Invalid message: ' + String(err) });
  }
});

// heartbeat to show alive
setInterval(() => send({ type: 'event', event: 'heartbeat', payload: Date.now() }), 5000);
