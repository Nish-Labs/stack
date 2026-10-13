const fs = require('fs');
const path = require('path');
const { parseFragment } = require('parse5');
const MarkdownIt = require('markdown-it');
const hljs = require('highlight.js/lib/core');
for (const l of ['xml', 'javascript', 'css', 'json', 'bash', 'markdown']) {
  hljs.registerLanguage(l, require(`highlight.js/lib/languages/${l}`));
}
const { loadThemes } = require('./themes');
const { components, attrs: attrStr, esc } = require('./components');
const { CDN } = require('./icons');

const ALIAS = { stk: 'xml', html: 'xml', svg: 'xml', sh: 'bash', shell: 'bash', js: 'javascript', md: 'markdown' };
const md = new MarkdownIt({
  html: true,
  linkify: true,
  highlight(str, lang) {
    lang = ALIAS[lang] || lang;
    const body = lang && hljs.getLanguage(lang)
      ? hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
      : md.utils.escapeHtml(str);
    return `<pre><code class="hljs">${body}</code></pre>`;
  },
});
md.linkify.set({ fuzzyLink: false });
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
md.renderer.rules.heading_open = (tokens, i, o, env, self) => {
  const t = tokens[i];
  if (t.tag === 'h2' || t.tag === 'h3') t.attrSet('id', slug(tokens[i + 1].content));
  return self.renderToken(tokens, i, o);
};

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const textEsc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attrsOf = (n) => Object.fromEntries(n.attrs.map((a) => [a.name, a.value]));

function dedent(t) {
  const lines = t.replace(/^\s*\n/, '').replace(/\s+$/, '').split('\n');
  const ind = lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length);
  const min = ind.length ? Math.min(...ind) : 0;
  return lines.map((l) => l.slice(min)).join('\n');
}

function render(node, ctx) {
  if (node.nodeName === '#text') return textEsc(node.value).replace(/\{(\w+)\}/g, '<span data-bind="$1"></span>');
  if (node.nodeName === '#comment' || !node.tagName) return '';
  const tag = node.tagName;
  const a = attrsOf(node);
  if (a['data-md'] !== undefined) return md.render(ctx.mds[+a['data-md']]);
  if (tag === 'script' || tag === 'style') {
    return `<${tag}${attrStr(a)}>${node.childNodes.map((c) => c.value).join('')}</${tag}>`;
  }
  const kids = node.childNodes.map((c) => render(c, ctx)).join('');
  if (components[tag]) return components[tag](a, kids, ctx);
  if (VOID.has(tag)) return `<${tag}${attrStr(a)}>`;
  return `<${tag}${attrStr(a)}>${kids}</${tag}>`;
}

const readAsset = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');
const minifyCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/ ?([{};,>]) ?/g, '$1');

function compile(src, opts = {}) {
  const cwd = opts.cwd || process.cwd();
  const warnings = opts.warnings || [];
  const { themes } = loadThemes(cwd);

  const mds = [];
  // Extract <md>…</md> without stopping at </md> inside fenced code blocks
  {
    let out = '';
    let i = 0;
    while (i < src.length) {
      const start = src.indexOf('<md>', i);
      if (start === -1) { out += src.slice(i); break; }
      out += src.slice(i, start);
      let pos = start + 4;
      let inFence = false;
      let found = false;
      while (pos < src.length) {
        if (src.startsWith('```', pos)) { inFence = !inFence; pos += 3; continue; }
        if (!inFence && src.startsWith('</md>', pos)) {
          const content = src.slice(start + 4, pos);
          out += `<div data-md="${mds.push(dedent(content)) - 1}"></div>`;
          i = pos + 5;
          found = true;
          break;
        }
        pos++;
      }
      if (!found) { out += src.slice(start); break; }
    }
    src = out;
  }
  src = src.replace(/<([a-z][\w-]*)((?:\s[^<>]*?)?)\/>/g, (_, tag, rest) => (VOID.has(tag) ? `<${tag}${rest}>` : `<${tag}${rest}></${tag}>`));

  const frag = parseFragment(src);
  const page = frag.childNodes.find((n) => n.tagName === 'page');
  const pa = page ? attrsOf(page) : {};
  const ctx = { state: {}, mds, icons: false, themes, themeNames: Object.keys(themes), switch: /<themeswitch|data-theme-set/.test(src) };
  const body = (page ? page.childNodes : frag.childNodes).map((n) => render(n, ctx)).join('');

  let themeName = pa.theme || 'midnight';
  if (!themes[themeName]) {
    warnings.push(`Unknown theme "${themeName}", using midnight. Available: ${ctx.themeNames.join(', ')}`);
    themeName = 'midnight';
  }
  const theme = themes[themeName];

  // fonts
  const specs = new Map();
  const addFont = (s) => { const f = s.split(':')[0]; if (!specs.has(f)) specs.set(f, s); };
  (ctx.switch ? Object.values(themes) : [theme]).forEach((t) => (t.fonts || []).forEach(addFont));
  let overrides = '';
  if (pa.font) { addFont(pa.font + ':wght@400;500;600;700'); overrides += `--font:'${pa.font}',system-ui,sans-serif;`; }
  if (pa.heading) { addFont(pa.heading + ':wght@500;600;700;800'); overrides += `--heading-font:'${pa.heading}',system-ui,sans-serif;`; }
  const fam = [...specs.values()].map((s) => 'family=' + s.replace(/ /g, '+')).join('&amp;');
  const fonts = fam
    ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fam}&amp;display=swap">`
    : '';

  // css
  const decl = (t) => Object.entries(t.vars).map(([k, v]) => `--${k}:${v}`).join(';') + `;color-scheme:${t.scheme}`;
  let css = `:root{${decl(theme)}}`;
  if (ctx.switch) for (const [n, t] of Object.entries(themes)) css += `[data-theme="${n}"]{${decl(t)}}`;
  if (overrides) css += `:root{${overrides}}`;
  let user = '';
  try { user = fs.readFileSync(path.join(cwd, 'stack.css'), 'utf8'); } catch (e) { /* optional */ }
  css += minifyCss(readAsset('base.css')) + user;

  const title = pa.title || 'Stack';
  const head = [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width,initial-scale=1">`,
    `<title>${esc(title)}</title>`,
    pa.description ? `<meta name="description" content="${esc(pa.description)}"><meta property="og:description" content="${esc(pa.description)}">` : '',
    `<meta property="og:title" content="${esc(title)}"><meta property="og:type" content="website">`,
    pa['og-image'] ? `<meta property="og:image" content="${esc(pa['og-image'])}"><meta name="twitter:card" content="summary_large_image">` : `<meta name="twitter:card" content="summary">`,
    `<meta name="theme-color" content="${esc(theme.vars.bg)}">`,
    `<meta name="generator" content="Stack">`,
    pa.favicon ? `<link rel="icon" href="${esc(pa.favicon)}">` : '',
    fonts,
    ctx.switch ? `<script>try{var t=localStorage.getItem('stk-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>` : '',
    `<style>${css}</style>`,
  ].join('');

  const state = JSON.stringify(ctx.state).replace(/</g, '\\u003c');
  return `<!DOCTYPE html><html lang="${esc(pa.lang || 'en')}" data-theme="${themeName}"><head>${head}</head><body><main class="stk-page">${body}</main>${ctx.icons ? `<script src="${CDN}"></script>` : ''}<script>window.__STK_STATE__=${state};${readAsset('runtime.browser.js')}</script></body></html>`;
}

module.exports = { compile };