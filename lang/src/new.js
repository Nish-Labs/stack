const fs = require('fs');
const path = require('path');
const ui = require('./ui');

const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Logo">
  <path d="M32 30 L58 44 L32 58 L6 44 Z" fill="#4f46e5" stroke="#0b1020" stroke-width="2" stroke-linejoin="round"/>
  <path d="M32 18 L58 32 L32 46 L6 32 Z" fill="#5eb8ff" stroke="#0b1020" stroke-width="2" stroke-linejoin="round"/>
  <path d="M32 6 L58 20 L32 34 L6 20 Z" fill="#e0f2fe" stroke="#0b1020" stroke-width="2" stroke-linejoin="round"/>
</svg>
`;

const VERCEL = {
  cleanUrls: true,
  buildCommand: 'npm run build',
  outputDirectory: 'dist',
  headers: [{ source: '/(.*)', headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  ] }],
};

const index = (name, theme) => `<page title="${name}" description="A website built with Stack." theme="${theme}" favicon="/logo.svg">

<navbar brand="${name}" icon="layers" links="Home:/, Examples:#examples, Docs:/docs, About:/about" cta="Get started:#start">
  <themeswitch />
</navbar>

<state count="0" />

<hero>
  <h1>Hello from ${name}</h1>
  <p class="lead">This whole site is a few <code>.stk</code> files — HTML, CSS, JS and Markdown in one place. Edit and save to see live changes.</p>
  <div class="stk-row">
    <button icon="rocket" on:click="count++">Clicked {count} times</button>
    <button variant="secondary" href="/docs" icon="book-open">Read the docs</button>
  </div>
</hero>

<section id="start">
  <h2>Start here</h2>
  <p class="muted">Three things every Stack site needs to know.</p>
  <grid cols="3">
    <card icon="file-text" title="Write in Markdown">Wrap prose in an <code>&lt;md&gt;</code> block and it becomes HTML with headings, lists and code.</card>
    <card icon="palette" title="Switch themes">Use the picker in the navbar, or set <code>theme="ocean"</code> on the page tag.</card>
    <card icon="rocket" title="Ship it">Run <code>stk build</code> and deploy the <code>dist/</code> folder anywhere (Vercel, Netlify, GitHub Pages).</card>
  </grid>
</section>

<section id="examples">
  <h2>Examples</h2>
  <p class="muted">Copy these patterns into your own pages.</p>

  <h3>Cards &amp; grid</h3>
  <grid cols="3">
    <card icon="zap" title="Fast">Compiles to a single static HTML file per page.</card>
    <card icon="blocks" title="Components">Navbar, hero, cards, alerts, buttons, badges.</card>
    <card icon="sparkles" title="Icons">Lucide icons via <code>icon="name"</code>.</card>
  </grid>

  <h3 style="margin-top:2rem">Alert</h3>
  <alert type="info">This is an info alert. Try <code>type="success"</code>, <code>warning</code>, or <code>danger</code>.</alert>

  <h3 style="margin-top:1.5rem">Buttons</h3>
  <div class="stk-row">
    <button icon="check">Primary</button>
    <button variant="secondary" icon="link" href="/docs">Secondary link</button>
    <button variant="ghost" icon="heart">Ghost</button>
  </div>

  <h3 style="margin-top:1.5rem">Markdown block</h3>
  <md>
### Hello Markdown

You can use **bold**, *italic*, \`code\`, and lists:

- Edit \`index.stk\` for the home page
- Add more \`.stk\` files for new routes
- Open [/docs](/docs) for the full guide
  </md>
</section>

<section>
  <h2>Commands</h2>
  <md>
\`\`\`bash
stk dev          # live-reload dev server
stk build        # write static HTML to dist/
stk themes       # list built-in themes
stk update       # pull latest Stack from GitHub
stk doctor       # check your setup
\`\`\`

\`stack\` is an alias for \`stk\` — both work the same.
  </md>
</section>

<footer github="NishantGits">
  © ${name}. Built with Stack by NishantGits.
</footer>
</page>
`;

const about = (name, theme) => `<page title="About · ${name}" description="About this site" theme="${theme}" favicon="/logo.svg">

<navbar brand="${name}" icon="layers" links="Home:/, Examples:/#examples, Docs:/docs, About:/about">
  <themeswitch />
</navbar>

<section>
  <md>
# About

Each \`.stk\` file in this folder is its own page. This one lives at \`/about\`.

## How routing works

| File | URL |
|------|-----|
| \`index.stk\` | \`/\` |
| \`about.stk\` | \`/about\` |
| \`docs.stk\` | \`/docs\` |

Add \`contact.stk\` and it appears at \`/contact\` automatically.

## Stack

Built with [Stack](https://github.com/NishantGits/stack) — HTML, CSS, JS and Markdown in one file.
  </md>
</section>

<footer github="NishantGits">
  © ${name}. Built with Stack by NishantGits.
</footer>
</page>
`;

