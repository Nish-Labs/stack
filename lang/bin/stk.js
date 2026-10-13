#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const zlib = require('zlib');
const { spawnSync, spawn } = require('child_process');
const { program } = require('commander');
const ui = require('../src/ui');
const { c } = ui;
const pkg = require('../package.json');
const { compile } = require('../src/compile');
const { routes } = require('../src/routes');
const { loadThemes } = require('../src/themes');

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml' };
const rel = (f) => path.relative(process.cwd(), f) || '.';
const fail = (m) => { ui.error(m); process.exit(1); };

function resolveInput(input) {
  if (input) {
    if (!fs.existsSync(input)) fail(`Cannot find "${input}". Pass a .stk file or a folder of .stk files.`);
    return input;
  }
  const found = ['pages', 'site'].find((p) => fs.existsSync(p) && fs.statSync(p).isDirectory());
  if (found) return found;
  if (fs.existsSync('index.stk')) return '.';
  fail('No input found. Run "stk new my-site" to create a project, or pass a .stk file.');
}

function walkFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkFiles(p)); else out.push(p);
  }
  return out.sort();
}

const cliName = path.basename(process.argv[1] || '') === 'stack' ? 'stack' : 'stk';
program
  .name(cliName)
  .description('Stack: HTML, CSS, JS and Markdown in one .stk file')
  .version(pkg.version, '-v, --version', 'print version')
  .configureOutput({
    writeOut: (str) => {
      if (String(str).trim() === pkg.version) {
        process.stdout.write(`  ${ui.gradient('◆ stack')} ${c.dim('v' + pkg.version)}\n`);
      } else {
        process.stdout.write(str);
      }
    },
  })
  .addHelpText('beforeAll', ui.banner(pkg.version));

// ---------------------------------------------------------------- dev
program.command('dev [input]')
  .description('start a dev server with live reload')
  .option('-p, --port <port>', 'port to listen on', process.env.PORT || '3000')
  .option('-o, --open', 'open the browser')
  .action((input, opts) => {
    input = resolveInput(input);
    console.log(ui.header(pkg.version, 'dev server'));
    const publicDir = path.resolve('public');
    const clients = new Set();
    const NO_CACHE = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    };
    let table = routes(input);
    const RELOAD = '<script>(function(){var es=new EventSource("/__reload");es.onmessage=function(){location.reload()}})()</script>';
    const purgeSrc = () => {
      for (const k of Object.keys(require.cache)) {
        if (k.includes(path.sep + 'src' + path.sep) || k.endsWith(path.sep + 'src')) delete require.cache[k];
      }
    };
    const build = (r) => {
      purgeSrc();
      const { compile } = require('../src/compile');
      const warnings = [];
      const html = compile(fs.readFileSync(r.src, 'utf8'), { warnings });
      return { html, warnings };
    };

    const sp = ui.spinner('Compiling pages');
    const t0 = Date.now();
    try { table.forEach(build); sp.succeed(`Compiled ${table.length} page${table.length === 1 ? '' : 's'} ${c.dim(`in ${Date.now() - t0}ms`)}`); }
    catch (e) { sp.fail('Compile error'); ui.error(e.message); }

    const errorPage = (e) => `<body style="font:16px/1.6 system-ui;background:#1a0f12;color:#ffd9d9;padding:2rem"><h2 style="color:#ff6b6b">Stack compile error</h2><pre style="white-space:pre-wrap">${String(e.message).replace(/</g, '&lt;')}</pre>${RELOAD}</body>`;

    const server = http.createServer((req, res) => {
      const u = decodeURIComponent((req.url || '/').split('?')[0]);
      if (u === '/__reload') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', ...NO_CACHE, Connection: 'keep-alive' });
        res.write('retry: 500\n\n'); clients.add(res); req.on('close', () => clients.delete(res)); return;
      }
      const f = path.join(publicDir, path.normalize(u));
      if (u !== '/' && f.startsWith(publicDir) && fs.existsSync(f) && fs.statSync(f).isFile()) {
        res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', ...NO_CACHE });
        return fs.createReadStream(f).pipe(res);
      }
      const key = u.replace(/\/+$/, '').replace(/\.html$/, '') || '/';
      const r = table.find((x) => x.url === key);
      if (!r) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', ...NO_CACHE });
        return res.end(`<body style="font:16px system-ui;background:#0b1020;color:#e9eefb;padding:3rem"><h1>404</h1><p>No page at <code>${u.replace(/</g, '&lt;')}</code>. Pages: ${table.map((x) => x.url).join(', ')}</p>${RELOAD}</body>`);
      }
      try {
        const { html, warnings } = build(r);
        warnings.forEach((w) => ui.warn(w));
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...NO_CACHE });
        res.end(html.replace('</body>', RELOAD + '</body>'));
      } catch (e) {
        ui.error(`${rel(r.src)}: ${e.message}`);
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8', ...NO_CACHE }); res.end(errorPage(e));
      }
    });

    let timer;
    const watch = require('chokidar').watch([input, 'src', 'public', 'themes', 'stack.config.json', 'stack.css'], { ignoreInitial: true, ignored: /(^|[\/\\])(node_modules|dist|\.git|\.vercel)([\/\\]|$)/ });
    watch.on('all', (ev, file) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try { table = routes(input); } catch (e) { /* ignore */ }
        const t = Date.now();
        try { table.forEach(build); ui.ok(`${ui.time()} ${c.bold(rel(file))} ${c.dim(`${ev}, rebuilt in ${Date.now() - t}ms`)}`); }
        catch (e) { ui.error(`${ui.time()} ${rel(file)}: ${e.message}`); }
        clients.forEach((cl) => cl.write('data: reload\n\n'));
      }, 60);
    });

    const listen = (port, tries = 0) => {
      server.once('error', (e) => {
        if (e.code === 'EADDRINUSE' && tries < 10) listen(port + 1, tries + 1);
        else fail(e.message);
      });
      server.listen(port, '0.0.0.0', () => {
        server.removeAllListeners('error');
        const ip = ui.networkIP();
        console.log();
        ui.kv('Local', c.blue(`http://localhost:${port}/`));
        if (ip) ui.kv('Network', c.blue(`http://${ip}:${port}/`));
        ui.kv('Pages', table.map((r) => `${r.url} ${c.dim(rel(r.src))}`).join(c.dim('   ')));
        console.log(`\n  ${c.dim('Press Ctrl+C to stop')}\n`);
        if (opts.open) {
          const url = `http://localhost:${port}/`;
          if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore' });
          else spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { stdio: 'ignore' }).on('error', () => {});
        }
      });
    };
    listen(parseInt(opts.port, 10) || 3000);
  });

