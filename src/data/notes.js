export const NOTES = [
    {
        path: 'FOUNDATION.md',
        group: 'canonical',
        kind: 'principle',
        id: 'FOUNDATION',
        title: 'FOUNDATION',
        lede: 'How this company runs. Read by every agent before any write.',
        tags: ['canonical', 'principle'],
        updated: '4d ago',
        fm: { id: 'FOUNDATION', status: 'canonical', confidence: 'high', read_by: 'all agents' },
        body: `## Why this exists

Cortex is a one-person company. The other "team members" are AI agents.
This file is the contract between them and me — the few rules every agent
reads before it touches the vault.

## Principles

### 01 — The vault is the company
Everything Cortex knows lives here. If a fact isn't in the vault, it doesn't
exist. If a decision isn't logged, it can be reversed without ceremony.

### 02 — Sessions are raw, knowledge is canonical
\`10_Sessions/\` is a log — write freely, ask nothing.
\`30_Knowledge/\` is the record — promoted by the curator, never inline.

### 03 — Two agents that disagree productively
Claude writes. Codex reviews cold. They share rules, not context.

### 04 — Verify, then label confidence
Facts cite a source and a date. Recommendations may be unverified, but must
be labelled \`recommendation\` — never disguised as fact.

### 05 — Hooks enforce, humans review
\`scripts/hooks/\` is deterministic policy. The curator proposes; the human
accepts.

## Imported by

- [[NAMING_CONVENTIONS]] — file names, frontmatter, ids
- [[COMMIT_POLICY]] — what counts as a clean commit
- \`.claude/CLAUDE.md\` — imports §1–§5
- \`.codex/AGENTS.md\` — imports all
`,
    },
    {
        path: 'NAMING_CONVENTIONS.md',
        group: 'canonical',
        kind: 'principle',
        id: 'NAMING',
        title: 'NAMING_CONVENTIONS',
        lede: 'File names, frontmatter, ids. The boring parts that must not drift.',
        tags: ['canonical'],
        updated: '12d ago',
        fm: { id: 'NAMING', status: 'canonical', confidence: 'high' },
        body: `## File names

- kebab-case, no spaces, no caps.
- Decisions: \`ADR-NNN-short-slug.md\` under \`20_Decisions/\`.
- Knowledge: \`KN-NNN-short-slug.md\` under \`30_Knowledge/<category>/\`.
- Sessions: \`YYYY-MM-DD-short-slug.md\` under \`10_Sessions/\`.

## Frontmatter

Every canonical note (Knowledge/Decision) must include:

\`\`\`yaml
---
id: KN-038
status: canonical | draft | superseded
confidence: high | medium | low
tags: [pattern, debezium]
sources: [10_Sessions/2026-05-14-flink-cdc-debug.md]
---
\`\`\`

## Hooks

Enforced by \`scripts/hooks/check-frontmatter.sh\` on pre-commit.
`,
    },
    {
        path: 'COMMIT_POLICY.md',
        group: 'canonical',
        kind: 'principle',
        id: 'COMMIT',
        title: 'COMMIT_POLICY',
        lede: 'What counts as a clean commit, and who signs which kind.',
        tags: ['canonical'],
        updated: '3w ago',
        fm: { id: 'COMMIT', status: 'canonical', confidence: 'high' },
        body: `## Authorship

Every commit is authored by one of:

- \`human:\` — me, hands on keyboard.
- \`claude-code:\` — writer agent.
- \`codex:\` — reviewer agent.
- \`curator:\` — promotion pass.

## Categories

- \`session:\` raw session log, no review needed.
- \`knowledge:\` canonical knowledge note — must cite sources.
- \`decision:\` ADR — needs human sign-off.
- \`rules:\` change to FOUNDATION / NAMING / this file — human only.
`,
    },
    {
        path: '10_Sessions/2026-05-14-flink-cdc-debug.md',
        group: 'sessions',
        kind: 'session',
        id: 'S-2026-05-14',
        title: 'Flink CDC debounce',
        lede: 'Duplicate events from Debezium — root-caused mid-session.',
        tags: ['debug', 'flink', 'kafka'],
        updated: '4h ago',
        fm: {
            id: 'S-2026-05-14',
            agent: 'claude-code',
            model: 'sonnet-4.5',
            turns: 31,
            duration: '1h 42m',
            status: 'queued for curator',
        },
        body: `## Problem

Pipeline double-writing to ClickHouse since the redeploy. Debezium offset
looks fine, but downstream Flink job emits the same key twice.

## Root cause (found turn 14)

The Debezium connector has \`snapshot.mode = when_needed\` AND
\`topic.creation.default.replication.factor = 3\` on a 1-broker dev cluster.
On reconnect, replication can't be satisfied, so the connector re-snapshots
and replays the entire offset window.

## Fix

Pin \`snapshot.mode\` to \`schema_only_recovery\` once the initial load is
complete. Test in staging first.

## Proposed knowledge

[[KN-038-debezium-snapshot-modes]] — Claude flagged this as durable.
Awaiting curator pass.
`,
    },
    {
        path: '10_Sessions/2026-05-09-agent-roles.md',
        group: 'sessions',
        kind: 'session',
        id: 'S-2026-05-09',
        title: 'Agent roles — writer/reviewer/curator',
        lede: 'Working session that produced ADR-015.',
        tags: ['agents', 'design'],
        updated: '6d ago',
        fm: { id: 'S-2026-05-09', agent: 'claude-code', turns: 42, status: 'curated' },
        body: `## Question

One Claude that writes and reviews itself, vs. two agents.

## What we explored

- Single-agent loop. Risk: agreeable feedback.
- Two-agent: Claude writes, Codex reviews cold.
- Three-agent + Curator: separate pass for promotion.

## Outcome

→ [[ADR-015-claude-vs-codex]]
`,
    },
    {
        path: '20_Decisions/ADR-014-event-store-postgres.md',
        group: 'decisions',
        kind: 'decision',
        id: 'ADR-014',
        title: 'Event store on Postgres',
        lede: 'For this scale, a single Postgres table beats every dedicated event store.',
        tags: ['storage', 'postgres', 'events'],
        updated: '2w ago',
        fm: {
            id: 'ADR-014',
            status: 'accepted',
            confidence: 'high',
            decided: '2026-04-12',
            supersedes: '—',
        },
        body: `## Context

We need an append-only event log. Options considered: EventStoreDB, Kafka
as source-of-truth, Postgres table.

## Decision

Use a single Postgres table \`events\` with \`(stream_id, version, payload)\`
and a unique index on \`(stream_id, version)\`. Cite:

- [[KN-022-clickhouse-rmt-pitfalls]] for downstream materialization.

## Consequences

- One database to operate.
- Multi-region eventually requires logical replication or a switch.
- Replay is a SQL query, not a dedicated tool.
`,
    },
    {
        path: '20_Decisions/ADR-015-claude-vs-codex.md',
        group: 'decisions',
        kind: 'decision',
        id: 'ADR-015',
        title: 'Claude writes, Codex reviews',
        lede: "Two agents with different priors catch each other's blind spots.",
        tags: ['agents', 'claude-code', 'codex'],
        updated: '6d ago',
        fm: {
            id: 'ADR-015',
            status: 'accepted',
            confidence: 'high',
            decided: '2026-05-09',
            supersedes: 'ADR-009',
            sources: '10_Sessions/2026-05-09-agent-roles.md',
        },
        body: `## Context

We need two agents that disagree productively. A single writer-reviewer is
one agent talking to itself; two with different priors catch each other's
blind spots — especially around vault hygiene and silent drift in
[[FOUNDATION]].

## Decision

- **Claude Code writes.** Owns the active branch, runs hooks, captures
  session logs into \`10_Sessions/\`.
- **Codex reviews.** Opens cold — no session context, only the diff
  and the rules.
- **Curator promotes.** Sessions → Knowledge / Decisions on a separate
  pass. Never inline.
- **Both share [[FOUNDATION]].** One source of truth; deterministic hooks
  enforce.

> Two agents that disagree productively beat one agent that agrees with itself.

## Consequences

- Codex sessions are short and frequent.
- Claude can't push to main without Codex review.
- New principle: see [[KN-014-agent-roles]].
`,
    },
    {
        path: '20_Decisions/ADR-016-vault-versioning.md',
        group: 'decisions',
        kind: 'decision',
        id: 'ADR-016',
        title: 'Vault versioning via Git',
        lede: 'Git is the only history; no parallel database of versions.',
        tags: ['git', 'vault'],
        updated: '3w ago',
        fm: { id: 'ADR-016', status: 'accepted', confidence: 'high' },
        body: `## Decision

The vault's history is \`git log\`. No extra version tracking.
Every agent commits as itself; see [[COMMIT_POLICY]].
`,
    },
    {
        path: '20_Decisions/ADR-017-curator-promotion.md',
        group: 'decisions',
        kind: 'decision',
        id: 'ADR-017',
        title: 'Curator promotion rules',
        lede: 'When sessions become knowledge, and when knowledge becomes decisions.',
        tags: ['curator', 'workflow'],
        updated: '5d ago',
        fm: {
            id: 'ADR-017',
            status: 'accepted',
            confidence: 'medium',
            sources: '10_Sessions/2026-05-13-curator-merge-rules.md',
        },
        body: `## Promotion rules

1. A pattern that appears in ≥ 2 sessions becomes Knowledge.
2. A decision affecting how agents operate becomes an ADR.
3. Conflicts between sessions surface to the human, never auto-resolved.

See [[KN-031-review-checklist]] for the human-side checklist.
`,
    },
    {
        path: '30_Knowledge/principles/KN-007-grounded-behavior.md',
        group: 'knowledge',
        kind: 'knowledge',
        id: 'KN-007',
        title: 'Grounded AI behavior',
        lede: 'No guessing. Verify freshness. Separate facts from recommendations.',
        tags: ['principle', 'behavior'],
        updated: '5w ago',
        fm: { id: 'KN-007', status: 'canonical', confidence: 'high' },
        body: `## Rules

1. **Don't guess.** If you don't know, say so.
2. **Verify freshness.** Docs older than 12 months get a flag.
3. **Separate facts from recommendations.**
   - \`fact:\` — cites source + date.
   - \`recommendation:\` — derived, not verified.
4. **Label confidence:** \`high | medium | low\`.

Referenced by every role definition.
`,
    },
    {
        path: '30_Knowledge/principles/KN-014-agent-roles.md',
        group: 'knowledge',
        kind: 'knowledge',
        id: 'KN-014',
        title: 'Agent roles',
        lede: 'Writer, Reviewer, Curator, Librarian — what each one is for.',
        tags: ['agents', 'principle'],
        updated: '6d ago',
        fm: { id: 'KN-014', status: 'canonical', confidence: 'high' },
        body: `## The four roles

| Role | Reads | Writes |
|------|-------|--------|
| Writer | everything | active branch, sessions |
| Reviewer | diff + rules | review comments, never to vault |
| Curator | sessions, knowledge | proposals (PRs only) |
| Librarian | full vault | naming/frontmatter fixes |

See [[ADR-015-claude-vs-codex]].
`,
    },
    {
        path: '30_Knowledge/patterns/KN-022-clickhouse-rmt-pitfalls.md',
        group: 'knowledge',
        kind: 'knowledge',
        id: 'KN-022',
        title: 'ClickHouse ReplacingMergeTree pitfalls',
        lede: 'RMT looks like idempotency. It is not.',
        tags: ['clickhouse', 'pattern'],
        updated: '6w ago',
        fm: { id: 'KN-022', status: 'canonical', confidence: 'high' },
        body: `## What ReplacingMergeTree does

Periodically merges rows with the same sorting key, keeping the row with
the highest \`version\`. It's eventually-consistent, not transactional.

## Pitfalls

- Until \`OPTIMIZE FINAL\` runs, duplicates are visible to queries.
- \`FINAL\` in queries is expensive; prefer view-time deduplication.
- Sorting key must encode the natural key — \`(stream_id, event_id)\`.

Referenced by [[ADR-014-event-store-postgres]].
`,
    },
    {
        path: '30_Knowledge/patterns/KN-038-debezium-snapshot-modes.md',
        group: 'knowledge',
        kind: 'knowledge',
        id: 'KN-038',
        title: 'Debezium snapshot modes',
        lede: 'Pin to schema_only_recovery after the initial load. Trust me.',
        tags: ['debezium', 'kafka', 'pattern'],
        updated: '4h ago',
        fm: {
            id: 'KN-038',
            status: 'canonical',
            confidence: 'high',
            sources: '10_Sessions/2026-05-14-flink-cdc-debug.md',
        },
        body: `## Fact

\`snapshot.mode = when_needed\` retriggers a full snapshot on broker
disconnect when \`replication.factor\` cannot be satisfied.

## Recommendation

After the initial load completes, change \`snapshot.mode\` to
\`schema_only_recovery\`. The connector will recover offsets without
replaying the snapshot window.

## Verification

- Tested in staging on 2026-05-14.
- See session [[2026-05-14-flink-cdc-debug]].
`,
    },
    {
        path: '30_Knowledge/workflows/KN-031-review-checklist.md',
        group: 'knowledge',
        kind: 'knowledge',
        id: 'KN-031',
        title: 'Review checklist',
        lede: 'What Codex looks for before a Claude commit can land.',
        tags: ['review', 'workflow'],
        updated: '2w ago',
        fm: { id: 'KN-031', status: 'canonical', confidence: 'medium' },
        body: `## Checks

- [ ] Frontmatter present and valid.
- [ ] Sources cited for every \`fact:\` line.
- [ ] No silent edits to [[FOUNDATION]].
- [ ] Naming follows [[NAMING_CONVENTIONS]].
- [ ] Wikilinks resolve.
- [ ] Diff is < 600 lines (else split).
`,
    },
    {
        path: '30_Knowledge/workflows/KN-019-slash-command-policy.md',
        group: 'knowledge',
        kind: 'knowledge',
        id: 'KN-019',
        title: 'Slash command policy',
        lede: 'Slash commands are write actions. Treat them as commits.',
        tags: ['workflow', 'commands'],
        updated: '3w ago',
        fm: { id: 'KN-019', status: 'canonical', confidence: 'medium' },
        body: `## Commands

- \`/session-log\` — captures the current session into \`10_Sessions/\`.
- \`/curator-apply\` — runs the curator pass; produces proposals only.
- \`/promote-note <id>\` — manual promotion; bypasses curator.
- \`/dedupe <path>\` — find and merge duplicates.

## Rules

Every command is reviewable as a diff. No "fire and forget" commands.
`,
    },
];
