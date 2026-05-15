import type { ActivityItem, Stats } from './types';

export const ACTIVITY: ActivityItem[] = [
  { t: '2h ago', type: 'session', agent: 'claude-code', title: 'Flink CDC debounce — duplicate events from Debezium', link: '#/doc/S-2026-05-14', delta: '31 turns · 1h 42m', tag: '#debug' },
  { t: '6h ago', type: 'knowledge', title: 'Promoted to Knowledge — Debezium snapshot modes', link: '#/doc/KN-038', delta: 'KN-038 · high confidence', tag: 'curator' },
  { t: '8h ago', type: 'curator', title: 'Curator pass — 7 proposals · 2 conflicts', link: '#/decisions', delta: 'awaiting review', tag: 'pending' },
  { t: '1d ago', type: 'decision', title: 'ADR-017 accepted — Curator promotion rules', link: '#/decisions/ADR-017', delta: 'medium confidence', tag: 'accepted' },
  { t: '2d ago', type: 'session', agent: 'codex', title: 'Cold review — ADR-015 diff', link: '#/doc/S-2026-05-13', delta: '18 turns · approved', tag: '#review' },
  { t: '3d ago', type: 'knowledge', title: 'Updated: Review checklist (+2 checks)', link: '#/doc/KN-031', delta: 'small edit', tag: 'edit' },
  { t: '4d ago', type: 'workflow', title: '/curator-apply scheduled to nightly', link: '#/ai-role', delta: 'config change', tag: 'config' },
  { t: '6d ago', type: 'decision', title: 'ADR-015 accepted — Claude writes, Codex reviews', link: '#/decisions/ADR-015', delta: 'supersedes ADR-009', tag: 'accepted' },
  { t: '6d ago', type: 'session', agent: 'claude-code', title: 'Agent roles design — writer/reviewer/curator split', link: '#/doc/S-2026-05-09', delta: '42 turns · 3h 21m', tag: '#design' },
  { t: '2w ago', type: 'principle', title: 'FOUNDATION.md — principle 04 reworded', link: '#/doc/FOUNDATION', delta: 'rules edit', tag: 'rules' },
  { t: '3w ago', type: 'decision', title: 'ADR-016 accepted — Vault versioning via Git', link: '#/decisions/ADR-016', delta: 'high confidence', tag: 'accepted' },
];

export const STATS: Stats = {
  totals: { notes: 142, knowledge: 71, decisions: 24, sessions: 38, principles: 9 },
  this_week: { notes_added: 7, sessions_logged: 5, decisions_signed: 1, promoted: 3 },
  growth: [110, 113, 117, 120, 122, 126, 128, 131, 133, 135, 138, 139, 141, 142],
  sessions: [2, 3, 4, 2, 5, 3, 6, 4, 3, 5, 4, 6, 4, 5],
  uptime: '99.97%',
  vault_size: '4.2 MB',
  deployed: 'Railway · Bangkok',
};
