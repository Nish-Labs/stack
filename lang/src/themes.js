const fs = require('fs');
const path = require('path');

function readDir(dir) {
  const out = {};
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    try {
      out[f.slice(0, -5)] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    } catch (e) {
      throw new Error(`Invalid theme file ${path.join(dir, f)}: ${e.message}`);
    }
  }
  return out;
}

// Built-in themes + your own in ./themes + overrides from stack.config.json
function loadThemes(cwd = process.cwd()) {
  const builtin = readDir(path.join(__dirname, 'themes'));
  const local = readDir(path.join(cwd, 'themes'));
  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(path.join(cwd, 'stack.config.json'), 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') throw new Error('stack.config.json: ' + e.message);
  }
  const base = builtin.midnight;
  const themes = {};
  for (const [name, t] of Object.entries({ ...builtin, ...local })) {
    themes[name] = {
      label: t.label || name,
      scheme: t.scheme || 'dark',
      fonts: t.fonts || base.fonts,
      vars: { ...base.vars, ...t.vars, ...(config.vars || {}) },
    };
  }
  return { themes, config };
}

module.exports = { loadThemes };
