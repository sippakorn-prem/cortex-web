import { GRAPH } from '../data/graph';
import { STATS } from '../data/activity';
import type { Graph, GraphEdgeKind, GraphNode, NoteGroup, NoteKind, Stats } from '../data/types';

const DEFAULT_MCP_URL = 'https://cortex-mcp.sippakorn.page/mcp';
const MCP_URL = import.meta.env.VITE_CORTEX_MCP_URL ?? DEFAULT_MCP_URL;
const API_BASE =
  import.meta.env.VITE_CORTEX_API_URL ??
  MCP_URL.replace(/\/mcp\/?$/, '');
const API_TOKEN = import.meta.env.VITE_CORTEX_API_TOKEN;

export interface ApiIndexEntry {
  path: string;
  id: string;
  title: string;
  kind: NoteKind;
  group: NoteGroup;
  tags?: string[];
  lede?: string;
  updated?: string;
  status?: string;
}

export interface ApiState<T> {
  data: T;
  loading: boolean;
  live: boolean;
  error: string | null;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      accept: 'application/json',
      ...(API_TOKEN ? { authorization: `Bearer ${API_TOKEN}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`API ${path} -> HTTP ${res.status}`);
  return (await res.json()) as T;
}

function asArray<T>(value: unknown, keys: string[]): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    for (const key of keys) {
      const nested = (value as Record<string, unknown>)[key];
      if (Array.isArray(nested)) return nested as T[];
    }
  }
  return [];
}

function isNoteKind(value: unknown): value is NoteKind {
  return value === 'principle' || value === 'session' || value === 'decision' || value === 'knowledge';
}

function isNoteGroup(value: unknown): value is NoteGroup {
  return value === 'canonical' || value === 'sessions' || value === 'decisions' || value === 'knowledge';
}

function isEdgeKind(value: unknown): value is GraphEdgeKind {
  return value === 'cites' || value === 'related' || value === 'imports' || value === 'derived' || value === 'supersedes' || value === 'src';
}

function classify(path: string): NoteGroup {
  if (path.startsWith('10_Sessions/')) return 'sessions';
  if (path.startsWith('20_Decisions/')) return 'decisions';
  if (path.startsWith('30_Knowledge/')) return 'knowledge';
  return 'canonical';
}

function normalizeIndex(payload: unknown): ApiIndexEntry[] {
  return asArray<Record<string, unknown>>(payload, ['entries', 'items', 'notes', 'index']).flatMap((entry) => {
    const path = String(entry.path || '');
    if (!path) return [];
    const title = String(entry.title || entry.id || path.split('/').pop()?.replace(/\.md$/, '') || path);
    return [{
      path,
      id: String(entry.id || title),
      title,
      kind: isNoteKind(entry.kind) ? entry.kind : 'principle',
      group: isNoteGroup(entry.group) ? entry.group : classify(path),
      tags: Array.isArray(entry.tags) ? entry.tags.map(String) : undefined,
      lede: typeof entry.lede === 'string' ? entry.lede : undefined,
      updated: typeof entry.updated === 'string' ? entry.updated : undefined,
      status: typeof entry.status === 'string' ? entry.status : undefined,
    }];
  });
}

function normalizeGraph(payload: unknown): Graph {
  const source = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const nodes = asArray<Record<string, unknown>>(source.nodes ?? payload, ['nodes']).flatMap<GraphNode>((node) => {
    const id = String(node.id || node.path || '');
    if (!id) return [];
    return [{
      id,
      label: String(node.label || node.title || id),
      kind: isNoteKind(node.kind) ? node.kind : 'knowledge',
      path: typeof node.path === 'string' ? node.path : undefined,
      tags: Array.isArray(node.tags) ? node.tags.map(String) : undefined,
      faded: Boolean(node.faded),
    }];
  });
  const edges = asArray<unknown[]>(source.edges ?? [], ['edges']).flatMap((edge) => {
    if (!Array.isArray(edge) || edge.length < 2) return [];
    const kind = isEdgeKind(edge[2]) ? edge[2] : 'related';
    return [[String(edge[0]), String(edge[1]), kind] as [string, string, GraphEdgeKind]];
  });
  return nodes.length ? { nodes, edges } : GRAPH;
}

function normalizeStats(payload: unknown): Stats {
  if (!payload || typeof payload !== 'object') return STATS;
  const value = payload as Partial<Stats>;
  return {
    totals: { ...STATS.totals, ...(value.totals || {}) },
    this_week: { ...STATS.this_week, ...(value.this_week || {}) },
    growth: Array.isArray(value.growth) ? value.growth : STATS.growth,
    sessions: Array.isArray(value.sessions) ? value.sessions : STATS.sessions,
    uptime: value.uptime || STATS.uptime,
    vault_size: value.vault_size || STATS.vault_size,
    deployed: value.deployed || STATS.deployed,
  };
}

export async function fetchVaultIndex(): Promise<ApiIndexEntry[]> {
  return normalizeIndex(await apiGet<unknown>('/api/index'));
}

export async function fetchGraph(): Promise<Graph> {
  return normalizeGraph(await apiGet<unknown>('/api/graph'));
}

export async function fetchStats(): Promise<Stats> {
  return normalizeStats(await apiGet<unknown>('/api/stats'));
}

export const API_CONFIGURED = Boolean(API_BASE);