// -------------------------------------------------------------- build
program.command('build [input]')
  .description('compile to static HTML (default: dist/)')
  .option('-o, --out <dir>', 'output directory', 'dist')
  .action((input, opts) => {
    input = resolveInput(input);
    const out = path.resolve(opts.out);
    if (out === process.cwd() || process.cwd().startsWith(out + path.sep) || out === path.resolve(input)) fail(`Refusing to build into "${opts.out}". Use a separate output folder like dist.`);
    console.log(ui.header(pkg.version, 'build'));
    const sp = ui.spinner('Compiling pages');
    const t0 = Date.now();
    try {
      fs.rmSync(out, { recursive: true, force: true });
      fs.mkdirSync(out, { recursive: true });
      const warnings = [];
      const table = routes(input);
      if (!table.length) throw new Error(`No .stk files found in "${input}"`);
      for (const r of table) {
        const dest = path.join(out, r.out);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, compile(fs.readFileSync(r.src, 'utf8'), { warnings }));
      }
      if (fs.existsSync('public')) fs.cpSync('public', out, { recursive: true });
      sp.succeed(`Built ${table.length} page${table.length === 1 ? '' : 's'} ${c.dim(`in ${Date.now() - t0}ms`)} into ${c.bold(rel(out) + '/')}`);
      warnings.forEach((w) => ui.warn(w));
      console.log();
      let total = 0;
      for (const f of walkFiles(out)) {
        const buf = fs.readFileSync(f);
        total += buf.length;
        const zip = /\.(html|css|js|svg|json)$/.test(f) ? c.dim(`  ${ui.bytes(zlib.gzipSync(buf).length)} gzip`) : '';
        console.log(`    ${path.relative(out, f).padEnd(22)} ${ui.bytes(buf.length).padStart(9)}${zip}`);
      }
      console.log(`\n  ${c.dim('Total ' + ui.bytes(total))}\n`);
    } catch (e) { sp.fail('Build failed'); fail(e.message); }
  });

// ---------------------------------------------------------------- new
program.command('new [name]')
  .description('create a new Stack project')
  .option('-t, --theme <theme>', 'starting theme', 'midnight')
  .option('--dep <spec>', 'add stack as a dependency (needed for Vercel), e.g. github:you/stack')
  .action((name, opts) => require('../src/new')(name, opts).catch((e) => fail(e.message)));

// ------------------------------------------------------------- themes
program.command('themes').description('list built-in themes').action(() => {
  const { themes } = loadThemes();
  console.log(ui.header(pkg.version, 'themes') );
  for (const [n, t] of Object.entries(themes)) {
    const v = t.vars;
    console.log(`  ${['bg', 'surface', 'accent', 'accent-2'].map((k) => ui.swatch(v[k])).join('')}  ${c.bold(n.padEnd(10))} ${c.dim(t.scheme)}`);
  }
  console.log(`\n  ${c.dim('Use it with')} <page theme="name">\n`);
});


