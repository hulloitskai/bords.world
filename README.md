# bords.world

A static page built with the [Tailwind CSS v4 CLI](https://tailwindcss.com/docs/installation/tailwind-cli).

## Build and preview

```sh
npm ci
npm run build
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000. Edit `src/` and rebuild to preview changes. The image card stays 480px wide, including on smaller screens.

## Deploy

Pushes to `main` build and publish `dist/` using GitHub Actions. Generated files and dependencies stay out of Git.

GitHub Pages must use **GitHub Actions** as its source with **bords.world** as its custom domain. `src/CNAME` is copied to `dist/CNAME`; a CNAME file alone does not configure a custom domain for an Actions deployment.

Point the domain's apex DNS A records to GitHub Pages:

```text
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

Enable **Enforce HTTPS** in Pages settings after GitHub provisions the certificate. See [GitHub's custom domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
