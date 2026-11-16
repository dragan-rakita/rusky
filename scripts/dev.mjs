// Runs the API and the web app together; Ctrl+C stops both.
import { spawn } from 'node:child_process';

const run = (name, args) => {
  const child = spawn('yarn', args, { stdio: 'inherit' });
  child.on('exit', (code) => {
    if (code) console.error(`${name} exited with ${code}`);
  });
  return child;
};

const children = [
  run('api', ['workspace', '@rusky/api', 'run', 'dev']),
  run('web', ['workspace', '@rusky/web', 'run', 'dev']),
];

const stop = () => {
  for (const child of children) child.kill('SIGTERM');
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
