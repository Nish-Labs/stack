#!/usr/bin/env node
// One-step setup: node setup.js
// Installs dependencies, registers the `stk` command, installs the VS Code extension.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ui = require('./src/ui');
const { c } = ui;
const pkg = require('./package.json');

const win = process.platform === 'win32';
const run = (cmd, args) => spawnSync(cmd, args, { cwd: __dirname, encoding: 'utf8', shell: win });
const has = (cmd) => spawnSync(win ? 'where' : 'which', [cmd], { encoding: 'utf8' }).status === 0;

console.log(ui.banner(pkg.version));
console.log(`  ${c.bold('Setting up Stack')}\n`);

// 1. Node
const major = parseInt(process.versions.node, 10);
if (major < 18) { ui.error(`Node ${process.versions.node} is too old. Install Node 18 or newer from nodejs.org, then run this again.`); process.exit(1); }
ui.ok(`Node ${process.versions.node}`);

// 2. Dependencies
let sp = ui.spinner('Installing dependencies');
let r = run('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error']);
if (r.status !== 0) { sp.fail('Could not install dependencies'); console.log(c.dim((r.stderr || r.stdout || '').trim().split('\n').slice(-6).join('\n'))); process.exit(1); }
sp.succeed('Dependencies installed');

// 3. Global command
try {
  fs.chmodSync(path.join(__dirname, 'bin', 'stk.js'), 0o755);
  fs.chmodSync(path.join(__dirname, 'bin', 'stack.js'), 0o755);
} catch (e) { /* ignore on windows */ }
sp = ui.spinner('Registering stk and stack commands');
r = run('npm', ['link', '--loglevel=error']);
let linked = r.status === 0;
if (linked) sp.succeed('stk + stack commands registered');
else {
  sp.warn('Could not register stk/stack commands');
  console.log(c.dim(`\n    npm needs permission to write its global folder. Fix it once with:\n      npm config set prefix ~/.npm-global\n    add ~/.npm-global/bin to your PATH, then run node setup.js again.\n    Until then you can use: node ${path.join(__dirname, 'bin', 'stk.js')} <command>\n`));
}

// 4. VS Code extension
const vsix = fs.existsSync('vscode-ext') ? fs.readdirSync('vscode-ext').find((f) => f.endsWith('.vsix')) : null;
if (vsix && has('code')) {
  sp = ui.spinner('Installing the VS Code extension');
  r = run('code', ['--install-extension', path.join('vscode-ext', vsix), '--force']);
  r.status === 0 ? sp.succeed('VS Code extension installed') : sp.warn('VS Code extension not installed');
} else if (vsix) {
  ui.warn(`VS Code command not found. Install it later with: code --install-extension vscode-ext/${vsix}`);
}

// 5. Verify
const onPath = has('stk');
if (linked && !onPath) {
  const prefix = (run('npm', ['prefix', '-g']).stdout || '').trim();
  ui.warn(`stk is installed but your PATH does not include ${prefix}${win ? '' : '/bin'}. Add it, then open a new terminal.`);
}

console.log('\n' + ui.box([
  c.bold('Ready.') + ' Try it:',
  '',
  `${c.blue('stk dev site')}        ${c.dim('preview the Stack website')}`,
  `${c.blue('stack dev site')}      ${c.dim('same as stk (alias)')}`,
  `${c.blue('stk new my-site')}     ${c.dim('start your own project')}`,
  `${c.blue('stk update')}          ${c.dim('pull latest from GitHub')}`,
  `${c.blue('stk doctor')}          ${c.dim('check your setup')}`,
]) + '\n');