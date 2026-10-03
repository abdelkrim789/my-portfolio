# Abdelkrim Ghebouli · Portfolio

A real-time WebGL portfolio in three worlds. Same person, same story, three different ways to explore it.
Everything is computed in the browser with three.js and custom shaders: no 3D models, no video.

## Live site

https://abdelkrim789.github.io/my-portfolio/ — every push to `main` rebuilds and redeploys it
through GitHub Actions (Settings → Pages → Source must be set to **GitHub Actions**).

## The worlds

- **Night** (`src/worlds/night.js`): 60,000 particles; you scroll along one camera path through eight chapters
  and open labels anchored in the scenes.
- **The Medina** (`src/worlds/medina.js`, `medina-city.js`, `medina-build.js`): a walk through an old Algerian
  town from the city gate to a rooftop over the sea, while the sun goes down. Nine places, each a chapter:
  knock on the customs office door (first internship), the university courtyard (degrees and certificates on
  plaques), a souk where every lantern is a skill you light, three craftsmen's shops (the projects), the team's
  workshop, Géant Electronics (repair the corrupted stock), a riad where six streams fill one basin (SHONE), and
  the rooftop: the lower town cascades to a harbour, pigeons carry messages, a telescope leads to the Night and a
  lit room below leads to the Desk. Scroll or swipe to walk, drag to look around.
- **The Desk** (`src/worlds/desk.js`, `desk-scene.js`, `desk-build.js`): a sunlit office cut open like an
  architect's model. Every object is clickable (books are skills, the corkboard is me, the phone is contact,
  floppy disks load other worlds). Scroll for a nine-stop tour. The computer runs **AG/OS** (`os.js`):
  a small operating system with the CV as programs; its taskbar takes SAP transaction codes
  (SU01, SM37, SE16, SBWP, ST22, SE38, ZPROJ, ZCERT, ZWORLD, /NEX), and the terminal answers HELP.

## Changing world

- **The conversation** (`src/guide.js`): I talk to the visitor in the corner, explain how each world works and
  invite them into the others at the right moments. Every reply is a button.
- **The World button** in the header (or `W`) opens a picker with all three worlds.
- **Doors inside the worlds**: the telescope and the lit room on the Medina's rooftop, the floppy disks on
  the desk, and a link in the last Night chapter.

Each destination has its own transition (`src/transition.js`): glass shatter into Night, zellige tiles that
flip over into the Medina, a CRT power-off and power-on into the Desk. The same file tone-maps the HDR worlds and adds
the liquid cursor field.

## Performance

- Each world is its own chunk. Code is prefetched when the browser is idle; a world is only built when the
  visitor shows intent (opens the picker, sees a world card, clicks a door), and its shaders compile in parallel.
- Only the active world renders (both during a transition).
- The device is graded at start (GPU string, cores, memory): shadow map size, MSAA, bloom, the size of the
  Medina's lower town and particle counts scale with it. Add `?tier=0`, `1` or `2` to the URL to force a grade.
- A resolution governor lowers or raises the pixel ratio continuously to hold the frame rate.
- Press `F` for the live HUD: fps, frame time, draw calls, triangles, resolution, GPU.

## Extras

`P` saves a postcard of the current view. Thirteen achievements are listed in the `?` guide.
Generative sound per world (toggle in the header).

## Add real screenshots of your projects

Put images in `src/shots/` named after the project: `olivepalace.png`, `latinadz.png` or `jewelry.png`
(jpg and webp work too; a 16:10 capture of the homepage works best). Rebuild with `npx vite build`.
They appear in the Night project screens, the Medina's shops, and the AG/OS browser.

## Edit and rebuild

```
npm install
npm run dev      # local preview
npx vite build   # writes dist/
```

- Story text shared by every world: the `<template>` blocks in `index.html`
- Medina places, details and the walk: `src/worlds/medina.js`; the town itself: `src/worlds/medina-city.js`
- Desk objects, books and certificates: `src/worlds/desk-scene.js`; AG/OS programs: `src/worlds/os.js`
- Conversation script: `src/guide.js`

Older versions are kept on the branches `archive-four-worlds` (with Planet, Daylight and Blueprint),
`archive-three-worlds`, and `archive-ice-world` (Cold Storage, which the Medina replaced).
