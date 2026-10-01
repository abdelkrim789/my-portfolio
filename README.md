# Abdelkrim Ghebouli · Portfolio

A real-time WebGL portfolio. 60,000 particles morph through eight procedural scenes as you scroll:
Signal → Raw → Clean → Model → Consolidate → Report → Build → Decide.

## Live site

https://abdelkrim789.github.io/my-portfolio/ — every push to `main` rebuilds and redeploys it
through GitHub Actions (Settings → Pages → Source must be set to **GitHub Actions**).

## Put it somewhere else (no build needed)

`dist/index.html` is the whole site in one file.

- **Netlify:** go to app.netlify.com/drop and drag the `dist` folder in. Done.
- **Vercel / GitHub Pages:** upload `dist/index.html` as the site root.

Then connect your domain in that host's settings.

## Worlds

Three worlds share one journey: **Daylight** (ink on paper, the default), **Night** and **Blueprint**.
Switch with the orbs at the top or the `W` key; the new world opens through a portal from where you clicked.
Palettes live in `src/worlds.js`; the page colors are the `[data-world]` token blocks in `index.html`.

## Add real screenshots of your projects

Put images in `src/shots/` named after the project: `olivepalace.png`, `latinadz.png` or `jewelry.png`
(jpg and webp work too; a 16:10 capture of the homepage works best). Rebuild with `npx vite build`.
Each screenshot replaces its project card: framed in browser chrome, shown in the side panel and
rebuilt from particles in the 3D world when the project is opened.

## Edit and rebuild

```
npm install
npm run dev      # local preview
npx vite build   # writes dist/index.html
```

- Text content: `index.html`
- Scenes and shapes: `src/shapes.js`
- Shaders, colours, post-processing: `src/particles.js`
- Scroll, camera, sound, quality scaling: `src/main.js`, `src/audio.js`
