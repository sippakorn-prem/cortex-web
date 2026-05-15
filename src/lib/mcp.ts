// Cortex MCP runtime client (browser-side, streamable-http transport).
//
// SECURITY NOTE: VITE_CORTEX_MCP_TOKEN is bundled into the client at build
// time. Treat it as a public, read-only credential. Real secrets must be
// proxied through a server route — do not put a write-capable token here.

export interface McpRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: unknown;
}

export interface McpToolContent {
  type: 'text';
  text: string;
}

export interface McpToolResult {
  content: McpToolContent[];
}

export interface McpResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

const MCP_URL = import.meta.env.VITE_CORTEX_MCP_URL ?? 'https://cortex-mcp.sippakorn.page/mcp';
const TOKEN = import.meta.env.VITE_CORTEX_MCP_TOKEN;

let rpcId = 0;

async function rpc<T = unknown>(method: string, params?: unknown): Promise<T> {
  rpcId += 1;
  const body: McpRequest = { jsonrpc: '2.0', id: rpcId, method, params };
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`MCP ${method} → HTTP ${res.status}`);
  const data = (await res.json()) as McpResponse<T>;
  if (data.error) throw new Error(`MCP ${method} → ${data.error.message}`);
  return data.result as T;
}

async function callTool(name: string, args: Record<string, unknown>): Promise<string> {
  const result = await rpc<McpToolResult>('tools/call', { name, arguments: args });
  return result.content.map((c) => c.text).join('\n');
}

// ─── Parsed result shapes ────────────────────────────────────────────────

export interface RecentKnowledgeEntry {
  path: string;
  updated: string;
  title: string;
}

export interface SearchHit {
  path: string;
  heading?: string;
  score: number;
  snippet: string;
}

export interface FetchedDocument {
  path: string;
  body: string;
}

// ─── Tool wrappers ───────────────────────────────────────────────────────

export async function listRecentKnowledge(limit = 30): Promise<RecentKnowledgeEntry[]> {
  const text = await callTool('cortex_list_recent_knowledge', { limit });
  return parseRecentKnowledge(text);
}

export async function getDocument(path: string): Promise<FetchedDocument> {
  const text = await callTool('cortex_get_document', { path });
  return parseDocument(text, path);
}

export async function searchVault(query: string, limit = 10): Promise<SearchHit[]> {
  if (!query.trim()) return [];
  const text = await callTool('cortex_search', { query, limit });
  return parseSearchHits(text);
}

export async function searchDecisions(query: string, limit = 10): Promise<SearchHit[]> {
  if (!query.trim()) return [];
  const text = await callTool('cortex_explain_decision', { query });
  return parseSearchHits(text).slice(0, limit);
}

export async function checkHealth(): Promise<{ ok: boolean; indexReady: boolean } | null> {
  try {
    const base = MCP_URL.replace(/\/mcp\/?$/, '');
    const res = await fetch(`${base}/health`);
    if (!res.ok) return null;
    return (await res.json()) as { ok: boolean; indexReady: boolean };
  } catch {
    return null;
  }
}

// ─── Parsers ─────────────────────────────────────────────────────────────
// MCP returns prose text rather than JSON. Each parser tolerates extra
// whitespace and missing fields.

function parseRecentKnowledge(text: string): RecentKnowledgeEntry[] {
  // Blocks separated by blank line. Each block:
  //   <path>\nUpdated: <iso>\nTitle: <title>
  const out: RecentKnowledgeEntry[] = [];
  for (const block of text.split(/\n\s*\n/)) {
    const lines = block.trim().split('\n');
    if (lines.length < 1) continue;
    const path = lines[0].trim();
    if (!path) continue;
    let updated = '';
    let title = path.split('/').pop()!.replace(/\.md$/, '');
    for (const line of lines.slice(1)) {
      const [k, ...rest] = line.split(':');
      const v = rest.join(':').trim();
      if (k === 'Updated') updated = v;
      else if (k === 'Title') title = v;
    }
    out.push({ path, updated, title });
  }
  return out;
}

function parseSearchHits(text: string): SearchHit[] {
  // Numbered list of hits separated by blank line:
  //   1. <path> > <heading>
  //   Score: 0.92
  //   Text: <snippet…>
  const out: SearchHit[] = [];
  for (const block of text.split(/\n\s*\n/)) {
    const lines = block.trim().split('\n');
    if (!lines.length) continue;
    const head = lines[0].replace(/^\d+\.\s*/, '');
    const [pathPart, ...rest] = head.split(' > ');
    const path = pathPart.trim();
    const heading = rest.join(' > ').trim() || undefined;
    let score = 0;
    let snippet = '';
    for (const line of lines.slice(1)) {
      if (line.startsWith('Score:')) score = parseFloat(line.slice(6));
      else if (line.startsWith('Text:')) snippet = line.slice(5).trim();
    }
    if (path) out.push({ path, heading, score, snippet });
  }
  return out;
}

function parseDocument(text: string, fallbackPath: string): FetchedDocument {
  // Format: "Source: <path>\n\n<body>"
  const m = text.match(/^Source:\s*(.+?)\n\n([\s\S]*)$/);
  if (m) return { path: m[1].trim(), body: m[2] };
  return { path: fallbackPath, body: text };
}

export const MCP_CONFIGURED = Boolean(TOKEN);
