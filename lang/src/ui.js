// Tiny terminal UI helpers: colors, gradient banner, spinner, boxes. No dependencies.
const os = require('os');
const tty = !!process.stdout.isTTY && !process.env.NO_COLOR && process.env.TERM !== 'dumb';
const wrap = (code) => (s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const c = {
  bold: wrap('1'), dim: wrap('2'), italic: wrap('3'),
  red: wrap('38;2;248;113;113'), green: wrap('38;2;74;222;128'), yellow: wrap('38;2;250;204;21'),
  blue: wrap('38;2;94;184;255'), violet: wrap('38;2;157;140;255'), gray: wrap('38;2;148;163;184'),
};
const strip = (s) => String(s).replace(/\x1b\[[0-9;]*m/g, '');
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const swatch = (h) => { const [r, g, b] = hex(h); return tty ? `\x1b[48;2;${r};${g};${b}m  \x1b[0m` : '  '; };

const FROM = [94, 184, 255], TO = [157, 140, 255];
function gradient(text, from = FROM, to = TO) {
  if (!tty) return text;
  const chars = [...text], n = Math.max(chars.length - 1, 1);
  return chars.map((ch, i) => {
    if (ch === ' ') return ch;
    const [r, g, b] = from.map((f, k) => Math.round(f + (to[k] - f) * (i / n)));
    return `\x1b[38;2;${r};${g};${b}m${ch}`;
  }).join('') + '\x1b[0m';
}

const L = {
  S: ['███████╗', '██╔════╝', '███████╗', '╚════██║', '███████║', '╚══════╝'],
  T: ['████████╗', '╚══██╔══╝', '   ██║   ', '   ██║   ', '   ██║   ', '   ╚═╝   '],
  A: [' █████╗ ', '██╔══██╗', '███████║', '██╔══██║', '██║  ██║', '╚═╝  ╚═╝'],
  C: [' ██████╗', '██╔════╝', '██║     ', '██║     ', '╚██████╗', ' ╚═════╝'],
  K: ['██╗  ██╗', '██║ ██╔╝', '█████╔╝ ', '██╔═██╗ ', '██║  ██╗', '╚═╝  ╚═╝'],
};
function banner(version) {
  const rows = [0, 1, 2, 3, 4, 5].map((i) => 'STACK'.split('').map((ch) => L[ch][i]).join(' '));
  return '\n' + rows.map((r) => '  ' + gradient(r)).join('\n') +
    `\n\n  ${c.gray('HTML, CSS, JS and Markdown in one file')}  ${c.dim('v' + version)}\n`;
}
const header = (version, label = '') => `\n  ${gradient('◆ stack')} ${c.dim('v' + version)}${label ? '  ' + c.gray(label) : ''}\n`;

const time = () => c.dim(new Date().toTimeString().slice(0, 8));
const ok = (m) => console.log(`  ${c.green('✔')} ${m}`);
const info = (m) => console.log(`  ${c.blue('➜')} ${m}`);
const warn = (m) => console.log(`  ${c.yellow('▲')} ${m}`);
const error = (m) => console.log(`  ${c.red('✖')} ${m}`);
const kv = (k, v) => console.log(`  ${c.blue('➜')}  ${c.bold(k.padEnd(9))} ${v}`);

function spinner(text) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0, t;
  const render = () => process.stdout.write(`\r\x1b[K  ${c.blue(frames[i = (i + 1) % frames.length])} ${text}`);
  if (tty) { t = setInterval(render, 80); render(); } else console.log(`  … ${text}`);
  const stop = (sym, msg) => { if (t) clearInterval(t); if (tty) process.stdout.write('\r\x1b[K'); console.log(`  ${sym} ${msg}`); };
  return {
    set: (s) => { text = s; },
    succeed: (m) => stop(c.green('✔'), m || text),
    fail: (m) => stop(c.red('✖'), m || text),
    warn: (m) => stop(c.yellow('▲'), m || text),
  };
}

function box(lines) {
  const w = Math.max(...lines.map((l) => strip(l).length));
  const pad = (l) => l + ' '.repeat(w - strip(l).length);
  return ['  ╭' + '─'.repeat(w + 2) + '╮', ...lines.map((l) => `  │ ${pad(l)} │`), '  ╰' + '─'.repeat(w + 2) + '╯'].join('\n');
}

const bytes = (n) => (n < 1024 ? n + ' B' : (n / 1024).toFixed(1) + ' kB');
function networkIP() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) if (i.family === 'IPv4' && !i.internal) return i.address;
  }
  return null;
}

module.exports = { c, tty, strip, swatch, gradient, banner, header, time, ok, info, warn, error, kv, spinner, box, bytes, networkIP };
