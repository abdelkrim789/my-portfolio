// NOOR (نور, "light"): the guide of the Monument. It answers from a knowledge base about Abdelkrim, written from
// his own story on this site. Matching is by meaning-bearing words, with stems, synonyms and small typos forgiven.
// Every answer can carry actions: walk somewhere, open a secret room, change world, copy the email.
export const EMAIL = 'abdelkrimghebouli.34@gmail.com';
export const LINKEDIN = 'https://www.linkedin.com/in/abdelkrim-ghebouli';

const STOP = new Set('the a an is are was were be been he his him does do did what whats whos when how about tell me you your of in on for to and can could would will please i it its with at as by this that these those abdelkrim ghebouli abdel noor any has have there some just more much give show explain describe know want like my mr him? he?'.split(' '));
const SYN = {
  job: 'role', work: 'role', position: 'role', currently: 'now', current: 'now', today: 'now', present: 'now',
  certificate: 'certification', certified: 'certification', cert: 'certification', certs: 'certification', badge: 'certification',
  degree: 'education', degrees: 'education', study: 'education', studied: 'education', school: 'education', university: 'education', college: 'education', diploma: 'education',
  email: 'contact', mail: 'contact', reach: 'contact', hire: 'contact', recruit: 'contact', interview: 'contact', phone: 'contact', call: 'contact', message: 'contact', write: 'contact',
  resume: 'cv', curriculum: 'cv',
  website: 'project', websites: 'project', site: 'project', app: 'project', apps: 'project', built: 'project', build: 'project', portfolio: 'project',
  tech: 'skill', stack: 'skill', tool: 'skill', tools: 'skill', technology: 'skill', technologies: 'skill', competence: 'skill', expertise: 'skill', abilities: 'skill',
  language: 'languages', speak: 'languages', speaks: 'languages', french: 'languages', english: 'languages', arabic: 'languages',
  hello: 'hi', hey: 'hi', salam: 'hi', salut: 'hi', bonjour: 'hi', marhaba: 'hi', greetings: 'hi', yo: 'hi',
  thank: 'thanks', thx: 'thanks', merci: 'thanks', shukran: 'thanks',
  goodbye: 'bye', ciao: 'bye',
  live: 'location', located: 'location', city: 'location', country: 'location', based: 'location', from: 'location', algeria: 'location',
  relocate: 'relocation', relocation: 'relocation', abroad: 'relocation', international: 'relocation', internationally: 'relocation', remote: 'relocation', visa: 'relocation', move: 'relocation',
  available: 'availability', start: 'availability', notice: 'availability', free: 'availability', open: 'availability',
  pay: 'salary', wage: 'salary', rate: 'salary', money: 'salary', compensation: 'salary',
  secret: 'hidden', secrets: 'hidden', hide: 'hidden', easter: 'hidden', room: 'hidden',
  sonatrach: 'shone', cnpc: 'shone', richfit: 'shone', consolidation: 'shone', consolidated: 'shone',
  dashboard: 'powerbi', dashboards: 'powerbi',
  powerbi: 'powerbi', stock: 'geant', inventory: 'geant', incident: 'geant', cegid: 'geant', erp: 'geant', analyst: 'geant',
  internship: 'intern', customs: 'intern', baghoura: 'intern', first: 'intern',
  lead: 'team', leader: 'team', leadership: 'team', manage: 'team', management: 'team', agile: 'team', developers: 'team', freelance: 'team',
  olive: 'olivepalace', latina: 'latinadz', jewellery: 'jewelry', shop: 'jewelry',
  why: 'strength', strengths: 'strength', best: 'strength', good: 'strength', value: 'strength',
  experience: 'career', years: 'career', history: 'career', journey: 'career', story: 'career', background: 'career', path: 'career',
  ai: 'whoami', robot: 'whoami', human: 'whoami', real: 'whoami', bot: 'whoami', chatgpt: 'whoami', claude: 'whoami',
  night: 'worlds', desk: 'worlds', world: 'worlds', worlds: 'worlds', other: 'worlds',
  vault: 'vault', archive: 'archive', origin: 'archive', roots: 'archive', grew: 'archive', born: 'archive', family: 'archive',
  s4: 's4hana', 's/4hana': 's4hana', s4hana: 's4hana', hana: 's4hana', analytics: 'sac', cloud: 'sac',
  queries: 'bw', query: 'bw', warehouse: 'bw',
};
const stem = (w) => (w.length > 4 ? w.replace(/(ings|ing|ed|es|s)$/, '') : w);
export function tokens(text) {
  return text.toLowerCase().replace(/power\s*bi/g, 'powerbi').replace(/s\/?4\s*hana/g, 's4hana').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9/+#.\s-]/g, ' ').replace(/[.]+(\s|$)/g, ' ')
    .split(/\s+/).filter((w) => w && !STOP.has(w)).map((w) => SYN[w] || SYN[stem(w)] || stem(w));
}
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
const hit = (tok, key) => tok === key || (key.length >= 5 && tok.length >= 5 && (lev(tok, key) <= 1 || tok.startsWith(key) || key.startsWith(tok)));

