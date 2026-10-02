# Abdelkrim Ghebouli · Portfolio

A real-time WebGL portfolio in three worlds. Same person, same story, three different ways to explore it.
Everything is computed in the browser with three.js and custom shaders: no 3D models, no video.

## Live site

https://abdelkrim789.github.io/my-portfolio/ — every push to `main` rebuilds and redeploys it
through GitHub Actions (Settings → Pages → Source must be set to **GitHub Actions**).

## The worlds

- **Night** (`src/worlds/night.js`): 60,000 particles; you scroll along one camera path through eight chapters
  and open labels anchored in the scenes.
- **Cold Storage** (`src/worlds/ice.js`, `ice-objects.js`, `ice-data.js`): an ice vault on a snow field splits
  into eleven blocks, each holding one piece of work frozen as an object (transmission ice with frost, cracks
  and dispersion). Scroll the archive, drag a block to turn it, click to thaw it: the ice melts and the story opens.
  The last block is a halftone portrait, with two small blocks beside it that are doors to the other worlds.
- **The Desk** (`src/worlds/desk.js`, `desk-scene.js`, `desk-build.js`): a sunlit office cut open like an
  architect's model. Every object is clickable (books are skills, the corkboard is me, the phone is contact,
  floppy disks load other worlds). Scroll for a nine-stop tour. The computer runs **AG/OS** (`os.js`):
  a small operating system with the CV as programs; its taskbar takes SAP transaction codes
  (SU01, SM37, SE16, SBWP, ST22, SE38), and the terminal answers HELP.

## Changing world

- **The conversation** (`src/guide.js`): I talk to the visitor in the corner, explain how each world works and
  invite them into the others at the right moments. Every reply is a button.
- **The World button** in the header (or `W`) opens a picker with all three worlds.
- **Doors inside the worlds**: the two small ice blocks in Cold Storage, the floppy disks on the desk,
  and a link in the last Night chapter.

Each destination has its own transition (`src/transition.js`): glass shatter into Night, frost that thaws open
into Cold Storage, a CRT power-off and power-on into the Desk. The same file tone-maps the HDR worlds and adds
the liquid cursor field.

## Performance

- Each world is its own chunk. Code is prefetched when the browser is idle; a world is only built when the
  visitor shows intent (opens the picker, sees a world card, clicks a door), and its shaders compile in parallel.
- Only the active world renders (both during a transition).
- The device is graded at start (GPU string, cores, memory): shadow map size, MSAA, transmission resolution
  and particle counts scale with it. Add `?tier=0`, `1` or `2` to the URL to force a grade.
- A resolution governor lowers or raises the pixel ratio continuously to hold the frame rate.
- Press `F` for the live HUD: fps, frame time, draw calls, triangles, resolution, GPU.

## Extras

`P` saves a postcard of the current view. Nine achievements are listed in the `?` guide.
Generative sound per world (toggle in the header).

## Add real screenshots of your projects

Put images in `src/shots/` named after the project: `olivepalace.png`, `latinadz.png` or `jewelry.png`
(jpg and webp work too; a 16:10 capture of the homepage works best). Rebuild with `npx vite build`.
They appear in the Night project screens, the thawed Cold Storage blocks, and the AG/OS browser.

## Edit and rebuild

```
npm install
npm run dev      # local preview
npx vite build   # writes dist/
```

- Story text shared by every world: the `<template>` blocks in `index.html`
- Cold Storage blocks: `src/worlds/ice-data.js`
- Desk objects, books and certificates: `src/worlds/desk-scene.js`; AG/OS programs: `src/worlds/os.js`
- Conversation script: `src/guide.js`

Older versions are kept as git tags: `v-three-verses`, `v-four-verses`.
