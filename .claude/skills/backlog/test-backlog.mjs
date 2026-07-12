#!/usr/bin/env node
// Smoke tests for backlog.mjs (getforja/forge-pro#3 point 2 + point 6).
// Runs the engine against throwaway projects and asserts the generated views.
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const GEN = join(dirname(fileURLToPath(import.meta.url)), 'backlog.mjs');
let fail = 0;
const ok = (name, cond) => { console.log(`  ${cond ? 'ok  ' : 'FAIL'}: ${name}`); if (!cond) fail = 1; };
const run = (cwd, ...args) => spawnSync('node', [GEN, ...args], { cwd, encoding: 'utf8' });

function project() {
  const dir = mkdtempSync(join(tmpdir(), 'forge-backlog-'));
  mkdirSync(join(dir, '.claude/backlog/tickets'), { recursive: true });
  return dir;
}
function shard(dir, id, extra = '') {
  writeFileSync(join(dir, '.claude/backlog/tickets', id + '.md'),
    `---\nid: ${id}\nkind: story\ntitle: "T ${id}"\npts: 2\npriority: alta\nstatus: dev\nsprint: S1\nblocked: false\n${extra}---\n`);
}

// 1. build generates views between markers
{
  const d = project();
  shard(d, 'T-001'); shard(d, 'T-002');
  const r = run(d, 'build');
  ok('build exit 0', r.status === 0);
  const kb = existsSync(join(d, 'KANBAN.md')) ? readFileSync(join(d, 'KANBAN.md'), 'utf8') : '';
  ok('KANBAN.md has markers', kb.includes('FORGE:BACKLOG:START') && kb.includes('FORGE:BACKLOG:END'));
  ok('board lists T-001', kb.includes('T-001'));
  ok('registry.yaml written', existsSync(join(d, '.claude/backlog/registry.yaml')));
  ok('.gitattributes merge=union', existsSync(join(d, '.gitattributes')) &&
     readFileSync(join(d, '.gitattributes'), 'utf8').includes('merge=union'));
  rmSync(d, { recursive: true, force: true });
}

// 2. move updates the shard and regenerates; idempotent markers (no nesting)
{
  const d = project();
  shard(d, 'T-001');
  run(d, 'build');
  run(d, 'move', 'T-001', 'done');
  const shardTxt = readFileSync(join(d, '.claude/backlog/tickets/T-001.md'), 'utf8');
  ok('shard status moved to done', /status:\s*done/.test(shardTxt));
  const kb = readFileSync(join(d, 'KANBAN.md'), 'utf8');
  ok('single START marker (idempotent)', kb.split('FORGE:BACKLOG:START').length - 1 === 1);
  ok('velocity computed from sprint', /pts\/sprint/.test(kb));
  rmSync(d, { recursive: true, force: true });
}

// 3. invalid shard fails closed (exit 1), no half-written views
{
  const d = project();
  writeFileSync(join(d, '.claude/backlog/tickets/T-x.md'), `---\nid: T-x\ntitle: bad\nstatus: nope\n---\n`);
  const r = run(d, 'build');
  ok('bad status -> exit 1', r.status === 1);
  ok('error names the field', /status/.test(r.stderr));
  rmSync(d, { recursive: true, force: true });
}

// 4. velocity is n/a (not fabricated) when no sprint on done tickets
{
  const d = project();
  // a done ticket with NO sprint field -> velocity must be n/a, not a made-up 0
  writeFileSync(join(d, '.claude/backlog/tickets/T-001.md'),
    `---\nid: T-001\ntitle: "no sprint"\npts: 3\npriority: baja\nstatus: done\nblocked: false\n---\n`);
  run(d, 'build');
  const kb = readFileSync(join(d, 'KANBAN.md'), 'utf8');
  ok('velocity n/a without sprint', /Velocity \| n\/a/.test(kb));
  rmSync(d, { recursive: true, force: true });
}

console.log(fail ? '\nBACKLOG TESTS FAILED' : '\nALL BACKLOG TESTS PASSED');
process.exit(fail);