const docs = (name, theme) => `<page title="Docs · ${name}" description="How to use Stack in this project" theme="${theme}" favicon="/logo.svg">

<navbar brand="${name}" icon="layers" links="Home:/, Examples:/#examples, Docs:/docs, About:/about">
  <themeswitch />
</navbar>

<section>
  <md>
# Docs

Quick reference for building with Stack in **${name}**.

## Page shell

Every page starts with a \`<page>\` tag:

\`\`\`html
<page title="My page" theme="midnight" favicon="/logo.svg">
  ...
</page>
\`\`\`

Useful attributes: \`title\`, \`description\`, \`theme\`, \`favicon\`, \`font\`, \`heading\`.

## Navbar

\`\`\`html
<navbar brand="MyApp" icon="layers" links="Home:/, Docs:/docs" cta="Sign up:#">
  <themeswitch />
</navbar>
\`\`\`

## Hero

\`\`\`html
<hero>
  <h1>Title</h1>
  <p class="lead">Subtitle</p>
  <button icon="rocket">Action</button>
</hero>
\`\`\`

## Cards and grid

\`\`\`html
<grid cols="3">
  <card icon="zap" title="Fast">Description.</card>
  <card icon="palette" title="Themes">Description.</card>
</grid>
\`\`\`

## Buttons

\`\`\`html
<button>Primary</button>
<button variant="secondary" href="/docs">Link</button>
<button variant="ghost" icon="heart">Ghost</button>
\`\`\`

## Alerts

\`\`\`html
<alert type="info">Info message</alert>
<alert type="success">It worked</alert>
<alert type="warning">Be careful</alert>
<alert type="danger">Error</alert>
\`\`\`

## Markdown

\`\`\`html
<md>
## Heading
Paragraph with **bold** and \`code\`.
</md>
\`\`\`

## State and events

\`\`\`html
<state count="0" />
<button on:click="count++">Clicked {count} times</button>
\`\`\`

## Themes

Set on the page: \`theme="ocean"\`. Built-in themes include midnight, paper, ocean, forest, nord, neon, rose, sunset, daylight, dracula.

List them anytime:

\`\`\`bash
stk themes
\`\`\`

## Footer with socials

\`\`\`html
<footer github="NishantGits" x="handle" youtube="@channel">
  © My Site. Built by NishantGits.
</footer>
\`\`\`

Supported: \`github\`, \`gitlab\`, \`x\`, \`twitter\`, \`youtube\`, \`instagram\`, \`facebook\`, \`linkedin\`, \`discord\`, \`email\`, \`website\`, and more.

## Commands

| Command | What it does |
|---------|----------------|
| \`stk dev\` | Live-reload server |
| \`stk build\` | Static site → \`dist/\` |
| \`stk themes\` | List themes |
| \`stk update\` | Update Stack from GitHub |
| \`stk doctor\` | Check setup |

\`stack\` works as an alias for \`stk\`.

## Deploy (Vercel)

\`\`\`bash
stk build
npx vercel --prod
\`\`\`

Or connect the repo and set **Build** to \`npm run build\` and **Output** to \`dist\`.
  </md>
</section>

<footer github="NishantGits">
  © ${name}. Built with Stack by NishantGits.
</footer>
</page>
`;


module.exports = async function create(nameArg, opts = {}) {
  let name = nameArg;
  if (!name) {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    name = await new Promise((r) => rl.question(`  ${ui.c.blue('?')} Project name ${ui.c.dim('(my-site)')} `, (a) => { rl.close(); r(a.trim() || 'my-site'); }));
  }
  const root = path.resolve(name);
  if (fs.existsSync(root) && fs.readdirSync(root).length) { ui.error(`"${name}" already exists and is not empty`); process.exit(1); }
  const theme = opts.theme || 'midnight';
  const title = path.basename(root);
  const w = (f, s) => { fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true }); fs.writeFileSync(path.join(root, f), s); };

  w('index.stk', index(title, theme));
  w('about.stk', about(title, theme));
  w('docs.stk', docs(title, theme));
  w('public/logo.svg', LOGO);
  w('stack.config.json', '{\n  "vars": {}\n}\n');
  w('stack.css', '/* Your own CSS. It loads after the theme. */\n');
  w('vercel.json', JSON.stringify(VERCEL, null, 2) + '\n');
  w('.gitignore', 'node_modules\ndist\n.vercel\n');
  w('package.json', JSON.stringify({
    name: title, private: true,
    scripts: { dev: 'stk dev', build: 'stk build' },
    ...(opts.dep ? { devDependencies: { 'stack': opts.dep } } : {}),
  }, null, 2) + '\n');
  w('.vscode/settings.json', JSON.stringify({ 'files.associations': { '*.stk': 'html' } }, null, 2) + '\n');
  w('README.md', `# ${title}

Built with [Stack](https://github.com/NishantGits/stack).

## Develop

\`\`\`bash
stk dev          # live reload at http://localhost:3000
stk build        # static HTML → dist/
stk themes       # list themes
\`\`\`

## Pages

| File | URL |
|------|-----|
| \`index.stk\` | \`/\` |
| \`about.stk\` | \`/about\` |
| \`docs.stk\` | \`/docs\` |

Add a new \`.stk\` file to create a route.

## Learn more

Open **[/docs](/docs)** in the dev server, or see the [Stack repo](https://github.com/NishantGits/stack).
`);

  console.log(ui.header(require('../package.json').version, 'new project'));
  ui.ok(`Created ${ui.c.bold(name)}/`);
  console.log(ui.box([
    ui.c.bold('Next steps'),
    '',
    `cd ${name}`,
    'stk dev',
    '',
    ui.c.dim('Pages: /  /about  /docs'),
  ]));
  if (!opts.dep) console.log(`\n  ${ui.c.dim('Deploying to Vercel? Re-run with --dep github:NishantGits/stack so the build can install Stack.')}\n`);
};