// k: keywords (already in canonical form). Every intent answers in plain sentences; act names what NOOR can do next.
const KB = [
  { id: 'hi', k: ['hi'], a: 'Hello. I’m NOOR, the guide of this place. Ask me about Abdelkrim’s work, his SAP skills, his projects, or how to reach him.' },
  { id: 'thanks', k: ['thanks'], a: 'You’re welcome. I’m here if anything else comes to mind.' },
  { id: 'bye', k: ['bye'], a: 'Safe travels. The door is always open.' },
  { id: 'whoami', k: ['whoami', 'noor'], a: 'I’m NOOR, which means light in Arabic. I’m the guide built into this portfolio, and I answer from what Abdelkrim has written about his own work. For anything I can’t answer, he’s one email away.' },
  { id: 'help', k: ['help', 'ask', 'question', 'options'], a: 'You can ask about his current role on SHONE, his SAP certifications, the systems he works with, his projects, the Géant Electronics incident, his education, languages, or how to contact him. You can also say “take me to the core”.' },
  { id: 'who', k: ['who', 'introduce', 'summary', 'profile', 'person', 'career'], a: 'Abdelkrim Ghebouli is an SAP BPC consultant from Bordj Bou Arreridj, Algeria. Today he works for CNPC / Beijing Richfit International on Sonatrach’s SHONE project, in planning, consolidation and reporting. Before that he was a data analyst and ERP support specialist at Géant Electronics, led a remote team of developers as a freelancer, and completed a master 1 in business intelligence.', chips: ['What does he do on SHONE?', 'Which certifications?', 'How do I contact him?'] },
  { id: 'now', k: ['now', 'role', 'shone'], w: { shone: 3 }, a: 'Since June 2026 he has been an SAP BPC consultant with CNPC / Beijing Richfit International on Sonatrach’s SHONE project. He configures Business Process Flows, builds reporting in the EPM Add-in and Analysis for Office, and trained in BW query and security design. Everything he does there feeds one consolidated view.', act: { go: 8, label: 'Take me to the core' } },
  { id: 'bpc', k: ['bpc', 'planning', 'bpf', 'epm'], a: 'SAP BPC is his daily system: planning, consolidation and reporting. He configures Business Process Flows to structure and monitor the cycle, and builds reports in the EPM Add-in, the Excel front end for BPC.', act: { go: 8, label: 'See the six streams' } },
  { id: 'bw', k: ['bw', 'afo', 'analysis', 'security'], a: 'He completed specialised training in BW Query Design and Security Design within the BPC/BW landscape, and builds reports in SAP Analysis for Office on top of those BW queries.' },
  { id: 's4hana', k: ['s4hana', 'ts410', 's4c03', 'integration'], a: 'He is certified twice on S/4HANA: TS410, Business Process Integration, and S4C03, Implementation Consultant for S/4HANA Cloud Private Edition.' },
  { id: 'sac', k: ['sac'], a: 'He is an SAP Certified Associate, Data Analyst: SAP Analytics Cloud (C_SAC).' },
  { id: 'abap', k: ['abap', 'backend', 'back-end', 'developer', 'code', 'programming'], a: 'He is an SAP Certified Associate, Back-End Developer: ABAP Cloud (C_ABAPD_2309). Outside SAP he has written Laravel backends for several client platforms, Python and Java.' },
  { id: 'certification', k: ['certification', 'sap'], w: { certification: 3 }, a: 'Four SAP certifications: ABAP Cloud (C_ABAPD_2309), S/4HANA TS410, S/4HANA Cloud S4C03, and SAP Analytics Cloud (C_SAC). Plus the SAP Young Professionals Program and Dale Carnegie training. The certificates themselves are kept in the vault beneath the core.', act: { vault: true, label: 'Open the vault' } },
  { id: 'vault', k: ['vault', 'unlock', 'below', 'beneath', 'underground'], w: { vault: 4 }, a: 'The vault lies beneath the core. Opening it now.', act: { vault: true, auto: true } },
  { id: 'archive', k: ['archive', 'location', 'personal', 'himself'], w: { archive: 3 }, a: 'He is based in Bordj Bou Arreridj, in the north-east of Algeria, at 36.07° N. Some of that story is kept in a room most visitors walk past. Look closely at the walls in the room of the degrees.', act: { archive: true, label: 'Show me the room' } },
  { id: 'skill', k: ['skill', 'systems', 'module', 'modules'], a: 'Twelve systems: SAP BPC, BW, S/4HANA, Analytics Cloud, EPM and Analysis for Office, ABAP, Power BI, Cegid PMI, SQL, Python, Laravel and React. Each is a stone in the wall of systems, and you can power them on.', act: { go: 5, label: 'Show me the wall' } },
  { id: 'powerbi', k: ['powerbi', 'reporting', 'report'], a: 'At Géant Electronics he built and maintained four to six Power BI dashboards used across departments. They gave leadership real-time visibility into operational and financial metrics and replaced manual reporting.' },
  { id: 'geant', k: ['geant', 'repair', 'fix'], w: { geant: 3 }, a: 'At Géant Electronics in 2025, network delays corrupted the stock data of nearly every article in Cegid PMI, and production stopped. He analysed stock at depot and lot level against the full movement history, then built an automated tool that detected and corrected the affected records. Accurate stock was restored company-wide.', act: { go: 7, label: 'Show me the repair' } },
  { id: 'project', k: ['project', 'made', 'created', 'olivepalace', 'latinadz', 'jewelry'], a: 'Three products he built: the backend of Olive Palace, Algeria’s first digital platform for the olive industry; LatinaDZ, an e-commerce platform for a freelance client; and a complete jewelry store management system in Java.', act: { go: 6, label: 'Show me the projects' } },
  { id: 'olivepalace', k: ['olivepalace'], w: { olivepalace: 4 }, a: 'Olive Palace is Algeria’s first digital platform for the olive industry. He was the lead backend developer: Laravel, React with Vite, and MySQL, bringing services and content for experts and users into one scalable architecture. It’s live at olivepalace.net.' },
  { id: 'latinadz', k: ['latinadz'], w: { latinadz: 4 }, a: 'LatinaDZ is an e-commerce platform he built as a full-stack developer for a freelance client: a minimalist interface with responsive product browsing, cart and checkout. Laravel and MySQL. It’s live at latinadz.com.' },
  { id: 'jewelry', k: ['jewelry'], w: { jewelry: 4 }, a: 'A complete retail application for a jewelry store, with inventory, point of sale and reporting modules, designed on MVC for maintainability. Java, JavaFX and SQLite.' },
  { id: 'team', k: ['team', 'sprint', 'review'], a: 'Since October 2024 he has led a remote team of four to six developers as a freelance backend developer and team leader, running sprints and code reviews so client platforms ship on schedule. He is also Dale Carnegie certified.' },
  { id: 'education', k: ['education', 'master', 'bachelor', 'bi', 'intelligence'], a: 'A bachelor in Information Systems and Software Engineering in 2024 and a master 1 in Business Intelligence in 2025, both from Mohamed El Bachir El Ibrahimi University. Then the SAP Young Professionals Program, March to May 2025.', act: { go: 4, label: 'Show me' } },
  { id: 'ypp', k: ['young', 'professionals', 'program', 'programme', 'ypp'], a: 'The SAP Young Professionals Program ran from March to May 2025: workshops, simulations and international business-process case studies, alongside his S/4HANA certifications.' },
  { id: 'dev', k: ['python', 'sql', 'laravel', 'react', 'java', 'php', 'flask', 'mysql', 'javascript', 'javafx'], w: { python: 3, sql: 3, laravel: 3, react: 3, java: 3 }, a: 'Beyond SAP: Python, where he made an internal Flask platform for Cegid PMI configurations nearly 30% faster and automates reporting; SQL query optimisation; Laravel backends for several client platforms; React front ends; and Java with JavaFX for the jewelry store system.' },
  { id: 'intern', k: ['intern'], w: { intern: 2.5 }, a: 'His first door, in 2021: an internship at the Transite Baghoura customs office. It was the first time he worked inside a real organisation.', act: { go: 3, label: 'Show me' } },
  { id: 'languages', k: ['languages'], a: 'Arabic is his native language, his English is fluent and his French intermediate.' },
  { id: 'location', k: ['location', 'where'], a: 'He is based in Bordj Bou Arreridj, Algeria, and open to SAP consultant roles internationally.' },
  { id: 'relocation', k: ['relocation'], a: 'He is open to SAP consultant roles internationally. For the practical side, relocation or remote work, the best is to ask him directly.', act: { contact: true, label: 'Contact him' } },
  { id: 'availability', k: ['availability', 'opportunity', 'job', 'vacancy', 'looking'], a: 'He currently works on SHONE with CNPC and is open to new SAP consultant roles internationally: BPC, BW, S/4HANA and analytics. For timing, write to him directly.', act: { contact: true, label: 'Contact him' } },
  { id: 'salary', k: ['salary'], a: 'That’s a conversation for him directly. Write to him and he’ll answer.', act: { contact: true, label: 'Contact him' } },
  { id: 'contact', k: ['contact', 'linkedin'], w: { contact: 3 }, a: `The fastest way is email: ${EMAIL}. He’s also on LinkedIn, and his CV is one click away.`, act: { contact: true, label: 'Copy the email' } },
  { id: 'cv', k: ['cv', 'download', 'pdf'], w: { cv: 4 }, a: 'Here is his CV.', act: { cv: true, auto: true } },
  { id: 'strength', k: ['strength', 'unique', 'different', 'stand'], a: 'He works on both sides of SAP: the finance processes, planning, consolidation and reporting, and the technical layer, ABAP, SQL, Python and backends. At Géant he didn’t just report a company-wide data failure, he built the tool that repaired it.' },
  { id: 'hidden', k: ['hidden', 'explore', 'surprise'], a: 'Some walls here are not walls. Look closely in the room of the degrees. And the vault beneath the core opens for those who ask.' },
  { id: 'worlds', k: ['worlds'], a: 'This portfolio has three worlds. The Night tells the same story as a journey of light in the desert, and the Desk is his workspace, with a computer that runs his CV. There’s a way to each of them from here.', act: { worlds: true, label: 'Show the worlds' } },
  { id: 'age', k: ['age', 'old', 'birthday'], a: 'That’s one thing I keep to myself. His work says more: ask me about it.' },
  { id: 'nav-core', k: ['go', 'take', 'core', 'center'], w: { core: 3 }, need: ['core', 'center'], a: 'This way.', act: { go: 8, auto: true } },
  { id: 'nav-end', k: ['go', 'take', 'end', 'last'], need: ['end', 'last'], a: 'To the last room.', act: { go: 9, auto: true } },
  { id: 'nav-start', k: ['go', 'back', 'start', 'beginning', 'entrance'], need: ['start', 'beginning', 'entrance'], a: 'Back to the entrance.', act: { go: 2, auto: true } },
  { id: 'streams', k: ['stream', 'six', 'source', 'flow'], w: { stream: 3, source: 2 }, a: 'Opening the six streams: Business Process Flows, the EPM Add-in, Analysis for Office, BW queries, security and reports. Together they make the consolidated view.', act: { streams: true, auto: true } },
  { id: 'poweron', k: ['power', 'systems', 'stone', 'wall', 'light'], need: ['power', 'light', 'switch', 'turn', 'activate', 'wake'], a: 'Powering the wall of systems.', act: { power: true, auto: true } },
  { id: 'lookup', k: ['look', 'up', 'sky', 'stars'], need: ['sky', 'stars', 'up'], a: 'Look up.', act: { night: true, auto: true } },
];

