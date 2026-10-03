# Abdelkrim Ghebouli · Portfolio

A real-time WebGL portfolio in three worlds. Same person, same story, three different ways to explore it.
Everything is computed in the browser with three.js and custom shaders: no 3D models, no video.

## Live site

https://abdelkrim789.github.io/my-portfolio/ — every push to `main` rebuilds and redeploys it
through GitHub Actions (Settings → Pages → Source must be set to **GitHub Actions**).

## The worlds

- **Night** (`src/worlds/night.js`): 60,000 particles; you scroll along one camera path through eight chapters
  and open labels anchored in the scenes.
- **The Monument** (`src/worlds/monument.js`, `monument-build.js`, `monument-noor.js`): a slab of concrete in the
  Sahara at dawn. You arrive along an avenue of standing stones, a seam of light opens in the door, and inside, light
  falls through slits in the roof as true volumetric beams (an analytic ray march in a post pass, stopped by scene
  depth) onto a polished floor that reflects it. Five bays tell the chapters with projected light: the first door, two
  degrees, a wall of twelve systems you power on, what I build, and Géant (repair the corrupted stock). At the core, six
  streams of light fill one cube: SHONE. **NOOR**, a ring of light, walks with you and answers questions about me from a
  knowledge base (typed or spoken). Two rooms are hidden: an archive behind a wall, and a vault beneath the floor.
  The last room's ceiling opens onto the Night; an office door leads to the Desk. Scroll to walk, W A S D or a click on
  the floor to roam, drag to look.
- **The Desk** (`src/worlds/desk.js`, `desk-scene.js`, `desk-build.js`): a sunlit office cut open like an
  architect's model. Every object is clickable (books are skills, the corkboard is me, the phone is contact,
  floppy disks load other worlds). Scroll for a nine-stop tour. The computer runs **AG/OS** (`os.js`):
  a small operating system with the CV as programs; its taskbar takes SAP transaction codes
  (SU01, SM37, SE16, SBWP, ST22, SE38, ZPROJ, ZCERT, ZWORLD, /NEX), and the terminal answers HELP.

## Changing world

- **The conversation** (`src/guide.js`): I talk to the visitor in the corner, explain how each world works and
  invite them into the others at the right moments. Every reply is a button.
- **The World button** in the header (or `W`) opens a picker with all three worlds.
- **Doors inside the worlds**: the ceiling of the Monument's last room and its office door, the floppy disks on
  the desk, and a link in the last Night chapter.

Each destination has its own transition (`src/transition.js`): glass shatter into Night, a seam of light that
parts the old world like two stone doors into the Monument, a CRT power-off and power-on into the Desk. The same file tone-maps the HDR worlds and adds
the liquid cursor field.

## Performance

- Each world is its own chunk. Code is prefetched when the browser is idle; a world is only built when the
  visitor shows intent (opens the picker, sees a world card, clicks a door), and its shaders compile in parallel.
- Only the active world renders (both during a transition).
- The device is graded at start (GPU string, cores, memory): shadow map size, MSAA, bloom, the size of the
  Monument's reflections, terrain and particle counts scale with it. Add `?tier=0`, `1` or `2` to the URL to force a grade.
- A resolution governor lowers or raises the pixel ratio continuously to hold the frame rate.
- Press `F` for the live HUD: fps, frame time, draw calls, triangles, resolution, GPU.

## Extras

`P` saves a postcard of the current view. Fourteen achievements are listed in the `?` guide.
Generative sound per world (toggle in the header).

## Add real screenshots of your projects

Put images in `src/shots/` named after the project: `olivepalace.png`, `latinadz.png` or `jewelry.png`
(jpg and webp work too; a 16:10 capture of the homepage works best). Rebuild with `npx vite build`.
They appear in the Night project screens, the Monument's projection screens, and the AG/OS browser.

## Edit and rebuild

```
npm install
npm run dev      # local preview
npx vite build   # writes dist/
```

- Story text shared by every world: the `<template>` blocks in `index.html`
- Monument chapters, details and the walk: `src/worlds/monument.js`; NOOR's answers: `src/worlds/monument-noor.js`
- Desk objects, books and certificates: `src/worlds/desk-scene.js`; AG/OS programs: `src/worlds/os.js`
- Conversation script: `src/guide.js`

Older versions are kept on the branches `archive-four-worlds` (with Planet, Daylight and Blueprint),
`archive-three-worlds`, `archive-ice-world` (Cold Storage) and `archive-medina-world` (the Medina, which the
Monument replaced).
