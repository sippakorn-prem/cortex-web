export type NoteKind = 'principle' | 'session' | 'decision' | 'knowledge';
export type NoteGroup = 'canonical' | 'sessions' | 'decisions' | 'knowledge';

export interface Note {
  path: string;
  group: NoteGroup;
  kind: NoteKind;
  id: string;
  title: string;
  lede: string;
  tags: string[];
  updated: string;
  fm: Record<string, string | number>;
  body: string;
}

export interface GraphNode {
  id: string;
  label: string;
  kind: NoteKind;
  path?: string;
  tags?: string[];
  faded?: boolean;
}

export type GraphEdgeKind = 'cites' | 'related' | 'imports' | 'derived' | 'supersedes' | 'src';
export type GraphEdge = [string, string, GraphEdgeKind];

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Role {
  id: string;
  name: string;
  glyph: string;
  one_liner: string;
  status: 'active' | 'draft';
  model: string;
  runtime: string;
  folders: string[];
  deny: string[];
  tools: string[];
  prompt: string;
  refs: string[];
  updated: string;
}

export type ActivityType =
  | 'session'
  | 'knowledge'
  | 'curator'
  | 'decision'
  | 'workflow'
  | 'principle';

export interface ActivityItem {
  t: string;
  type: ActivityType;
  agent?: string;
  title: string;
  link: string;
  delta: string;
  tag: string;
}

export interface Stats {
  totals: {
    notes: number;
    knowledge: number;
    decisions: number;
    sessions: number;
    principles: number;
  };
  this_week: {
    notes_added: number;
    sessions_logged: number;
    decisions_signed: number;
    promoted: number;
  };
  growth: number[];
  sessions: number[];
  uptime: string;
  vault_size: string;
  deployed: string;
}

export interface MCPTool {
  id: string;
  priority: number;
  when: string;
  signature: string;
  purpose: string;
  example_in: string;
  example_out: string;
  used_by: string[];
}

export interface Rationale {
  cites: GraphNode[];
  sources: GraphNode[];
  supersedes: GraphNode | null;
  derivedFrom: GraphNode[];
  derivedTo: GraphNode[];
}