const RULES = [
  [/\b(who|what) are you\b|\byour name\b|\bare you (an? )?(ai|bot|robot|human|real|chatgpt)\b/, 'whoami'],
  [/\bwhat (does|do) (he|abdelkrim|ghebouli) do\b|\bwhat is (his|the) (role|job|position)\b|\bwhere does he work\b/, 'now'],
  [/\bwhy (should|would) (i|we|someone) hire\b/, 'strength'],
];
const byId = (id) => KB.find((k) => k.id === id);
export function answer(q) {
  const low = q.toLowerCase();
  for (const [re, id] of RULES) if (re.test(low)) return byId(id);
  const T = tokens(q);
  if (!T.length) return /\b(him|abdelkrim|ghebouli|he)\b/.test(low) ? byId('who') : null;
  let best = null, bestS = 0;
  for (const it of KB) {
    if (it.need && !it.need.some((n) => T.some((t) => hit(t, n)))) continue;
    let s = 0;
    for (const k of it.k) if (T.some((t) => hit(t, k))) s += (it.w?.[k] || 1.5) + (k.length > 6 ? 0.3 : 0);
    if (s > bestS) { bestS = s; best = it; }
  }
  return bestS >= 1.5 ? best : null;
}
export const FALLBACK = 'I don’t have that one yet. You can ask about his current role, SAP certifications, projects, the Géant incident, education, languages, or how to contact him. Or write to him directly.';
