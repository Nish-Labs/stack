# Stack

Write HTML, CSS, JavaScript and Markdown in one `.stk` file. Stack builds it into a fast static site, with ten themes and Lucide icons built in.

## Set up

Needs Node 18 or newer.

```bash
node setup.js
```

This installs dependencies, registers the global `stk` command and installs the VS Code extension if `code` is available. Check it any time with `stk doctor`.

## Use it

```bash
stk dev site          # preview this repo's website with live reload
stk new my-site       # start your own project
stk build site        # write static files to dist/
stk themes            # list the built-in themes
```

The full documentation lives in `site/docs.stk`, which is also the `/docs` page of the website.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel choose **Add New > Project** and import it.
3. Framework Preset: **Other**. The rest comes from `vercel.json` (build `npm run build`, output `dist`).
4. Deploy.

For your own projects use `stk new my-site --dep github:YOURNAME/stack` so Vercel can install Stack during the build.

## Remove

```bash
npm unlink -g stack
```
