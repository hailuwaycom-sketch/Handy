#!/usr/bin/env node
// ============================================================
// Forge — Backlog engine (shards -> generated views)
// ============================================================
// Backlog con ciclo de vida (getforja/forge-pro#3 point 2). Reemplaza el
// KANBAN.md monolítico editado a mano por:
//
//   fuente de verdad : 1 shard markdown por ticket, frontmatter tipado, en
//                       .claude/backlog/tickets/<id>.md
//   vistas generadas : el board + tablas + métricas en KANBAN.md (entre
//                       marcadores) y .claude/backlog/registry.yaml — SIEMPRE
//                       regeneradas por este script, NUNCA editadas a mano.
//   sin conflictos   : las vistas se marcan merge=union en .gitattributes, así
//                       dos sesiones de agentes en paralelo no chocan.
//
// Uso:
//   node .claude/skills/backlog/backlog.mjs build
//   node .claude/skills/backlog/backlog.mjs new --id T-001 --title "..." [--kind story --pts 3 --priority alta --epic X]
//   node .claude/skills/backlog/backlog.mjs move <id> <status>
//   node .claude/skills/backlog/backlog.mjs stats
//
// Zero dependencias — corre en node pelado.
// ============================================================
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DIR = join(ROOT, '.claude/backlog');
const TICKETS = join(DIR, 'tickets');
const REGISTRY = join(DIR, 'registry.yaml');
const BOARD = join(ROOT, 'KANBAN.md');
const GITATTR = join(ROOT, '.gitattributes');
const START = '<!-- FORGE:BACKLOG:START -->';
const END = '<!-- FORGE:BACKLOG:END -->';

// status -> column label. Order defines board columns left→right.
const COLUMNS = [
  ['backlog', '📋 Backlog'],
  ['planning', '📐 Planning'],
  ['dev', '🔨 Dev'],
  ['qa', '🧪 QA'],
  ['review', '👀 Review'],
  ['done', '✅ Done'],
];
const STATUSES = new Set(COLUMNS.map(c => c[0]));
const PRIORITY = { alta: '🔴', media: '🟡', baja: '🟢' };

