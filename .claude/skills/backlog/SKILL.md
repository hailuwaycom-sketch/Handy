---
name: backlog
description: "Backlog con ciclo de vida para Forge: 1 shard markdown por ticket con frontmatter tipado (id, kind, title, pts, priority, status, epic, sprint) como fuente de verdad, y vistas (board Kanban, tablas, métricas, registry) generadas por script — nunca editadas a mano. Reemplaza el KANBAN.md monolítico. Úsalo cuando el usuario pida trackear trabajo, mover un ticket, ver 'cómo vamos', velocity, sprints, o ejecute /kanban."
allowed-tools: Read, Write, Edit, Bash, Glob
metadata:
  author: forge
  issue: getforja/forge-pro#3
---

# backlog — tickets como shards, vistas generadas

> *"Un tablero que se edita a mano miente en cuanto hay dos manos. La verdad
> vive en los tickets; el tablero se calcula."*

Reemplaza el `KANBAN.md` monolítico (un snapshot que el agente reescribía a mano)
por un backlog con **ciclo de vida real**.

## El modelo

```
FUENTE DE VERDAD          VISTAS GENERADAS (no editar)
.claude/backlog/tickets/  ──backlog.mjs──▶  KANBAN.md (entre marcadores)
   T-001.md  (frontmatter)                  .claude/backlog/registry.yaml
   T-002.md                                 métricas + velocity
```

- **1 shard por ticket** en `.claude/backlog/tickets/<id>.md`, con frontmatter
  tipado. Es lo único que se edita. Plantilla: `templates/ticket.md`.
- **Las vistas se regeneran**, nunca se editan: el board, las tablas por columna,
  las métricas y el `registry.yaml` los produce `backlog.mjs`. En `KANBAN.md` se
  reescriben **solo** entre `<!-- FORGE:BACKLOG:START -->` y `…:END -->`; el resto
  del archivo (notas, links) queda intacto.
- **Sin conflictos de merge:** `backlog.mjs` marca las vistas como `merge=union`
  en `.gitattributes`, así dos sesiones de agentes en paralelo (La Forja) no
  chocan al regenerar. Los shards son 1 archivo por ticket → rara vez colisionan.
- **Métricas honestas:** la velocity se calcula de los tickets `done` con campo
  `sprint`; sin ese dato reporta **n/a**, no un número inventado (ver `/audit`
  y la regla de honestidad de métricas).

## Estados (columnas del board)

`backlog → planning → dev → qa → review → done`. Un ticket puede retroceder
(qa→dev si aparece un bug). `blocked: true` lo marca 🚫 sin sacarlo de su columna.

## Uso (siempre vía el script — no edites las vistas)

```bash
# regenerar todas las vistas desde los shards
node .claude/skills/backlog/backlog.mjs build

# alta de ticket (stampa la fecha vos: --date AAAA-MM-DD)
node .claude/skills/backlog/backlog.mjs new --id T-001 --title "Login magic-link" \
     --kind story --pts 3 --priority alta --epic Auth --sprint S1 --date 2026-07-03

# mover de columna (edita el shard y regenera)
node .claude/skills/backlog/backlog.mjs move T-001 qa

# métricas rápidas (conteos + velocity)
node .claude/skills/backlog/backlog.mjs stats
```

`build` **valida** los shards antes de generar: id único, `title` presente,
`status` válido, `pts` numérico. Si algo está mal, falla ruidoso (exit 1) y **no**
escribe vistas a medias.

## Flujo del agente

1. **Crear/editar trabajo** → tocá el shard (o `new`), nunca `KANBAN.md`.
2. **Mover** → `move <id> <status>` (o editá `status:` en el shard y corré `build`).
3. **Después de cualquier cambio** → corré `build` para que las vistas reflejen la
   verdad. Si el proyecto tiene el dashboard HTML de `/kanban`, regeneralo también.
4. **"¿Cómo vamos?"** → `stats`, o leé la sección Métricas del `KANBAN.md`.

## Regla dura

Si te encontrás editando el board, las tablas o las métricas a mano: **pará**.
Eso es una vista generada. Editá el shard y corré `build`. Editar la vista a mano
es lo que hacía mentir al tablero viejo.
