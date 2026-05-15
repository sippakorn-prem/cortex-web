import type { MCPTool } from './types';

export const MCP_TOOLS: MCPTool[] = [
  {
    id: 'cortex_search',
    priority: 1,
    when: 'First — every agent reaches for this before guessing.',
    signature: 'cortex_search(query: string, type?: "knowledge" | "decision" | "session", limit?: number)',
    purpose: 'Full-text + tag search across the vault. Returns ranked notes with snippets.',
    example_in: `cortex_search(
  query: "debezium snapshot retrigger",
  type: "knowledge",
  limit: 3
)`,
    example_out: `[
  {
    id: "KN-038",
    title: "Debezium snapshot modes",
    score: 0.92,
    snippet: "snapshot.mode = when_needed retriggers a full snapshot..."
  },
  {
    id: "S-2026-05-14",
    title: "Flink CDC debounce",
    score: 0.71,
    snippet: "Pipeline double-writing to ClickHouse..."
  }
]`,
    used_by: ['Writer', 'Reviewer', 'Curator'],
  },
  {
    id: 'cortex_get_document',
    priority: 2,
    when: 'After search — pull the full Markdown for a specific id or path.',
    signature: 'cortex_get_document(id: string, include?: "body" | "frontmatter" | "all")',
    purpose: 'Return the raw note: frontmatter, body, and resolved wikilinks. Cheap and deterministic.',
    example_in: `cortex_get_document(
  id: "ADR-015",
  include: "all"
)`,
    example_out: `{
  id: "ADR-015",
  path: "20_Decisions/ADR-015-claude-vs-codex.md",
  frontmatter: { status: "accepted", supersedes: "ADR-009" },
  body: "## Context\\nWe need two agents...",
  wikilinks: ["FOUNDATION", "KN-014", "KN-007"]
}`,
    used_by: ['Writer', 'Reviewer', 'Curator', 'Librarian'],
  },
  {
    id: 'cortex_explain_decision',
    priority: 3,
    when: 'When an agent (or human) needs the "why" — walks the rationale chain.',
    signature: 'cortex_explain_decision(id: string, depth?: number)',
    purpose: 'Return the decision + every Knowledge note it cites + every session it sources from. The full reasoning trail.',
    example_in: `cortex_explain_decision(
  id: "ADR-015",
  depth: 2
)`,
    example_out: `{
  decision: { id: "ADR-015", title: "Claude writes, Codex reviews" },
  cites: [
    { id: "KN-014", title: "Agent roles" },
    { id: "KN-007", title: "Grounded behavior" },
    { id: "KN-031", title: "Review checklist" }
  ],
  sources: [{ id: "S-2026-05-09" }],
  supersedes: { id: "ADR-009" },
  derived: [{ id: "ADR-017", title: "Curator promotion rules" }]
}`,
    used_by: ['Reviewer', 'Strategist', 'Curator'],
  },
];
