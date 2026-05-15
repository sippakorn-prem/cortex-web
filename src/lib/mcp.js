// Cortex MCP runtime client (browser-side, streamable-http transport).
//
// SECURITY NOTE: VITE_CORTEX_MCP_TOKEN is bundled into the client at build
// time. Treat it as a public, read-only credential. Real secrets must be
// proxied through a server route — do not put a write-capable token here.
const MCP_URL = import.meta.env.VITE_CORTEX_MCP_URL ?? 'https://cortex-mcp.sippakorn.page/mcp';
const TOKEN = import.meta.env.VITE_CORTEX_MCP_TOKEN;
let rpcId = 0;
async function rpc(method, params) {
    rpcId += 1;
    const body = { jsonrpc: '2.0', id: rpcId, method, params };
    const res = await fetch(MCP_URL, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            accept: 'application/json, text/event-stream',
            ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
        },
        body: JSON.stringify(body),
    });
    if (!res.ok)
        throw new Error(`MCP ${method} → HTTP ${res.status}`);
    const data = (await res.json());
    if (data.error)
        throw new Error(`MCP ${method} → ${data.error.message}`);
    return data.result;
}
async function callTool(name, args) {
    const result = await rpc('tools/call', { name, arguments: args });
    return result.content.map((c) => c.text).join('\n');
}
// ─── Tool wrappers ───────────────────────────────────────────────────────
export async function listRecentKnowledge(limit = 30) {
    const text = await callTool('cortex_list_recent_knowledge', { limit });
    return parseRecentKnowledge(text);
}
export async function getDocument(path) {
    const text = await callTool('cortex_get_document', { path });
    return parseDocument(text, path);
}
export async function searchVault(query, limit = 10) {
    if (!query.trim())
        return [];
    const text = await callTool('cortex_search', { query, limit });
    return parseSearchHits(text);
}
export async function searchDecisions(query, limit = 10) {
    if (!query.trim())
        return [];
    const text = await callTool('cortex_explain_decision', { query });
    return parseSearchHits(text).slice(0, limit);
}
export async function checkHealth() {
    try {
        const base = MCP_URL.replace(/\/mcp\/?$/, '');
        const res = await fetch(`${base}/health`);
        if (!res.ok)
            return null;
        return (await res.json());
    }
    catch {
        return null;
    }
}
// ─── Parsers ─────────────────────────────────────────────────────────────
// MCP returns prose text rather than JSON. Each parser tolerates extra
// whitespace and missing fields.
function parseRecentKnowledge(text) {
    // Blocks separated by blank line. Each block:
    //   <path>\nUpdated: <iso>\nTitle: <title>
    const out = [];
    for (const block of text.split(/\n\s*\n/)) {
        const lines = block.trim().split('\n');
        if (lines.length < 1)
            continue;
        const path = lines[0].trim();
        if (!path)
            continue;
        let updated = '';
        let title = path.split('/').pop().replace(/\.md$/, '');
        for (const line of lines.slice(1)) {
            const [k, ...rest] = line.split(':');
            const v = rest.join(':').trim();
            if (k === 'Updated')
                updated = v;
            else if (k === 'Title')
                title = v;
        }
        out.push({ path, updated, title });
    }
    return out;
}
function parseSearchHits(text) {
    // Numbered list of hits separated by blank line:
    //   1. <path> > <heading>
    //   Score: 0.92
    //   Text: <snippet…>
    const out = [];
    for (const block of text.split(/\n\s*\n/)) {
        const lines = block.trim().split('\n');
        if (!lines.length)
            continue;
        const head = lines[0].replace(/^\d+\.\s*/, '');
        const [pathPart, ...rest] = head.split(' > ');
        const path = pathPart.trim();
        const heading = rest.join(' > ').trim() || undefined;
        let score = 0;
        let snippet = '';
        for (const line of lines.slice(1)) {
            if (line.startsWith('Score:'))
                score = parseFloat(line.slice(6));
            else if (line.startsWith('Text:'))
                snippet = line.slice(5).trim();
        }
        if (path)
            out.push({ path, heading, score, snippet });
    }
    return out;
}
function parseDocument(text, fallbackPath) {
    // Format: "Source: <path>\n\n<body>"
    const m = text.match(/^Source:\s*(.+?)\n\n([\s\S]*)$/);
    if (m)
        return { path: m[1].trim(), body: m[2] };
    return { path: fallbackPath, body: text };
}
export const MCP_CONFIGURED = Boolean(TOKEN);
