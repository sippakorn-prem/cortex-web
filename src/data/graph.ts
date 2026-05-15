import type { Graph, GraphEdge, GraphNode } from './types';
import { NOTES } from './notes';

const noteNodes: GraphNode[] = NOTES.map((n) => ({
  id: n.id,
  label: n.title,
  kind: n.kind,
  path: n.path,
  tags: n.tags,
}));

const extraSessions: GraphNode[] = [
  { id: 'S-2026-05-13', label: '2026-05-13 · curator-merge', kind: 'session', path: '10_Sessions/2026-05-13-curator-merge-rules.md' },
  { id: 'S-2026-05-12', label: '2026-05-12 · rag-spike', kind: 'session', path: '10_Sessions/2026-05-12-claude-rag-spike.md' },
  { id: 'S-2026-05-08', label: '2026-05-08 · git-versioning', kind: 'session', path: '10_Sessions/2026-05-08-git-versioning.md' },
  { id: 'S-2026-05-07', label: '2026-05-07 · idempotency', kind: 'session', path: '10_Sessions/2026-05-07-kafka-idempotency.md' },
  { id: 'ADR-009', label: 'Single-agent loop (superseded)', kind: 'decision', faded: true, path: '20_Decisions/ADR-009-single-agent-loop.md' },
];

const edges: GraphEdge[] = [
  ['ADR-015', 'FOUNDATION', 'cites'],
  ['ADR-016', 'FOUNDATION', 'cites'],
  ['ADR-017', 'FOUNDATION', 'cites'],
  ['ADR-014', 'FOUNDATION', 'cites'],
  ['ADR-015', 'ADR-009', 'supersedes'],
  ['ADR-015', 'KN-014', 'cites'],
  ['ADR-015', 'KN-007', 'cites'],
  ['ADR-015', 'KN-031', 'cites'],
  ['ADR-015', 'S-2026-05-09', 'src'],
  ['ADR-014', 'KN-022', 'cites'],
  ['ADR-014', 'KN-038', 'related'],
  ['ADR-016', 'KN-019', 'cites'],
  ['ADR-016', 'COMMIT', 'cites'],
  ['ADR-016', 'S-2026-05-08', 'src'],
  ['ADR-017', 'KN-031', 'cites'],
  ['ADR-017', 'S-2026-05-13', 'src'],
  ['KN-038', 'S-2026-05-14', 'src'],
  ['KN-038', 'S-2026-05-07', 'src'],
  ['KN-014', 'S-2026-05-09', 'src'],
  ['KN-019', 'COMMIT', 'cites'],
  ['KN-022', 'S-2026-05-12', 'src'],
  ['KN-031', 'FOUNDATION', 'cites'],
  ['KN-007', 'FOUNDATION', 'cites'],
  ['NAMING', 'FOUNDATION', 'imports'],
  ['COMMIT', 'FOUNDATION', 'imports'],
];

export const GRAPH: Graph = {
  nodes: [...noteNodes, ...extraSessions],
  edges,
};
