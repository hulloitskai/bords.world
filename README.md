# bords.world

An illustrated bird card carousel built with React, Vite, and shadcn. Browse with the mouse wheel, a swipe, or the previous and next buttons.

`src/birds.json` lists card order, display names, artwork, and recordings. Vite resolves the artwork and recordings through `import.meta.glob` in `src/App.tsx` and `src/components/recording-controls.tsx`, respectively.

## Develop

Use Node.js 24.15 or later.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173). Edit `src/`; CSS updates instantly and HTML edits reload the page automatically.

`npm ci` installs a Husky hook that lints staged JavaScript, TypeScript, `package.json`, and `mise.toml`. The hook also formats staged files supported by Prettier, including both config files. Use `npm run lint` and `npm run format:check` to check the whole project, or `npm run format` to apply formatting.

With Playwright Chromium installed and Vite running, use `bun scripts/check-recording-controls.js` to check playback and keyboard Skip at 320 px.

## Download eBird sounds

With [Mise](https://mise.jdx.dev/) and Google Chrome installed, run from the project root:

```sh
mise install
mise exec -- bun install --frozen-lockfile
mise run download-sounds 'https://ebird.org/species/wbgbir1?continue'
```

Use the arrow keys to move between tracks, Space to select, and Enter to download.
The script saves MP3s to `src/assets/sounds/`. One Calls track becomes
`white_bellied_go_away_bird-calls.mp3`. Two Calls tracks get `_1` and `_2`
before `.mp3`. Existing files are preserved.

Chrome minimizes as soon as Playwright opens its window. It may appear briefly at startup.

## Build and preview

```sh
npm run build
npm run preview
```

The production build goes into `dist/`. Preview serves it locally, normally at http://localhost:4173.

## Deploy

Pushes to `main` build and publish `dist/` using GitHub Actions. Generated files and dependencies stay out of Git.

GitHub Pages must use **GitHub Actions** as its source with **bords.world** as its custom domain. `public/CNAME` is copied to `dist/CNAME`; a CNAME file alone does not configure a custom domain for an Actions deployment.

Point the domain's apex DNS A records to GitHub Pages:

```text
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

Enable **Enforce HTTPS** in Pages settings after GitHub provisions the certificate. See [GitHub's custom domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