// ------------------------------------------------------------ update
program.command('update')
  .description('update Stack from GitHub (github.com/NishantGits/stack) and re-run setup')
  .option('--branch <name>', 'branch to pull', 'main')
  .action((opts) => {
    const root = path.join(__dirname, '..');
    const branch = opts.branch || 'main';
    const repo = 'https://github.com/NishantGits/stack.git';
    console.log(ui.header(pkg.version, 'update'));
    ui.kv('Repo', repo);
    ui.kv('Dir', root);

    const run = (cmd, args, cwd = root) =>
      spawnSync(cmd, args, { cwd, encoding: 'utf8', stdio: 'inherit', shell: process.platform === 'win32' });

    const hasGit = fs.existsSync(path.join(root, '.git'));
    if (hasGit) {
      const sp = ui.spinner(`Pulling latest (${branch})`);
      let r = run('git', ['pull', '--ff-only', 'origin', branch]);
      if (r.status !== 0) {
        // try master
        r = run('git', ['pull', '--ff-only', 'origin', 'master']);
      }
      if (r.status !== 0) {
        sp.fail('git pull failed');
        ui.warn('Try: cd ' + root + ' && git pull');
        process.exit(1);
      }
      sp.succeed('Source updated');
    } else {
      // Not a git checkout — re-clone into temp and copy over (keep node_modules if possible)
      const sp = ui.spinner('Downloading latest from GitHub');
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stack-update-'));
      let r = run('git', ['clone', '--depth', '1', '--branch', branch, repo, tmp]);
      if (r.status !== 0) {
        r = run('git', ['clone', '--depth', '1', '--branch', 'master', repo, tmp]);
      }
      if (r.status !== 0) {
        sp.fail('Could not clone github.com/NishantGits/stack');
        process.exit(1);
      }
      // Copy files (skip node_modules, .git)
      const copyRecursive = (src, dest) => {
        fs.mkdirSync(dest, { recursive: true });
        for (const name of fs.readdirSync(src)) {
          if (name === 'node_modules' || name === '.git' || name === 'dist') continue;
          const s = path.join(src, name);
          const d = path.join(dest, name);
          if (fs.statSync(s).isDirectory()) copyRecursive(s, d);
          else fs.copyFileSync(s, d);
        }
      };
      copyRecursive(tmp, root);
      try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) {}
      sp.succeed('Source updated (downloaded)');
    }

    // Reinstall deps + link
    let sp2 = ui.spinner('Installing dependencies');
    let r2 = run('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error']);
    if (r2.status !== 0) { sp2.fail('npm install failed'); process.exit(1); }
    sp2.succeed('Dependencies installed');

    sp2 = ui.spinner('Re-linking stk + stack');
    r2 = run('npm', ['link', '--loglevel=error']);
    if (r2.status === 0) sp2.succeed('stk and stack linked');
    else {
      sp2.warn('npm link failed — run: node setup.js');
    }

    // Show new version
    try {
      delete require.cache[require.resolve('../package.json')];
      const ver = require('../package.json').version;
      ui.ok(`Stack is up to date (v${ver})`);
    } catch (_) {
      ui.ok('Stack is up to date');
    }
    console.log(`\n  ${c.dim('Run')} stk doctor ${c.dim('to verify.')}\n`);
  });

// ------------------------------------------------------------- doctor
program.command('doctor').description('check your setup').action(() => {
  console.log(ui.header(pkg.version, 'doctor'));
  const major = parseInt(process.versions.node, 10);
  const row = (good, label, hint) => (good ? ui.ok(label) : ui.warn(`${label}${hint ? c.dim('  ' + hint) : ''}`));
  row(major >= 18, `Node ${process.versions.node}`, 'Stack needs Node 18 or newer');
  const which = (cmd) => spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { encoding: 'utf8' }).status === 0;
  row(which('stk'), 'stk command is on your PATH', 'run: node setup.js');
  row(which('stack'), 'stack command is on your PATH', 'run: node setup.js');
  row(which('code'), 'VS Code command (code) found', 'optional, for the extension');
  const hasInput = ['pages', 'site', 'index.stk'].some((p) => fs.existsSync(p));
  row(hasInput, hasInput ? 'Found a Stack project here' : 'No Stack project in this folder', 'run: stk new my-site');
  console.log();
});

if (process.argv.length <= 2) { program.outputHelp(); process.exit(0); }
program.parse();