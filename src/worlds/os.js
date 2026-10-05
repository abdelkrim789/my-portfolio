// AG/OS: a small operating system that runs on the monitor in the Desk world.
// It holds the whole CV as programs. The command field in the taskbar takes SAP transaction codes.
const EMAIL = 'abdelkrimghebouli.34@gmail.com';
const LINKEDIN = 'https://www.linkedin.com/in/abdelkrim-ghebouli';
const CV = './Abdelkrim-Ghebouli-CV.pdf';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ICONS = {
  txt: '<rect x="7" y="3" width="18" height="26" fill="#f4efe0" stroke="#0e1f17" stroke-width="2"/><path d="M11 10h10M11 14h10M11 18h10M11 22h6" stroke="#0e1f17" stroke-width="2"/>',
  jobs: '<rect x="3" y="9" width="26" height="18" fill="#c9a24a" stroke="#0e1f17" stroke-width="2"/><path d="M12 9V5h8v4" fill="none" stroke="#0e1f17" stroke-width="2"/><path d="M3 16h26" stroke="#0e1f17" stroke-width="2"/>',
  table: '<rect x="3" y="5" width="26" height="22" fill="#f4efe0" stroke="#0e1f17" stroke-width="2"/><path d="M3 11h26M3 17h26M3 22h26M12 5v22" stroke="#0e1f17" stroke-width="1.5"/><rect x="3" y="5" width="26" height="6" fill="#2f5a43"/>',
  folder: '<path d="M3 8h10l3 3h13v16H3z" fill="#e7c46b" stroke="#0e1f17" stroke-width="2"/>',
  cert: '<rect x="4" y="5" width="24" height="17" fill="#fbf8ef" stroke="#0e1f17" stroke-width="2"/><circle cx="16" cy="21" r="5" fill="#c9a24a" stroke="#0e1f17" stroke-width="2"/><path d="M13 25l-2 5 5-2 5 2-2-5" fill="#b4302a" stroke="#0e1f17" stroke-width="1.5"/>',
  mail: '<rect x="3" y="8" width="26" height="17" fill="#f4efe0" stroke="#0e1f17" stroke-width="2"/><path d="M3 8l13 10L29 8" fill="none" stroke="#0e1f17" stroke-width="2"/>',
  term: '<rect x="3" y="5" width="26" height="22" fill="#0e1f17" stroke="#c9a24a" stroke-width="2"/><path d="M8 12l4 4-4 4M15 21h8" stroke="#9cff9c" stroke-width="2" fill="none"/>',
  disk: '<rect x="5" y="4" width="22" height="24" fill="#18181d" stroke="#c9a24a" stroke-width="1.5"/><rect x="10" y="4" width="11" height="8" fill="#b8bec6"/><rect x="8" y="17" width="16" height="9" fill="#f4efe0"/>',
  bin: '<path d="M8 9h16l-2 19H10z" fill="#9aa39a" stroke="#0e1f17" stroke-width="2"/><path d="M6 9h20M13 6h6" stroke="#0e1f17" stroke-width="2"/><path d="M13 13v11M19 13v11" stroke="#0e1f17" stroke-width="1.5"/>',
  lab: '<rect x="4" y="4" width="24" height="24" fill="#edf0e8" stroke="#0e1f17" stroke-width="2"/><path d="M4 11h24M4 17h24M4 23h24M12 4v24" stroke="#9fb39a" stroke-width="1.2"/><path d="M14 18l4 4 8-11" fill="none" stroke="#b4302a" stroke-width="2.6"/>',
  web: '<circle cx="16" cy="16" r="12" fill="#bfe0f2" stroke="#0e1f17" stroke-width="2"/><path d="M4 16h24M16 4c-5 6-5 18 0 24M16 4c5 6 5 18 0 24" fill="none" stroke="#0e1f17" stroke-width="1.5"/>',
};
const icon = (k, s = 32) => `<svg viewBox="0 0 32 32" width="${s}" height="${s}" aria-hidden="true">${ICONS[k]}</svg>`;