// ---- shard I/O (no yaml dep: flat key: value frontmatter) ----
function parseShard(file) {
  const raw = readFileSync(file, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: sin frontmatter`);
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (kv) fm[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return { fm, body: m[2], file };
}

function loadTickets() {
  if (!existsSync(TICKETS)) return [];
  return readdirSync(TICKETS)
    .filter(f => f.endsWith('.md'))
    .map(f => parseShard(join(TICKETS, f)))
    .sort((a, b) => (a.fm.id || '').localeCompare(b.fm.id || ''));
}

function validate(tickets) {
  const errors = [];
  const seen = new Set();
  for (const t of tickets) {
    const id = t.fm.id;
    const where = t.file.replace(ROOT, '.');
    if (!id) { errors.push(`${where}: falta id`); continue; }
    if (seen.has(id)) errors.push(`${where}: id duplicado ${id}`);
    seen.add(id);
    if (!t.fm.title) errors.push(`${id}: falta title`);
    if (!STATUSES.has(t.fm.status))
      errors.push(`${id}: status "${t.fm.status}" inválido (usar: ${[...STATUSES].join(', ')})`);
    if (t.fm.pts && isNaN(Number(t.fm.pts))) errors.push(`${id}: pts "${t.fm.pts}" no es número`);
  }
  return errors;
}

// ---- views ----
function board(tickets) {
  const byCol = Object.fromEntries(COLUMNS.map(([s]) => [s, []]));
  for (const t of tickets) byCol[t.fm.status]?.push(t);

  let out = '';
  out += `> Regenerado por \`backlog.mjs\` — **no editar a mano** (editá los shards en \`.claude/backlog/tickets/\`).\n\n`;

  // header row with counts
  const heads = COLUMNS.map(([s, label]) => `${label} (${byCol[s].length})`);
  out += '| ' + heads.join(' | ') + ' |\n';
  out += '| ' + COLUMNS.map(() => '---').join(' | ') + ' |\n';
  const depth = Math.max(1, ...COLUMNS.map(([s]) => byCol[s].length));
  for (let i = 0; i < depth; i++) {
    const cells = COLUMNS.map(([s]) => {
      const t = byCol[s][i];
      if (!t) return '';
      const blocked = /^(true|1|yes|sí|si)$/i.test(t.fm.blocked || '') ? '🚫 ' : '';
      const pr = PRIORITY[t.fm.priority] || '';
      const pts = t.fm.pts ? ` ·${t.fm.pts}` : '';
      return `${blocked}${pr} ${t.fm.id}${pts}`.trim();
    });
    out += '| ' + cells.join(' | ') + ' |\n';
  }

  // detail tables per column with content
  for (const [s, label] of COLUMNS) {
    if (!byCol[s].length) continue;
    out += `\n### ${label}\n\n`;
    out += '| ID | Título | Prio | Pts | Epic |\n|---|---|---|---|---|\n';
    for (const t of byCol[s]) {
      out += `| ${t.fm.id} | ${t.fm.title || ''} | ${PRIORITY[t.fm.priority] || ''} ${t.fm.priority || ''} | ${t.fm.pts || '—'} | ${t.fm.epic || '—'} |\n`;
    }
  }
  return out + metrics(tickets);
}

function metrics(tickets) {
  const total = tickets.length;
  const done = tickets.filter(t => t.fm.status === 'done');
  const blocked = tickets.filter(t => /^(true|1|yes|sí|si)$/i.test(t.fm.blocked || ''));
  const ptsTotal = sum(tickets.map(t => Number(t.fm.pts) || 0));
  const ptsDone = sum(done.map(t => Number(t.fm.pts) || 0));
  const pct = total ? Math.round((done.length / total) * 100) : 0;

  // velocity: pts done per sprint. n/a (not a fabricated 0) if no sprint data.
  const sprints = {};
  for (const t of done) {
    const sp = t.fm.sprint;
    if (!sp) continue;
    sprints[sp] = (sprints[sp] || 0) + (Number(t.fm.pts) || 0);
  }
  const sprintKeys = Object.keys(sprints);
  const velocity = sprintKeys.length
    ? (sum(sprintKeys.map(k => sprints[k])) / sprintKeys.length).toFixed(1) + ' pts/sprint'
    : 'n/a (sin campo `sprint` en tickets done)';

  let out = `\n## 📈 Métricas\n\n`;
  out += `| Métrica | Valor |\n|---|---|\n`;
  out += `| Tickets | ${total} |\n`;
  out += `| Completados | ${done.length} (${pct}%) |\n`;
  out += `| Puntos | ${ptsDone}/${ptsTotal || 'n/a'} |\n`;
  out += `| Velocity | ${velocity} |\n`;
  out += `| Bloqueados | ${blocked.length}${blocked.length ? ' 🚫 ' + blocked.map(t => t.fm.id).join(', ') : ''} |\n`;
  return out;
}

const sum = a => a.reduce((x, y) => x + y, 0);

function registry(tickets) {
  let y = `# GENERADO por backlog.mjs — no editar a mano. Fuente: tickets/*.md\n`;
  y += `tickets:\n`;
  for (const t of tickets) {
    y += `  - id: ${t.fm.id}\n`;
    y += `    title: ${JSON.stringify(t.fm.title || '')}\n`;
    y += `    kind: ${t.fm.kind || 'story'}\n`;
    y += `    status: ${t.fm.status}\n`;
    y += `    priority: ${t.fm.priority || 'media'}\n`;
    y += `    pts: ${t.fm.pts || 'null'}\n`;
    y += `    epic: ${t.fm.epic ? JSON.stringify(t.fm.epic) : 'null'}\n`;
    y += `    sprint: ${t.fm.sprint || 'null'}\n`;
  }
  return y;
}

// ---- markers + gitattributes ----
function writeBoard(content) {
  const block = `${START}\n${content}\n${END}`;
  if (!existsSync(BOARD)) {
    writeFileSync(BOARD, `# KANBAN\n\n${block}\n`, 'utf8');
    return;
  }
  let cur = readFileSync(BOARD, 'utf8');
  if (cur.includes(START) && cur.includes(END)) {
    cur = cur.replace(new RegExp(`${escapeRe(START)}[\\s\\S]*?${escapeRe(END)}`), block);
  } else {
    cur = cur.trimEnd() + `\n\n${block}\n`;
  }
  writeFileSync(BOARD, cur, 'utf8');
}
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function ensureGitattributes() {
  const lines = ['KANBAN.md merge=union', '.claude/backlog/registry.yaml merge=union'];
  let cur = existsSync(GITATTR) ? readFileSync(GITATTR, 'utf8') : '';
  let changed = false;
  for (const l of lines) {
    if (!cur.split(/\r?\n/).includes(l)) {
      cur = cur.trimEnd() + (cur.trim() ? '\n' : '') + l + '\n';
      changed = true;
    }
  }
  if (changed) writeFileSync(GITATTR, cur, 'utf8');
  return changed;
}

// ---- commands ----
function cmdBuild() {
  const tickets = loadTickets();
  const errors = validate(tickets);
  if (errors.length) {
    console.error(`⛔ ${errors.length} error(es) en los shards:`);
    for (const e of errors) console.error('  ' + e);
    process.exit(1);
  }
  writeBoard(board(tickets));
  mkdirSync(DIR, { recursive: true });
  writeFileSync(REGISTRY, registry(tickets), 'utf8');
  const ga = ensureGitattributes();
  console.log(`✓ ${tickets.length} tickets → KANBAN.md + registry.yaml regenerados.${ga ? ' (.gitattributes: merge=union añadido)' : ''}`);
}

function arg(flag, def = '') {
  const i = process.argv.indexOf(flag);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

function cmdNew() {
  const id = arg('--id');
  const title = arg('--title');
  if (!id || !title) { console.error('Uso: new --id T-001 --title "..." [--kind --pts --priority --epic]'); process.exit(1); }
  mkdirSync(TICKETS, { recursive: true });
  const file = join(TICKETS, `${id}.md`);
  if (existsSync(file)) { console.error(`✗ ya existe ${file}`); process.exit(1); }
  const today = arg('--date', 'YYYY-MM-DD'); // caller stamps date; no Date.now() so runs are deterministic in CI
  const fm = [
    '---',
    `id: ${id}`,
    `kind: ${arg('--kind', 'story')}`,
    `title: ${JSON.stringify(title)}`,
    `epic: ${arg('--epic') ? JSON.stringify(arg('--epic')) : 'null'}`,
    `pts: ${arg('--pts', 'null')}`,
    `priority: ${arg('--priority', 'media')}`,
    `status: ${arg('--status', 'backlog')}`,
    `sprint: ${arg('--sprint', 'null')}`,
    `blocked: false`,
    `created: ${today}`,
    `updated: ${today}`,
    '---',
    '',
    `## ${title}`,
    '',
    '**Criterios de aceptación:**',
    '- [ ] ',
    '',
  ].join('\n');
  writeFileSync(file, fm, 'utf8');
  console.log(`✓ shard creado: ${file.replace(ROOT, '.')}  — corré 'build' para regenerar las vistas.`);
}

function cmdMove() {
  const id = process.argv[3];
  const status = process.argv[4];
  if (!id || !status) { console.error('Uso: move <id> <status>'); process.exit(1); }
  if (!STATUSES.has(status)) { console.error(`✗ status inválido: ${status} (usar ${[...STATUSES].join(', ')})`); process.exit(1); }
  const file = join(TICKETS, `${id}.md`);
  if (!existsSync(file)) { console.error(`✗ no existe ${file}`); process.exit(1); }
  let raw = readFileSync(file, 'utf8');
  if (!/^status:\s*.*$/m.test(raw)) { console.error(`✗ ${id}: sin campo status`); process.exit(1); }
  raw = raw.replace(/^status:\s*.*$/m, `status: ${status}`);
  writeFileSync(file, raw, 'utf8');
  console.log(`✓ ${id} → ${status}. Regenerando…`);
  cmdBuild();
}

function cmdStats() {
  const tickets = loadTickets();
  process.stdout.write(metrics(tickets).replace(/^\n/, ''));
}

const cmd = process.argv[2];
if (cmd === 'build') cmdBuild();
else if (cmd === 'new') cmdNew();
else if (cmd === 'move') cmdMove();
else if (cmd === 'stats') cmdStats();
else {
  console.log('Uso: backlog.mjs <build|new|move|stats>');
  process.exit(cmd ? 1 : 0);
}
