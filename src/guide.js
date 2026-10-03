import { WORLDS, WORLD_ORDER, worldName } from './worlds.js';

// The portfolio talks. A small conversation with me in the corner: it says hello, explains how each world works,
// and invites the visitor into the other worlds at the right moments. Every reply is a button; nothing to type.
const EMAIL = 'abdelkrimghebouli.34@gmail.com';
const LINKEDIN = 'https://www.linkedin.com/in/abdelkrim-ghebouli';
const CV = './Abdelkrim-Ghebouli-CV.pdf';

export function createGuide(o) {
  const { meURL, getWorld, travel, visited, reduced, coarse, sound } = o;
  const thumbs = o.thumbs || {};
  const root = document.getElementById('talk');
  root.innerHTML = `
    <div class="talk-stack" role="log" aria-live="polite" aria-label="Conversation with Abdelkrim"></div>
    <div class="talk-me">
      <button class="talk-face" type="button" aria-label="Talk to Abdelkrim" aria-expanded="false">
        <img alt="" src="${meURL}" width="52" height="52"><i class="dot" aria-hidden="true"></i><b class="badge" hidden>1</b>
      </button>
      <span class="talk-name" aria-hidden="true">Abdelkrim<small>online · tap to talk</small></span>
    </div>`;
  const stack = root.querySelector('.talk-stack');
  const face = root.querySelector('.talk-face');
  const badge = root.querySelector('.badge');
  const store = (k, d) => { try { return JSON.parse(sessionStorage.getItem(k) || 'null') ?? d; } catch { return d; } };
  const keep = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const once = new Set(store('ag-talk-once', []));
  let returning = false;
  try { returning = !!localStorage.getItem('ag-talked'); localStorage.setItem('ag-talked', '1'); } catch {}
  let seq = 0, quietT = 0, lastActivity = performance.now(), idles = 0, open = false, pending = false;

  const unvisited = () => WORLD_ORDER.filter((w) => w !== getWorld() && !visited.has(w));
  const others = () => WORLD_ORDER.filter((w) => w !== getWorld());
  const pickOther = () => unvisited()[0] || others()[0];
  const here = () => worldName(getWorld());
  const HOW = {
    night: ['Scroll and I’ll take you through my story, chapter by chapter.', 'The glowing labels open each part. Drag to look around.'],
    monument: ['Scroll to cross the dunes and walk the hall, one chapter at a time. W A S D or a click on the floor lets you roam.', 'Inside, NOOR answers anything about me. And two rooms are hidden.'],
    desk: ['Everything on this desk is clickable, or just scroll for a tour.', 'Start with the computer: it runs my CV.'],
  };
  const ICON = { night: '✦', monument: '◆', desk: '▣' };

  // ---------- the script ----------
  const NODES = {
    hello: () => returning && visited.size > 1
      ? { say: ['Welcome back! 👋', unvisited().length ? `You haven’t seen ${worldName(pickOther())} yet. Want to?` : `You’re in ${here()}. Pick up where you left off.`],
          replies: unvisited().length ? [[`Take me there ${ICON[pickOther()]}`, { travel: pickOther() }], ['Not now', 'bye']] : [['Show me the worlds', 'worlds'], ['Not now', 'bye']] }
      : { say: ['Salam! 👋 I’m Abdelkrim.', `This portfolio isn’t one page, it’s three worlds. You’re in ${here()} right now.`],
          replies: [['Show me the worlds', 'worlds'], ['How do I explore?', 'how'], ['Who are you?', 'who']] },
    how: () => ({ say: HOW[getWorld()], replies: [['Got it', 'bye'], ['Other worlds?', 'worlds']] }),
    worlds: () => ({ say: ['Same story, three ways to live it. Pick one:'], cards: true }),
    who: () => ({ say: ['SAP BPC consultant at CNPC, on Sonatrach’s SHONE project.', 'Before that: data analyst, ERP support, and lead of a small dev team. Based in Bordj Bou Arreridj, Algeria.'],
      replies: [['How can I reach you?', 'contact'], ['Show me the worlds', 'worlds']] }),
    contact: () => ({ say: ['Let’s talk. I’m open to SAP consultant roles internationally.'], contact: true, replies: [['Thanks!', 'bye']] }),
    menu: () => ({ say: ['What can I do for you?'], replies: [['Change world', 'worlds'], ['Contact', 'contact'], ['Who are you?', 'who'], ['How do I explore?', 'how']] }),
    bye: () => ({ say: [['Enjoy! I’m here if you need me.', 'Have fun. Click my face any time.', 'Okay! I’ll be in the corner.'][(Math.random() * 3) | 0]], quiet: 2600 }),
    // arrivals
    'enter-night': () => ({ say: ['Back in the desert, at night. ✦', HOW.night[0]] }),
    'enter-monument': () => ({ say: ['This is the Monument. ◆', HOW.monument[0]] }),
    'enter-desk': () => ({ say: ['Welcome to my desk. Make yourself at home.', HOW.desk[0], HOW.desk[1]] }),
    // invitations
    'night-tease': () => ({ say: ['Psst. The same story stands as a monument in the Sahara, with an AI guide inside.', 'Want to see it?'],
      replies: [['Enter the Monument ◆', { travel: 'monument' }], ['Later', 'bye']] }),
    'night-end': () => ({ say: ['That’s the end of the night story.', 'Two more worlds are waiting:'], cards: 'others' }),
    'monument-hall': () => ({ say: ['NOOR will guide you from here. Ask it anything. I’ll be in the corner if you want another world.'], quiet: 6000 }),
    'monument-end': () => ({ say: ['You reached the last room. ◆', 'Look up and the ceiling opens onto the Night. The office door in the fourth bay leads to my desk.'], replies: [['How do I contact you?', 'contact'], ['Show the worlds', 'worlds']] }),
    'desk-tease': () => ({ say: ['Now you know my system. 😄', 'Want the same story as light in the desert, or as a monument in the Sahara?'], cards: 'others' }),
    'desk-floppy': () => ({ say: ['Nice find. Those floppy disks are worlds.', 'Click one and the computer loads it.'] }),
    idle: () => {
      const w = pickOther();
      return { say: [[`Still there? 🙂 ${HOW[getWorld()][1]}`, `Tip: there’s a whole other world called ${worldName(w)}. ${WORLDS[w].pitch}`][idles % 2]],
        replies: idles % 2 ? [[`Go to ${worldName(w)} ${ICON[w]}`, { travel: w }], ['Later', 'bye']] : [] };
    },
    travel: (w) => ({ say: [[`Hold on, rebuilding the universe…`, `Loading ${worldName(w)}…`, `Off we go → ${worldName(w)}`][(Math.random() * 3) | 0]], quiet: 2400 }),
  };

  // ---------- rendering ----------
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? Math.min(ms, 60) : ms));
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function trim(max) { const items = [...stack.children]; while (items.length > max) items.shift().remove(); }
  function show() { open = true; root.classList.remove('quiet'); root.classList.add('open'); face.setAttribute('aria-expanded', 'true'); badge.hidden = true; }
  function quiet(force) {
    if (pending && !force) return;
    open = false; root.classList.add('quiet'); root.classList.remove('open'); face.setAttribute('aria-expanded', 'false');
    if (pending) { badge.hidden = false; root.classList.add('waiting'); }
  }
  function armQuiet(ms) { clearTimeout(quietT); quietT = setTimeout(() => quiet(true), ms); }

  function card(w, big = false) {
    const cur = w === getWorld();
    const b = el('button', `w-card${big ? ' big' : ''}${cur ? ' here' : ''}`);
    b.type = 'button'; b.dataset.world = w;
    const art = thumbs[w] ? `<span class="art" style="background-image:url(${thumbs[w]})"></span>` : `<span class="art art-${w}"></span>`;
    b.innerHTML = `${art}<span class="w-txt"><b>${WORLDS[w].name}</b><small>${big ? WORLDS[w].pitch : WORLDS[w].how}</small><em>${cur ? 'You\u2019re here' : visited.has(w) ? 'Go back' : 'Go there'}</em></span>`;
    b.setAttribute('aria-label', cur ? `${WORLDS[w].name}: you are here` : `Enter ${WORLDS[w].name}: ${WORLDS[w].pitch}`);
    if (cur) b.disabled = true;
    b.addEventListener('click', () => {
      const r = b.getBoundingClientRect();
      closePicker();
      go({ travel: w, x: r.left + r.width / 2, y: r.top + r.height / 2 }, `${WORLDS[w].name} ${ICON[w]}`);
    });
    return b;
  }
  function cards(which) {
    (which === 'others' ? others() : WORLD_ORDER).forEach((w) => o.warm?.(w));
    const box = el('div', 'w-cards');
    (which === 'others' ? others() : WORLD_ORDER).forEach((w) => box.appendChild(card(w)));
    return box;
  }
  function contactCard() {
    const c = el('div', 'talk-contact');
    c.innerHTML = `<span class="mail">${EMAIL}</span><div class="row"><button type="button" class="copy">Copy email</button><a href="${LINKEDIN}" target="_blank" rel="noopener">LinkedIn ↗</a><a href="${CV}" download data-cv>CV ↓</a></div>`;
    const btn = c.querySelector('.copy');
    btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(EMAIL); btn.textContent = 'Copied ✓'; } catch { btn.textContent = 'Select it above'; }
      o.achieve?.('hello'); setTimeout(() => (btn.textContent = 'Copy email'), 2200);
    });
    if (/claude\.ai|claudeusercontent/.test(location.hostname)) c.querySelector('[data-cv]').remove();
    return c;
  }

  async function play(id, arg) {
    const node = NODES[id]?.(arg);
    if (!node) return;
    const my = ++seq;
    clearTimeout(quietT);
    pending = false; root.classList.remove('waiting');
    show();
    [...stack.querySelectorAll('.chips, .w-cards, .talk-contact')].forEach((n) => n.remove());
    const olds = [...stack.querySelectorAll('.bubble')]; olds.slice(0, -1).forEach((n) => n.remove());
    for (const line of node.say) {
      const typing = el('div', 'bubble typing', '<i></i><i></i><i></i>');
      stack.appendChild(typing); trim(3);
      await wait(Math.min(1300, 380 + line.length * 16));
      if (my !== seq) { typing.remove(); return; }
      typing.className = 'bubble'; typing.textContent = line;
      sound?.('msg');
      await wait(260);
    }
    if (my !== seq) return;
    if (node.cards) { stack.appendChild(cards(node.cards)); pending = true; }
    if (node.contact) stack.appendChild(contactCard());
    if (node.replies?.length) {
      const chips = el('div', 'chips');
      node.replies.forEach(([label, act]) => {
        if (act && act.travel) o.warm?.(act.travel);
        const b = el('button', 'chip-r'); b.type = 'button'; b.textContent = label;
        b.addEventListener('click', () => { const r = b.getBoundingClientRect(); go(typeof act === 'string' ? act : { ...act, x: r.left + r.width / 2, y: r.top + r.height / 2 }, label); });
        chips.appendChild(b);
      });
      stack.appendChild(chips);
      pending = true;
    }
    trim(6);
    const read = node.say.join(' ').length * 45;
    armQuiet(node.quiet || (pending ? (coarse ? 14000 : 24000) : Math.max(coarse ? 5000 : 6500, read)));
  }
  function go(act, echo) {
    if (echo) { stack.querySelectorAll('.chips, .w-cards').forEach((n) => n.remove()); stack.appendChild(el('div', 'bubble me', '')).textContent = echo.replace(/ [✷▣✦]$/, ''); trim(5); }
    if (typeof act === 'string') { play(act); return; }
    if (act.travel) { pending = false; play('travel', act.travel); travel(act.travel, act.x, act.y); }
  }

  face.addEventListener('click', () => {
    if (open) { quiet(true); return; }
    if (stack.children.length && (pending || root.classList.contains('waiting'))) { show(); armQuiet(24000); return; }
    play('menu');
  });
  root.addEventListener('pointerenter', () => { if (open) clearTimeout(quietT); });
  root.addEventListener('pointerleave', () => { if (open) armQuiet(pending ? 12000 : 4000); });
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); quiet(true); face.focus(); } });

  // ---------- world picker (header button) ----------
  const picker = document.getElementById('world-panel');
  function openPicker() {
    if (!picker) return;
    const list = picker.querySelector('.w-list');
    WORLD_ORDER.forEach((w) => o.warm?.(w));
    list.replaceChildren(...WORLD_ORDER.map((w) => card(w, true)));
    picker.hidden = false;
    (list.querySelector('.w-card:not([disabled])') || picker.querySelector('.close'))?.focus();
  }
  function closePicker() { if (picker && !picker.hidden) picker.hidden = true; }
  picker?.querySelector('.close')?.addEventListener('click', closePicker);
  picker?.addEventListener('click', (e) => { if (e.target === picker) closePicker(); });

  // idle nudges
  setInterval(() => {
    if (document.hidden || open || idles >= 2) return;
    if (document.querySelector('.agos.shown, .md-panel.detail, .desk-card.expanded, #detail.open')) { lastActivity = performance.now(); return; }
    if (performance.now() - lastActivity > 45000) { lastActivity = performance.now(); play('idle'); idles++; }
  }, 4000);

  return {
    play,
    event(name, data) {
      const key = data != null ? `${name}:${data}` : name;
      const firstOnly = name !== 'enter';
      if (firstOnly && once.has(key)) return;
      if (name === 'enter') { if (once.has(key)) return; }
      once.add(key); keep('ag-talk-once', [...once]);
      if (name === 'boot') play('hello');
      else if (name === 'enter') play(`enter-${data}`);
      else play(name);
    },
    activity() { lastActivity = performance.now(); },
    contact() { play('contact'); },
    openPicker, closePicker,
    get pickerOpen() { return !!picker && !picker.hidden; },
    quiet: () => quiet(true),
  };
}