const JOBS = [
  ['Z_BPC_CONSULTANT', 'Active', 'Jun 2026', '', 'CNPC / Beijing Richfit International', ['d-shone', 'd-bpf', 'd-epm', 'd-afo', 'd-rep']],
  ['Z_DEV_TEAM_LEAD', 'Active', 'Oct 2024', '', 'Freelance / Dev Group Service', ['d-team']],
  ['Z_MASTER1_BI', 'Finished', '', '2025', 'Mohamed El Bachir El Ibrahimi University', null, 'Master 1 in Business Intelligence.'],
  ['Z_SAP_YP_PROGRAM', 'Finished', 'Mar 2025', 'May 2025', 'SAP Young Professionals Program', null, 'Workshops, simulations and international business-process case studies.'],
  ['Z_DATA_ANALYST', 'Finished', 'Jan 2025', 'Jun 2025', 'Géant Electronics', ['d-geant', 'd-raw', 'd-clean-tool']],
  ['Z_BACHELOR_ISSE', 'Finished', '', '2024', 'Mohamed El Bachir El Ibrahimi University', null, 'Bachelor in Information Systems & Software Engineering.'],
  ['Z_INTERN_CUSTOMS', 'Finished', '2021', '2021', 'Transite Baghoura customs office', null, 'My first internship.'],
];
const SKILLS = [
  ['SAP', 'SAP BPC: planning and consolidation', 'SHONE · CNPC'],
  ['SAP', 'Business Process Flows', 'SHONE · CNPC'],
  ['SAP', 'EPM Add-in', 'SHONE · CNPC'],
  ['SAP', 'Analysis for Office', 'SHONE · CNPC'],
  ['SAP', 'BW Query and Security Design', 'BPC/BW training'],
  ['SAP', 'S/4HANA (TS410, S4C03)', 'Certified'],
  ['SAP', 'Analytics Cloud (C_SAC)', 'Certified'],
  ['SAP', 'ABAP Cloud (C_ABAPD_2309)', 'Certified'],
  ['ERP', 'Cegid PMI', 'Géant Electronics'],
  ['BI', 'Power BI', 'Géant Electronics'],
  ['DATA', 'SQL: MySQL, SQL Server, SQLite', 'Projects, Géant'],
  ['DEV', 'Laravel and PHP', 'Olive Palace, LatinaDZ'],
  ['DEV', 'React (Vite)', 'Olive Palace'],
  ['DEV', 'Python (Flask)', 'Géant Electronics'],
  ['DEV', 'Java and JavaFX', 'Jewelry store system'],
  ['TEAM', 'Agile, sprints, code review', 'Dev Group Service'],
];
const CERTS = [
  ['C_SAC', 'SAP Certified Associate', 'Data Analyst · SAP Analytics Cloud'],
  ['TS410', 'SAP Certified', 'Business Process Integration · S/4HANA'],
  ['S4C03', 'SAP Certified', 'Implementation Consultant · S/4HANA Cloud Private Edition'],
  ['C_ABAPD_2309', 'SAP Certified Associate', 'Back-End Developer · ABAP Cloud'],
];
const TCODES = { UJKT: 'lab', ZCONS: 'lab', SU01: 'about', SM37: 'career', SE16: 'skills', SE16N: 'skills', SBWP: 'mail', ZPROJ: 'projects', ZCERT: 'certs', ZWORLD: 'worlds', ZTERM: 'terminal' };

