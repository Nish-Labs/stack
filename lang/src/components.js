const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function attrs(a, skip = []) {
  return Object.entries(a)
    .filter(([k]) => !skip.includes(k))
    .map(([k, v]) => {
      const n = k.startsWith('on:') ? 'data-on-' + k.slice(3) : k;
      return v === '' ? ` ${n}` : ` ${n}="${esc(v)}"`;
    })
    .join('');
}

const cls = (base, a) => esc([base, a.class].filter(Boolean).join(' '));

// <i data-lucide="name"> is swapped for an inline SVG by the Lucide CDN script.
function ico(ctx, name, extra = '') {
  ctx.icons = true;
  return `<i data-lucide="${esc(name)}" class="stk-icon${extra ? ' ' + extra : ''}"></i>`;
}

function parseLinks(s = '') {
  return s.split(',').map((x) => x.trim()).filter(Boolean).map((x) => {
    const i = x.indexOf(':');
    return i < 0 ? { label: x, href: '#' } : { label: x.slice(0, i).trim(), href: x.slice(i + 1).trim() };
  });
}

const ALERT_ICONS = { info: 'info', success: 'circle-check', warning: 'triangle-alert', danger: 'circle-x' };
const external = (h) => (/^https?:\/\//.test(h) ? ' target="_blank" rel="noopener"' : '');

const components = {
  state(a, k, ctx) {
    for (const [key, v] of Object.entries(a)) {
      try { ctx.state[key] = JSON.parse(v); } catch (e) { ctx.state[key] = v; }
    }
    return '';
  },

  navbar(a, k, ctx) {
    const links = parseLinks(a.links).map((l) => `<a href="${esc(l.href)}"${external(l.href)}>${esc(l.label)}</a>`).join('');
    const cta = a.cta ? parseLinks(a.cta)[0] : null;
    const ctaHtml = cta ? `<a class="stk-btn stk-btn-primary stk-btn-sm" href="${esc(cta.href)}">${esc(cta.label)}</a>` : '';
    const logo = a.icon ? ico(ctx, a.icon) : '';
    const toggle = `<button type="button" class="stk-nav-toggle" aria-label="Toggle menu" onclick="this.closest('nav').classList.toggle('open')">${ico(ctx, 'menu')}</button>`;
    return `<nav class="${cls('stk-nav', a)}"><a class="stk-brand" href="${esc(a['brand-href'] || '/')}">${logo}<span>${esc(a.brand || '')}</span></a>${toggle}<div class="stk-nav-links">${links}<span class="stk-nav-extra">${k}${ctaHtml}</span></div></nav>`;
  },

  hero: (a, k) => `<section class="${cls('stk-hero', a)}">${k}</section>`,

  card(a, k, ctx) {
    const tag = a.href ? 'a' : 'div';
    const href = a.href ? ` href="${esc(a.href)}"${external(a.href)}` : '';
    const chip = a.icon ? `<span class="stk-chip">${ico(ctx, a.icon)}</span>` : '';
    const h = a.title ? `<h3>${esc(a.title)}</h3>` : '';
    const body = a.title && !/^\s*</.test(k) ? `<p>${k}</p>` : k;
    return `<${tag} class="${cls('stk-card' + (a.href ? ' stk-card-link' : ''), a)}"${href}>${chip}${h}${body}</${tag}>`;
  },

  alert(a, k, ctx) {
    const t = ALERT_ICONS[a.type] ? a.type : 'info';
    return `<div class="${cls('stk-alert stk-alert-' + t, a)}" role="note">${ico(ctx, a.icon || ALERT_ICONS[t])}<div>${k}</div></div>`;
  },

  button(a, k, ctx) {
    const v = a.variant || 'primary';
    if (v === 'none') return `<button type="${a.type || 'button'}"${attrs(a, ['variant', 'type'])}>${k}</button>`;
    const c = cls(`stk-btn stk-btn-${v}${a.size === 'sm' ? ' stk-btn-sm' : ''}`, a);
    const inner = (a.icon ? ico(ctx, a.icon) : '') + `<span>${k}</span>`;
    const skip = ['variant', 'icon', 'href', 'size', 'class', 'type'];
    if (a.href) return `<a class="${c}" href="${esc(a.href)}"${external(a.href)}${attrs(a, skip)}>${inner}</a>`;
    return `<button type="${a.type || 'button'}" class="${c}"${attrs(a, skip)}>${inner}</button>`;
  },

  badge: (a, k, ctx) => `<span class="${cls('stk-badge', a)}">${a.icon ? ico(ctx, a.icon) : ''}${k}</span>`,

  icon(a, k, ctx) {
    const s = a.size ? ` style="width:${esc(a.size)}px;height:${esc(a.size)}px"` : '';
    ctx.icons = true;
    return `<i data-lucide="${esc(a.name || 'circle')}" class="${cls('stk-icon', a)}"${s}></i>`;
  },

  grid(a, k) {
    const n = Math.max(1, Math.min(6, parseInt(a.cols, 10) || 3));
    return `<div class="${cls('stk-grid', a)}" data-cols="${n}" style="--cols:${n}">${k}</div>`;
  },
  row: (a, k) => `<div class="${cls('stk-row', a)}">${k}</div>`,
  stack: (a, k) => `<div class="${cls('stk-stack', a)}">${k}</div>`,

  themeswitch(a, k, ctx) {
    ctx.switch = true;
    const opts = ctx.themeNames.map((n) => `<option value="${esc(n)}">${esc(ctx.themes[n].label)}</option>`).join('');
    return `<label class="stk-switch" title="Change theme">${ico(ctx, 'palette')}<select data-theme-select aria-label="Theme">${opts}</select></label>`;
  },
  footer(a, k, ctx) {
    // Inline SVGs so icons always show (Lucide removed most brand icons)
    const SVG = {
      github: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.238 1.84 1.238 1.07 1.834 2.809 1.304 3.495.997.108-.776.42-1.305.763-1.605-2.665-.304-5.466-1.333-5.466-5.932 0-1.31.468-2.382 1.236-3.222-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.29-1.552 3.297-1.23 3.297-1.23.655 1.652.243 2.873.12 3.176.77.84 1.235 1.912 1.235 3.222 0 4.61-2.804 5.625-5.475 5.922.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .32.217.694.825.576C20.565 21.796 24 17.3 24 12 24 5.37 18.63 0 12 0z"/></svg>',
      gitlab: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.955 13.701l-1.465-4.51L18.667.904a.655.655 0 0 0-1.242 0l-1.595 4.91H8.172L6.577.904a.655.655 0 0 0-1.242 0L1.511 9.19.045 13.7a1.31 1.31 0 0 0 .476 1.464l11.48 8.351 11.479-8.35a1.31 1.31 0 0 0 .475-1.464z"/></svg>',
      x: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.725-8.835L1.2 2.25h7.084l4.261 5.684 5.699-5.684zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
      twitter: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.725-8.835L1.2 2.25h7.084l4.261 5.684 5.699-5.684zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
      youtube: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.84.55 9.38.55 9.38.55s7.54 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81zM9.75 15.5v-7l6.5 3.5-6.5 3.5z"/></svg>',
      instagram: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
      facebook: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.62 23.1 24 18.1 24 12.07z"/></svg>',
      linkedin: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.73V1.73C24 .77 23.21 0 22.23 0z"/></svg>',
      discord: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.32 4.37A19.8 19.8 0 0 0 15.89 3c-.2.35-.42.82-.57 1.2a18.3 18.3 0 0 0-6.64 0A12.3 12.3 0 0 0 8.1 3a19.7 19.7 0 0 0-4.44 1.38C1.4 8.05.6 11.63 1 15.17A19.9 19.9 0 0 0 7 18.3c.36-.49.68-.99.95-1.53-.52-.2-1.02-.43-1.5-.71.13-.09.25-.19.37-.28 2.92 1.36 6.08 1.36 8.96 0 .12.1.24.19.37.28-.48.28-.98.52-1.5.71.27.54.59 1.04.95 1.53a19.9 19.9 0 0 0 6-3.13c.47-4.15-.8-7.7-2.26-10.8zM8.02 13.33c-.88 0-1.6-.81-1.6-1.8s.7-1.8 1.6-1.8 1.62.81 1.6 1.8-.72 1.8-1.6 1.8zm7.96 0c-.88 0-1.6-.81-1.6-1.8s.7-1.8 1.6-1.8 1.62.81 1.6 1.8-.72 1.8-1.6 1.8z"/></svg>',
      twitch: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.57 4.7H13v5.2h-1.43V4.7zm4.93 0H18v5.2h-1.5V4.7zM6 0L1.71 4.29v15.42h5.15V24l4.29-4.29h3.43L22.29 12V0H6zm14.57 11.14l-3.43 3.43h-3.43l-3 3v-3H6.86V1.71h13.71v9.43z"/></svg>',
      tiktok: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.6-.98-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.95a8.03 8.03 0 0 1-7.64 3.18c-2.11-.43-3.97-1.75-5.05-3.59a8.17 8.17 0 0 1 1.31-9.46c1.85-1.91 4.65-2.65 7.2-1.93.01 1.55-.02 3.1-.02 4.65-.9-.57-2.07-.79-3.15-.48a3.94 3.94 0 0 0-2.69 2.83 3.85 3.85 0 0 0 2.51 4.5c1.39.4 2.93.03 3.88-1.01.27-.28.46-.61.58-.97.18-.67.2-1.36.2-2.05V0h-.01z"/></svg>',
      reddit: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.74c.69 0 1.25.56 1.25 1.24a1.25 1.25 0 0 1-2.49.06l-2.91-.96a.72.72 0 0 0-.51.01L8.7 6.33a1.25 1.25 0 1 1-.87 2.33l3.24-1.07 2.88.95a1.25 1.25 0 0 1 2.06.75c0 .69-.56 1.25-1.25 1.25-.23 0-.44-.07-.62-.18-1.13.82-2.42 1.3-3.84 1.36l.7 3.27a2.6 2.6 0 0 1 2.64-1.02c1.42.2 2.42 1.48 2.22 2.9-.2 1.42-1.48 2.42-2.9 2.22a2.6 2.6 0 0 1-2.07-1.85l-3.47.72a2.6 2.6 0 0 1-2.07 1.85c-1.42.2-2.7-.8-2.9-2.22-.2-1.42.8-2.7 2.22-2.9.37-.05.74-.02 1.08.08l-.72-3.36C6.2 10.5 4.7 8.7 4.7 6.58c0-2.48 2.01-4.5 4.5-4.5 1.6 0 3 .84 3.79 2.1l3.35 1.11c.2-.23.48-.37.77-.37z"/></svg>',
      medium: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zm7.42 0c0 3.59-1.51 6.5-3.38 6.5-1.87 0-3.39-2.91-3.39-6.5s1.52-6.5 3.39-6.5 3.38 2.91 3.38 6.5zM24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/></svg>',
      dribbble: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.373-.438 1.34 3.684 1.887 6.684 1.992 7.313 2.29-1.546 3.93-4.02 4.381-6.875zm-6.325 8.167c-.153-.9-.75-4.032-2.205-7.77l-.067.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.166 6.317 2.166 1.5 0 2.92-.34 4.195-.816zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C6.637 11.84 2.31 11.74 1.9 11.73c-.01.21-.01.42-.01.63 0 2.54.97 4.86 2.565 6.63l-.36.03zm-2.14-8.57c.415.01 4.23.068 8.56 1.34 2.68-4.92 3.81-8.87 3.99-9.648C10.85 1.14 5.67 2.96 2.94 6.98l1.095.04.09.01zM15.07 1.54c-.2.84-1.2 4.85-3.77 9.78 3.56.95 6.7.62 7.05.54A9.98 9.98 0 0 0 15.07 1.54z"/></svg>',
      behance: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 7h-7V5h7v2zm1.726 10c-.437 1.98-2.206 3.4-4.56 3.4-3.15 0-5.32-2.37-5.32-5.68 0-3.35 2.2-5.76 5.23-5.76 3.01 0 5.03 2.18 5.03 5.47v.85H15.53c.13 1.45 1.1 2.33 2.55 2.33 1.05 0 1.8-.5 2.14-1.36l2.51.95zM15.69 12h4.74c-.14-1.28-.94-2.08-2.25-2.08-1.35 0-2.23.8-2.49 2.08zM7.5 14.3c0 1.7-1.1 2.7-2.75 2.7-1.6 0-2.6-.95-2.7-2.5h7.4c.1 2.55-1.75 4.7-4.7 4.7C2.2 19.2 0 17 0 13.9c0-3.2 2.25-5.4 5.1-5.4 2.85 0 4.9 2.1 4.9 5.15v.65H7.5zm-5.3-1.9c.15-1.4 1.15-2.3 2.55-2.3 1.35 0 2.3.9 2.4 2.3H2.2zM9.3 5.3h3.5v1.2c.5-.85 1.4-1.4 2.6-1.4h.6V8h-.7c-1.5 0-2.5.8-2.5 2.4v5.5H9.3V5.3z"/></svg>',
      mastodon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.21 7.95c0-4.92-.64-6.77-5.02-7.56C16.96.12 12.27 0 12 0c-.27 0-4.96.12-6.19.39C1.43 1.18.79 3.03.79 7.95c0 4.8.28 7.62 2.25 9.08 1.85 1.37 6.36 1.64 7.47 1.7v-2.55c-.9.2-2.7.34-4.02.08-1.27-.26-1.55-1.2-1.64-1.92-.08-.55-.07-1.07-.07-1.07s1.56.38 3.54.47c1.21.05 2.34-.07 3.49-.22 2.2-.29 4.12-1.42 4.36-2.58.38-1.82.35-4.44.35-4.44zm-3.66 4.55h-2.4V8.12c0-1.24-.52-1.87-1.56-1.87-1.15 0-1.73.74-1.73 2.21v3.2H11.5v-3.2c0-1.47-.58-2.21-1.73-2.21-1.04 0-1.56.63-1.56 1.87v4.38H5.8V7.86c0-1.24.32-2.22.96-2.94.66-.74 1.52-1.12 2.58-1.12 1.23 0 2.16.47 2.77 1.42L12 6.32l.89-1.1c.61-.95 1.54-1.42 2.77-1.42 1.06 0 1.92.38 2.58 1.12.64.72.96 1.7.96 2.94v4.64z"/></svg>',
      threads: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.19 0h-.05C6.44.03 2 4.5 2 10.12c0 2.7 1.06 5.14 2.79 6.94.2.2.52.17.67-.05l.58-.84c.13-.2.1-.47-.08-.63A7.52 7.52 0 0 1 4.5 10.12c0-4.2 3.37-7.62 7.54-7.62h.05c4.17 0 7.54 3.42 7.54 7.62 0 3.34-2.14 6.18-5.15 7.2-.1.03-.18.12-.18.23v1.15c0 .15.1.27.25.28 3.97.3 7.22-2.84 7.22-6.86C21.77 4.5 17.33.03 12.19 0zm.06 6.53c-2.2 0-4 1.8-4 4.03 0 1.55.88 2.9 2.17 3.56.2.1.44-.04.44-.27v-.85c0-.13-.08-.24-.2-.3a2.3 2.3 0 0 1-1.4-2.14c0-1.28 1.03-2.32 2.3-2.32.53 0 1.02.18 1.4.48.2.16.46.1.58-.12.12-.23.06-.5-.14-.66a3.7 3.7 0 0 0-1.15-.41zm3.5 1.88c-.17 0-.32.12-.35.3-.5 2.95-2.9 5.18-5.85 5.18-.2 0-.36.17-.36.37v1.1c0 .2.16.37.36.37 3.85 0 7-3 7.48-6.87.03-.2-.12-.38-.32-.4-.1-.02-.2.02-.27.1a.37.37 0 0 1-.33.15h-.36z"/></svg>',
      email: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
      mail: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
      website: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
      web: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
      rss: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1" fill="currentColor"/></svg>',
    };

    const URLS = {
      github: (v) => /^https?:\/\//i.test(v) ? v : 'https://github.com/' + v.replace(/^@/, ''),
      gitlab: (v) => /^https?:\/\//i.test(v) ? v : 'https://gitlab.com/' + v.replace(/^@/, ''),
      x: (v) => /^https?:\/\//i.test(v) ? v : 'https://x.com/' + v.replace(/^@/, ''),
      twitter: (v) => /^https?:\/\//i.test(v) ? v : 'https://x.com/' + v.replace(/^@/, ''),
      youtube: (v) => /^https?:\/\//i.test(v) ? v : 'https://youtube.com/' + (v.startsWith('@') ? v : '@' + v.replace(/^@/, '')),
      instagram: (v) => /^https?:\/\//i.test(v) ? v : 'https://instagram.com/' + v.replace(/^@/, ''),
      facebook: (v) => /^https?:\/\//i.test(v) ? v : 'https://facebook.com/' + v.replace(/^@/, ''),
      linkedin: (v) => /^https?:\/\//i.test(v) ? v : 'https://linkedin.com/in/' + v.replace(/^@/, ''),
      discord: (v) => /^https?:\/\//i.test(v) ? v : 'https://discord.gg/' + v,
      twitch: (v) => /^https?:\/\//i.test(v) ? v : 'https://twitch.tv/' + v.replace(/^@/, ''),
      tiktok: (v) => /^https?:\/\//i.test(v) ? v : 'https://tiktok.com/@' + v.replace(/^@/, ''),
      reddit: (v) => /^https?:\/\//i.test(v) ? v : 'https://reddit.com/u/' + v.replace(/^u\//, '').replace(/^@/, ''),
      medium: (v) => /^https?:\/\//i.test(v) ? v : 'https://medium.com/@' + v.replace(/^@/, ''),
      dribbble: (v) => /^https?:\/\//i.test(v) ? v : 'https://dribbble.com/' + v.replace(/^@/, ''),
      behance: (v) => /^https?:\/\//i.test(v) ? v : 'https://behance.net/' + v.replace(/^@/, ''),
      mastodon: (v) => /^https?:\/\//i.test(v) ? v : v,
      threads: (v) => /^https?:\/\//i.test(v) ? v : 'https://threads.net/@' + v.replace(/^@/, ''),
      email: (v) => v.startsWith('mailto:') ? v : 'mailto:' + v,
      mail: (v) => v.startsWith('mailto:') ? v : 'mailto:' + v,
      website: (v) => /^https?:\/\//i.test(v) ? v : 'https://' + v,
      web: (v) => /^https?:\/\//i.test(v) ? v : 'https://' + v,
      rss: (v) => v,
    };

    const links = [];
    if (a.social) {
      a.social.split(',').map((x) => x.trim()).filter(Boolean).forEach((pair) => {
        const i = pair.indexOf(':');
        if (i < 0) return;
        const key = pair.slice(0, i).trim().toLowerCase();
        const val = pair.slice(i + 1).trim();
        if (URLS[key] && SVG[key] && val) links.push({ key: key, val: val });
      });
    }
    for (const key of Object.keys(URLS)) {
      if (a[key] !== undefined && a[key] !== '' && SVG[key] && !links.some((l) => l.key === key)) {
        links.push({ key: key, val: a[key] });
      }
    }

    const btns = links.map((l) => {
      const href = URLS[l.key](l.val);
      const display = /^https?:\/\//i.test(l.val)
        ? l.val.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
        : l.val.replace(/^@/, '').replace(/^mailto:/, '');
      return '<a class="stk-footer-social" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer" title="' + esc(l.key) + '" aria-label="' + esc(l.key) + '"><span class="stk-footer-ico" aria-hidden="true">' + SVG[l.key] + '</span><span class="stk-footer-label">' + esc(display) + '</span></a>';
    }).join('');

    const primary = links.find((l) => l.key === 'github') || links[0];
    let body = k && k.trim() ? k : (a.text || 'Built with Stack');
    body = body.replace(/@([A-Za-z0-9-]+)/g, '<a class="stk-footer-link" href="https://github.com/$1" target="_blank" rel="noopener noreferrer">@$1</a>');
    if (primary && primary.key === 'github') {
      const handle = primary.val.replace(/^@/, '').replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/\/$/, '');
      if (handle) {
        const safe = handle.replace(/[.*+?^${}()|[\]\\]/g, '\$&');
        const re = new RegExp('\b(' + safe + ')\b', 'g');
        const href = URLS.github(primary.val);
        body = body.replace(re, '<a class="stk-footer-link" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">$1</a>');
      }
    }

    return '<footer class="' + cls('stk-footer', a) + '"><div class="stk-footer-inner"><div class="stk-footer-text">' + body + '</div>' + (btns ? '<div class="stk-footer-actions">' + btns + '</div>' : '') + '</div></footer>';
  },
};

module.exports = { components, attrs, esc };