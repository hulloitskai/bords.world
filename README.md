# bords.world

A static page built with Vite and the [Tailwind CSS v4 Vite plugin](https://tailwindcss.com/docs/installation/using-vite).

## Develop

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173). Edit `src/`; CSS updates instantly and HTML edits reload the page automatically.

## Build and preview

```sh
npm run build
npm run preview
```

The production build goes into `dist/`. Preview serves it locally, normally at http://localhost:4173.

## Deploy

Pushes to `main` build and publish `dist/` using GitHub Actions. Generated files and dependencies stay out of Git.

GitHub Pages must use **GitHub Actions** as its source with **bords.world** as its custom domain. `src/public/CNAME` is copied to `dist/CNAME`; a CNAME file alone does not configure a custom domain for an Actions deployment.

Point the domain's apex DNS A records to GitHub Pages:

```text
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

Enable **Enforce HTTPS** in Pages settings after GitHub provisions the certificate. See [GitHub's custom domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