export function createOS(o) {
  const { audio, achieve, travel, shotFor, PROJECTS, onExit } = o;
  const el = document.createElement('div');
  el.className = 'agos';
  el.setAttribute('role', 'application'); el.setAttribute('aria-label', 'AG/OS, the computer on my desk');
  el.innerHTML = `
    <div class="agos-screen">
      <div class="agos-boot"><pre></pre></div>
      <div class="agos-desk">
        <div class="agos-logo" aria-hidden="true">AG/OS</div>
        <ul class="agos-icons"></ul>
        <div class="agos-wins"></div>
        <nav class="agos-start" hidden></nav>
        <div class="agos-bar">
          <button type="button" class="agos-startbtn" aria-haspopup="menu">AG/OS</button>
          <div class="agos-tasks"></div>
          <form class="agos-cmd" autocomplete="off"><label for="agos-tcode">Transaction</label><input id="agos-tcode" name="t" spellcheck="false" placeholder="e.g. SM37" maxlength="20"></form>
          <span class="agos-msg" role="status"></span>
          <time class="agos-clock"></time>
          <button type="button" class="agos-exit" aria-label="Step away from the computer">✕</button>
        </div>
      </div>
      <div class="agos-crt" aria-hidden="true"></div>
    </div>`;
  const $ = (s) => el.querySelector(s);
  const boot = $('.agos-boot pre'), desk = $('.agos-desk'), wins = $('.agos-wins'), tasks = $('.agos-tasks'), start = $('.agos-start');
  const msg = $('.agos-msg'), clock = $('.agos-clock'), cmd = $('.agos-cmd'), cmdIn = $('#agos-tcode');
  let on = false, booted = false, z = 10, scale = 1, msgT = 0, bootT = [];
  const open = new Map();

  const APPS = {
    about: { title: 'About me.txt', icon: 'txt', w: 470, h: 360, body: about },
    career: { title: 'SM37 · Job overview', icon: 'jobs', w: 560, h: 380, body: career, label: 'Career' },
    skills: { title: 'SE16 · Data browser: ZSKILLS', icon: 'table', w: 560, h: 400, body: skills, label: 'Skills' },
    projects: { title: 'C:\\PROJECTS', icon: 'folder', w: 420, h: 220, body: projects, label: 'Projects' },
    lab: { title: 'UJKT · Consolidation Lab', icon: 'lab', w: 690, h: 500, body: lab, label: 'Conso Lab' },
    certs: { title: 'C:\\CERTIFICATES', icon: 'cert', w: 470, h: 300, body: certs, label: 'Certificates' },
    mail: { title: 'SBWP · Business Workplace', icon: 'mail', w: 540, h: 340, body: mail, label: 'Mail' },
    terminal: { title: 'Terminal', icon: 'term', w: 520, h: 330, body: terminal },
    worlds: { title: 'A:\\WORLDS', icon: 'disk', w: 400, h: 220, body: worlds, label: 'Worlds' },
    bin: { title: 'Recycle Bin', icon: 'bin', w: 440, h: 230, body: bin, label: 'Recycle Bin' },
  };
  const ICON_ORDER = ['about', 'career', 'lab', 'skills', 'projects', 'certs', 'mail', 'terminal', 'worlds', 'bin'];
  $('.agos-icons').innerHTML = ICON_ORDER.map((id) => `<li><button type="button" data-app="${id}">${icon(APPS[id].icon, 34)}<span>${APPS[id].label || APPS[id].title}</span></button></li>`).join('');
  el.querySelectorAll('.agos-icons button').forEach((b) => b.addEventListener('click', () => { audio.click(); launch(b.dataset.app); }));
  start.innerHTML = `<p>Abdelkrim Ghebouli</p>${ICON_ORDER.map((id) => `<button type="button" role="menuitem" data-app="${id}">${icon(APPS[id].icon, 20)}${APPS[id].label || APPS[id].title}</button>`).join('')}<hr><button type="button" role="menuitem" data-off>${icon('term', 20)}Shut down</button>`;
  start.querySelectorAll('[data-app]').forEach((b) => b.addEventListener('click', () => { start.hidden = true; launch(b.dataset.app); }));
  start.querySelector('[data-off]').addEventListener('click', () => { start.hidden = true; onExit(); });
  $('.agos-startbtn').addEventListener('click', () => { start.hidden = !start.hidden; audio.click(); });
  desk.addEventListener('pointerdown', (e) => { if (!e.target.closest('.agos-start, .agos-startbtn')) start.hidden = true; });
  $('.agos-exit').addEventListener('click', () => onExit());
  el.addEventListener('click', (e) => { const a = e.target.closest('a[data-lab]'); if (a) { e.preventDefault(); launch('lab'); } });
  cmd.addEventListener('submit', (e) => { e.preventDefault(); runT(cmdIn.value); cmdIn.value = ''; });
  el.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') { if (!start.hidden) start.hidden = true; else onExit(); } else if (e.target.matches('input') && e.key.length === 1) audio.key(); });

  function status(text, kind = 'ok') { msg.textContent = text; msg.className = `agos-msg ${kind}`; clearTimeout(msgT); msgT = setTimeout(() => (msg.textContent = ''), 4200); }
  function runT(v) {
    const raw = String(v).trim().toUpperCase().replace(/^\/N/, '').replace(/^\//, '');
    if (!raw) return false;
    if (raw === 'EX' || raw === 'NEX' || raw === 'END') { onExit(); return true; }
    if (raw === 'ST22') { status('ST22: no ABAP short dumps today.'); achieve('tcode'); return true; }
    if (raw === 'SE38') { launch('terminal'); termPrint('REPORT z_hello.\nWRITE: / \'Hello from Bordj Bou Arreridj\'.\n\nHello from Bordj Bou Arreridj'); achieve('tcode'); return true; }
    const app = TCODES[raw];
    if (app) { launch(app); status(`Transaction ${raw} started`); achieve('tcode'); return true; }
    status(`Transaction ${raw} does not exist`, 'err'); return false;
  }

  // ---------- windows ----------
  function launch(id, arg) {
    const key = arg ? `${id}:${arg}` : id;
    if (open.has(key)) { focus(open.get(key)); return open.get(key); }
    const def = id === 'web' ? webDef(arg) : id === 'cert' ? certDef(arg) : APPS[id];
    const w = document.createElement('section');
    w.className = `agos-win app-${id}`; w.setAttribute('role', 'dialog'); w.setAttribute('aria-label', def.title);
    const n = open.size;
    w.style.width = `${def.w}px`; w.style.height = `${def.h}px`;
    w.style.left = `${Math.max(4, Math.min(800 - def.w - 8, 196 + n * 26))}px`; w.style.top = `${Math.min(560 - def.h, 24 + n * 22)}px`;
    w.innerHTML = `<header>${icon(def.icon, 18)}<b>${esc(def.title)}</b><button type="button" class="x" aria-label="Close ${esc(def.title)}">×</button></header><div class="agos-body"></div>`;
    def.body(w.querySelector('.agos-body'), arg);
    w.querySelector('.x').addEventListener('click', () => close(key));
    w.addEventListener('pointerdown', () => focus(w));
    drag(w, w.querySelector('header'));
    wins.appendChild(w);
    const t = document.createElement('button'); t.type = 'button'; t.innerHTML = `${icon(def.icon, 16)}<span>${esc(def.label || def.title)}</span>`;
    t.addEventListener('click', () => focus(w));
    tasks.appendChild(t);
    w._task = t; w._key = key;
    open.set(key, w);
    focus(w);
    audio.click();
    return w;
  }
  function focus(w) { w.style.zIndex = ++z; open.forEach((x) => { x.classList.toggle('front', x === w); x._task.classList.toggle('on', x === w); }); }
  function close(key) { const w = open.get(key); if (!w) return; w._task.remove(); w.remove(); open.delete(key); audio.click(); }
  function drag(w, handle) {
    handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button') || el.classList.contains('full')) return;
      const sx = e.clientX, sy = e.clientY, l = parseFloat(w.style.left), t = parseFloat(w.style.top);
      handle.setPointerCapture(e.pointerId);
      const mv = (ev) => { w.style.left = `${Math.max(-w.offsetWidth + 80, Math.min(720, l + (ev.clientX - sx) / scale))}px`; w.style.top = `${Math.max(0, Math.min(540, t + (ev.clientY - sy) / scale))}px`; };
      const up = () => { handle.removeEventListener('pointermove', mv); handle.removeEventListener('pointerup', up); };
      handle.addEventListener('pointermove', mv); handle.addEventListener('pointerup', up);
    });
  }

  // ---------- programs ----------
  function about(b) {
    b.innerHTML = `<div class="agos-menu"><span>File</span><span>Edit</span><span>View</span></div><pre class="agos-txt">ABDELKRIM GHEBOULI
SAP BPC consultant · business intelligence

Now     SAP BPC Consultant
        CNPC / Beijing Richfit International
        Sonatrach SHONE: planning, consolidation, reporting
Before  Data analyst and ERP support, Géant Electronics
        Backend developer, lead of a remote team of 4–6
School  Master 1, Business Intelligence (2025)
        Bachelor, Information Systems and Software
        Engineering (2024)
Home    Bordj Bou Arreridj, Algeria · 36.07°N 4.76°E
Speaks  Arabic (native), English (fluent),
        French (intermediate)

Looking for: SAP consultant roles, internationally.</pre>
      <div class="agos-actions"><button type="button" data-a="mail">Write to me</button><a href="${CV}" download data-cv>Download CV</a></div>`;
    b.querySelector('[data-a="mail"]').addEventListener('click', () => launch('mail'));
    achieve('hello');
  }
  function career(b) {
    b.innerHTML = `<p class="agos-cap">Job overview · ${JOBS.length} jobs selected · newest first</p>
      <div class="agos-scroll"><table class="agos-table"><thead><tr><th>Job name</th><th>Status</th><th>Start</th><th>End</th></tr></thead><tbody>
      ${JOBS.map((j, i) => `<tr tabindex="0" data-i="${i}"><td>${j[0]}</td><td><span class="st ${j[1].toLowerCase()}">${j[1]}</span></td><td>${j[2] || '—'}</td><td>${j[3] || (j[1] === 'Active' ? 'running' : '—')}</td></tr>`).join('')}
      </tbody></table></div><div class="agos-log"><p class="agos-cap">Select a job to read its log</p></div>`;
    const log = b.querySelector('.agos-log');
    const pick = (i) => {
      const j = JOBS[i];
      b.querySelectorAll('tbody tr').forEach((r) => r.classList.toggle('sel', +r.dataset.i === i));
      log.innerHTML = `<p class="agos-cap">Job log · ${j[0]} · ${esc(j[4])}</p>`;
      const box = document.createElement('div'); box.className = 'agos-doc';
      if (j[5]) j[5].forEach((id) => { const t = document.getElementById(id); if (t) box.appendChild(t.content.cloneNode(true)); });
      else box.innerHTML = `<p>${esc(j[6])}</p>`;
      log.appendChild(box);
      audio.click();
    };
    b.querySelectorAll('tbody tr').forEach((r) => { r.addEventListener('click', () => pick(+r.dataset.i)); r.addEventListener('keydown', (e) => { if (e.key === 'Enter') pick(+r.dataset.i); }); });
  }
  function skills(b) {
    b.innerHTML = `<form class="agos-filter" onsubmit="return false"><label>Search ZSKILLS <input type="search" spellcheck="false" placeholder="e.g. SAP, Laravel"></label></form>
      <div class="agos-scroll"><table class="agos-table"><thead><tr><th>Area</th><th>Skill</th><th>Used at</th></tr></thead><tbody>
      ${SKILLS.map((s) => `<tr><td>${s[0]}</td><td>${esc(s[1])}</td><td>${esc(s[2])}</td></tr>`).join('')}</tbody></table></div>
      <p class="agos-cap count">${SKILLS.length} entries found</p>`;
    const inp = b.querySelector('input'), rows = [...b.querySelectorAll('tbody tr')], count = b.querySelector('.count');
    inp.addEventListener('input', () => { const q = inp.value.trim().toLowerCase(); let n = 0; rows.forEach((r) => { const hit = !q || r.textContent.toLowerCase().includes(q); r.hidden = !hit; n += hit; }); count.textContent = `${n} entr${n === 1 ? 'y' : 'ies'} found`; });
  }
  function projects(b) {
    b.innerHTML = `<ul class="agos-files">${Object.entries(PROJECTS).map(([d, p]) => `<li><button type="button" data-d="${d}">${icon('web', 40)}<span>${esc(p.name)}</span></button></li>`).join('')}</ul>`;
    b.querySelectorAll('[data-d]').forEach((x) => x.addEventListener('click', () => launch('web', x.dataset.d)));
  }
  function webDef(d) {
    const p = PROJECTS[d];
    return { title: `AG Explorer · ${p.url}`, icon: 'web', w: 600, h: 440, label: p.name, body(b) {
      const src = shotFor(d), t = document.getElementById(d);
      b.innerHTML = `<div class="agos-url"><span>${p.url.includes('·') ? esc(p.url) : `https://${esc(p.url)}`}</span></div><div class="agos-scroll agos-page">${src ? `<img alt="${esc(p.name)}" src="${src}">` : ''}<div class="agos-doc"></div></div>`;
      if (t) b.querySelector('.agos-doc').appendChild(t.content.cloneNode(true));
    } };
  }
  // a real program on the fake computer: the Consolidation Lab, running in its own page
  function lab(b) {
    b.innerHTML = `<div class="agos-url"><span>https://abdelkrim789.github.io/my-portfolio/lab/</span><a href="./lab/" target="_blank" rel="noopener">Full screen</a></div><iframe class="agos-frame" src="./lab/?embed" title="The Consolidation Lab"></iframe>`;
    achieve?.('lab');
  }
  function certs(b) {
    b.innerHTML = `<ul class="agos-files">${CERTS.map((c, i) => `<li><button type="button" data-c="${i}">${icon('cert', 40)}<span>${c[0]}.cer</span></button></li>`).join('')}</ul>`;
    b.querySelectorAll('[data-c]').forEach((x) => x.addEventListener('click', () => launch('cert', x.dataset.c)));
  }
  function certDef(i) {
    const c = CERTS[i];
    return { title: `${c[0]}.cer`, icon: 'cert', w: 440, h: 300, label: c[0], body(b) {
      b.innerHTML = `<div class="agos-cert"><p>${esc(c[1])}</p><b>${c[0]}</b><span>${esc(c[2])}</span><i aria-hidden="true"></i><small>Abdelkrim Ghebouli</small></div>`;
    } };
  }
  function mail(b) {
    b.innerHTML = `<div class="agos-mail"><ul><li class="sel"><b>Abdelkrim Ghebouli</b><span>Let’s work together</span></li></ul>
      <article><p class="agos-cap">From: Abdelkrim Ghebouli &lt;${EMAIL}&gt;<br>Subject: Let’s work together</p>
      <p>Hi! If you are hiring for an SAP role, BPC, BW, S/4HANA or analytics, I would like to hear about it. I’m based in Algeria and open to working internationally.</p>
      <div class="agos-actions"><a href="mailto:${EMAIL}?subject=Hello%20Abdelkrim">Write to me</a><button type="button" data-copy>Copy address</button><a href="${LINKEDIN}" target="_blank" rel="noopener">LinkedIn</a><a href="${CV}" download data-cv>CV</a></div></article></div>`;
    const c = b.querySelector('[data-copy]');
    c.addEventListener('click', async () => { try { await navigator.clipboard.writeText(EMAIL); c.textContent = 'Copied'; } catch { c.textContent = EMAIL; } setTimeout(() => (c.textContent = 'Copy address'), 2400); });
    achieve('hello');
  }
  let termOut = null, termHist = [], termH = 0;
  function termPrint(t) { if (!termOut) return; const p = document.createElement('pre'); p.textContent = t; termOut.appendChild(p); termOut.scrollTop = termOut.scrollHeight; }
  function terminal(b) {
    b.innerHTML = `<div class="agos-term"><div class="out"></div><form><label>C:\\AG&gt;</label><input spellcheck="false" autocomplete="off" aria-label="Command"></form></div>`;
    termOut = b.querySelector('.out');
    termPrint('AG/OS terminal. Type HELP for commands, or a transaction code like SM37.');
    const inp = b.querySelector('input');
    b.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const v = inp.value; inp.value = ''; termHist.push(v); termH = termHist.length; termPrint(`C:\\AG> ${v}`); exec(v); });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' && termH > 0) { inp.value = termHist[--termH]; e.preventDefault(); }
      if (e.key === 'ArrowDown') { termH = Math.min(termHist.length, termH + 1); inp.value = termHist[termH] || ''; }
    });
    setTimeout(() => inp.focus({ preventScroll: true }), 60);
    b.addEventListener('pointerup', () => { if (!getSelection().toString()) inp.focus({ preventScroll: true }); });
  }
  function exec(v) {
    const s = v.trim(), w = s.toLowerCase();
    if (!s) return;
    const say = termPrint;
    if (w === 'help') say('HELP       this list\nWHOAMI     who built this\nDIR        list files\nTYPE ABOUT.TXT\nCAREER  SKILLS  PROJECTS  CERTS  MAIL\nLAB        run a group consolidation\nCV         download my CV\nWORLDS     other worlds  ·  NIGHT  ICE  load one\nDATE       time in Bordj Bou Arreridj\nCLS        clear  ·  EXIT  step away\nSAP people: SU01 SM37 SE16 SBWP ST22 SE38 UJKT');
    else if (w === 'whoami') say('abdelkrim ghebouli · SAP BPC consultant · Bordj Bou Arreridj, DZ');
    else if (w === 'dir' || w === 'ls') say(' ABOUT.TXT      CAREER.SM37    SKILLS.ZTAB\n <PROJECTS>     <CERTS>        CV.PDF\n <WORLDS>       BIN');
    else if (/^(type|cat) about(\.txt)?$/.test(w)) { launch('about'); say('Opened ABOUT.TXT'); }
    else if (['career', 'skills', 'projects', 'certs', 'mail', 'worlds'].includes(w)) { launch(w); say(`Opened ${w.toUpperCase()}`); }
    else if (w === 'lab' || w === 'consolidate' || w === 'conso') { launch('lab'); say('Opened the Consolidation Lab. Press Run the close.'); }
    else if (w === 'cv') { const a = document.createElement('a'); a.href = CV; a.download = ''; document.body.appendChild(a); a.click(); a.remove(); say('Downloading CV.PDF ...'); }
    else if (w === 'date' || w === 'time') say(new Date().toLocaleString('en-GB', { timeZone: 'Africa/Algiers', dateStyle: 'full', timeStyle: 'short' }) + ' · Bordj Bou Arreridj');
    else if (w === 'cls' || w === 'clear') termOut.innerHTML = '';
    else if (w === 'exit' || w === 'logout') onExit();
    else if (w === 'night' || w === 'ice') { say(`LOAD ${w.toUpperCase()}.WLD ...`); setTimeout(() => travel(w), 500); }
    else if (w === 'sudo hire abdelkrim' || w === 'hire abdelkrim') { say('Permission granted. Opening mail ...'); launch('mail'); }
    else if (w === 'coffee') { say('Brewing ... done. ☕'); o.onCoffee?.(); }
    else if (runT(s)) say(`Transaction ${s.toUpperCase()} started`);
    else say(`'${s}' is not a command. Type HELP.`);
  }
  function worlds(b) {
    b.innerHTML = `<ul class="agos-files">${[['night', 'NIGHT.WLD', 'Light in the desert'], ['ice', 'ICE.WLD', 'Cold storage']].map(([w, n, t]) => `<li><button type="button" data-w="${w}">${icon('disk', 40)}<span>${n}</span><small>${t}</small></button></li>`).join('')}</ul>`;
    b.querySelectorAll('[data-w]').forEach((x) => x.addEventListener('click', () => { status(`Loading ${x.dataset.w.toUpperCase()}.WLD ...`); setTimeout(() => travel(x.dataset.w), 400); }));
  }
  function bin(b) {
    b.innerHTML = `<div class="agos-mail"><ul><li class="sel"><b>manual_reports_2024.xls</b><span>Deleted 2025</span></li></ul>
      <article><p>Deleted at Géant Electronics, when four to six Power BI dashboards replaced manual reporting.</p><div class="agos-actions"><button type="button" data-r>Restore</button></div></article></div>`;
    const r = b.querySelector('[data-r]');
    r.addEventListener('click', () => { status('Restore failed: the dashboards are better.', 'err'); r.disabled = true; });
  }

  // ---------- power ----------
  const BIOS = ['AG-BIOS v2.6 · Bordj Bou Arreridj', '', 'CPU    Curiosity @ 4.76 GHz ........ OK', 'RAM    640K ...................... OK', 'DISK   C: CAREER.SYS ............. OK', 'DISK   A: DESK.WLD ............... OK', 'NET    SAP GUI drivers ........... OK', '', 'Starting AG/OS ...'];
  function power(state) {
    on = state;
    bootT.forEach(clearTimeout); bootT = [];
    el.classList.toggle('on', on);
    if (!on) { el.classList.remove('ready'); start.hidden = true; return; }
    if (booted) { el.classList.add('ready'); return; }
    boot.textContent = '';
    const quick = matchMedia('(prefers-reduced-motion: reduce)').matches;
    BIOS.forEach((l, i) => bootT.push(setTimeout(() => { boot.textContent += `${l}\n`; audio.key(); }, quick ? 0 : 160 + i * 150)));
    bootT.push(setTimeout(() => {
      booted = true; el.classList.add('ready');
      if (!open.size && !o.mobile?.()) { const a = launch('about'); a.style.left = '196px'; a.style.top = '22px'; const t = launch('terminal'); t.style.left = '272px'; t.style.top = '210px'; }
      status(o.mobile?.() ? 'Welcome. Tap a program, or type SM37 below.' : 'Welcome. Try a transaction code below: SM37');
      setTimeout(() => cmdIn.focus({ preventScroll: true }), 300);
    }, quick ? 100 : 160 + BIOS.length * 150 + 500));
  }
  setInterval(() => { clock.textContent = new Date().toLocaleTimeString('en-GB', { timeZone: 'Africa/Algiers', hour: '2-digit', minute: '2-digit' }); }, 1000);
  if (/claude\.ai|claudeusercontent/.test(location.hostname)) el.querySelectorAll('[data-cv]').forEach((x) => x.remove());

  return {
    el, power, launch, runT,
    get on() { return on; },
    setScale(s) { scale = s; },
  };
}
