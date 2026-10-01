# Abdelkrim Ghebouli · Portfolio

A real-time WebGL portfolio. 60,000 particles morph through eight procedural scenes as you scroll:
Signal → Raw → Clean → Model → Consolidate → Report → Build → Decide.

## Live site

https://abdelkrim789.github.io/my-portfolio/ — every push to `main` rebuilds and redeploys it
through GitHub Actions (Settings → Pages → Source must be set to **GitHub Actions**).

## Put it somewhere else (no build needed)

`dist/` is the whole site (an `index.html` plus an `assets/` folder).

- **Netlify:** go to app.netlify.com/drop and drag the `dist` folder in. Done.
- **Vercel / GitHub Pages:** publish the `dist` folder as the site root.

Then connect your domain in that host's settings.

## Worlds

Four separate worlds tell the same story, each with its own objects, materials and way of moving:

- **Daylight · The Paper Atlas** (`src/worlds/paper.js`): a pop-up book on a table; you slide sideways from card to card.
- **Night · The Desert** (`src/worlds/night.js`): 60,000 particles; you fly along one camera path.
- **Blueprint · The Tower** (`src/worlds/schematic.js`): plotted linework floors; you spiral downwards.
- **Planet · A tiny world** (`src/worlds/planet.js`): a toon planet; a rover drives you between landmarks while
  the sky moves from dawn to night. Press `G` (or "Take the wheel") to drive it yourself.

Each destination has its own transition (`src/transition.js`): shatter, page curl, plotter scan, warp iris.
The same file holds the liquid cursor field and the tilt-shift focus.

## Performance

- Every world is a separate chunk loaded on demand; three.js is shared. Only the active world renders.
- The device is graded at start (GPU string, cores, memory) and worlds scale counts, shadows and MSAA.
- A resolution governor lowers or raises the pixel ratio continuously to hold the frame rate.
- Press `F` for the live HUD: fps, frame time, draw calls, triangles, resolution, GPU.

## Extras

`P` saves a postcard of the current view. Eight achievements are listed in the `?` guide.

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
