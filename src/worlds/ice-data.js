// The archive: eleven pieces of work in the order they happened, then the person.
// tpl lists the <template> ids in index.html whose text the thawed block shows.
export const SPECIMENS = [
  { key: 'stamp', title: 'First stamp', year: '2021', role: 'Intern', place: 'Transite Baghoura customs office',
    line: 'My first internship. Where the archive starts.',
    html: `<p class="tag">Internship · 2021</p><h3>The first stamp</h3><p>My first internship, at the Transite Baghoura customs office in 2021. The oldest entry in the archive, and the first time I worked inside a real organisation.</p>
      <dl class="readout"><div><dt>Role</dt><dd>Intern</dd></div><div><dt>Where</dt><dd>Transite Baghoura customs office</dd></div><div><dt>Year</dt><dd>2021</dd></div></dl>` },
  { key: 'diploma', title: 'The degrees', year: '2024 · 2025', role: 'Student', place: 'Mohamed El Bachir El Ibrahimi University',
    line: 'A bachelor in information systems, then a master in business intelligence.',
    html: `<p class="tag">Education</p><h3>The degrees</h3><p>Both at Mohamed El Bachir El Ibrahimi University in Bordj Bou Arreridj: first how software is built, then how data becomes decisions.</p>
      <dl class="readout"><div><dt>2024</dt><dd>Bachelor · Information Systems &amp; Software Engineering</dd></div><div><dt>2025</dt><dd>Master 1 · Business Intelligence</dd></div><div><dt>Also</dt><dd>Dale Carnegie Training, certified</dd></div></dl>` },
  { key: 'gears', title: 'The team', year: 'Oct 2024 →', role: 'Backend developer & team lead', place: 'Freelance · Dev Group Service',
    line: 'I lead a remote team of four to six developers and write the backends myself.', tpl: ['d-team', 'd-layer-logic', 'd-layer-data', 'd-layer-ui'] },
  { key: 'olive', title: 'Olive Palace', year: 'Project', role: 'Lead backend developer', place: 'olivepalace.net',
    line: 'Algeria’s first digital platform for the olive industry.', tpl: ['d-olive'], shot: 'd-olive' },
  { key: 'bag', title: 'LatinaDZ', year: 'Project', role: 'Full-stack developer', place: 'latinadz.com',
    line: 'E-commerce for a freelance client: browsing, cart and checkout on every screen.', tpl: ['d-latina'], shot: 'd-latina' },
  { key: 'gem', title: 'Jewelry Store', year: 'Project', role: 'Individual project', place: 'Java · JavaFX · SQLite',
    line: 'Inventory, point of sale and reporting for a jewelry shop, built on MVC.', tpl: ['d-jewelry'], shot: 'd-jewelry' },
  { key: 'crates', title: 'The stock incident', year: 'Jan 2025', role: 'Data analyst & ERP support', place: 'Géant Electronics',
    line: 'Network delays corrupted the stock of nearly every article. Production stopped.', tpl: ['d-geant', 'd-raw', 'd-raw-mismatch', 'd-raw-blocked'] },
  { key: 'wrench', title: 'The repair', year: '2025', role: 'Data analyst', place: 'Géant Electronics',
    line: 'I traced the drift record by record, then built a tool that fixed it automatically.', tpl: ['d-clean-method', 'd-clean-tool'] },
  { key: 'bars', title: 'Dashboards', year: '2025', role: 'Data analyst', place: 'Géant Electronics',
    line: 'Four to six Power BI dashboards that replaced manual reporting.', tpl: ['d-m-dash', 'd-m-flask', 'd-m-users', 'd-m-launch'] },
  { key: 'medals', title: 'Certified', year: 'Mar 2025', role: 'SAP Young Professional', place: 'SAP Young Professionals Program',
    line: 'The SAP Young Professionals Program, and four SAP certifications.',
    html: `<p class="tag">SAP · 2025</p><h3>Certified</h3><p>March to May 2025 in the SAP Young Professionals Program: workshops, simulations and international business-process case studies. And four SAP certifications:</p>
      <ul class="creds"><li><code>C_SAC</code>Data Analyst · SAP Analytics Cloud</li><li><code>TS410</code>Business Process Integration · S/4HANA</li><li><code>S4C03</code>Implementation Consultant · S/4HANA Cloud PE</li><li><code>C_ABAPD_2309</code>Back-End Developer · ABAP Cloud</li></ul>`, tpl: ['d-sys-0', 'd-sys-2'] },
  { key: 'cube', title: 'The planning cube', year: 'Jun 2026 →', role: 'SAP BPC consultant', place: 'CNPC · Beijing Richfit International',
    line: 'Planning, consolidation and reporting on Sonatrach’s SHONE project.', tpl: ['d-shone', 'd-bpf', 'd-epm', 'd-afo', 'd-bwq', 'd-sec', 'd-rep'] },
];
