const fs = require('fs');
const path = require('path');

const SKIP = new Set(['node_modules', 'dist', 'public', 'themes']);

function walk(dir, base = dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, base));
    else if (e.name.endsWith('.stk')) out.push(path.relative(base, p));
  }
  return out.sort();
}

// A file becomes one page. A folder becomes one page per .stk file:
//   index.stk -> /        docs.stk -> /docs        guide/index.stk -> /guide
function routes(input) {
  if (fs.statSync(input).isFile()) return [{ url: '/', src: input, out: 'index.html' }];
  return walk(input).map((rel) => {
    const name = rel.slice(0, -4).split(path.sep).join('/');
    const isIndex = name === 'index' || name.endsWith('/index');
    const url = isIndex ? '/' + name.slice(0, -5).replace(/\/$/, '') : '/' + name;
    return { url: url === '' ? '/' : url, src: path.join(input, rel), out: isIndex ? name + '.html' : name + '.html' };
  });
}

module.exports = { routes };
