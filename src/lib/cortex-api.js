import { GRAPH } from '../data/graph';
import { STATS } from '../data/activity';
const DEFAULT_MCP_URL = 'https://cortex-mcp.sippakorn.page/mcp';
const MCP_URL = import.meta.env.VITE_CORTEX_MCP_URL ?? DEFAULT_MCP_URL;
const API_BASE = import.meta.env.VITE_CORTEX_API_URL ??
    MCP_URL.replace(/\/mcp\/?$/, '');
const API_TOKEN = import.meta.env.VITE_CORTEX_API_TOKEN;
async function apiGet(path) {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: {
            accept: 'application/json',
            ...(API_TOKEN ? { authorization: `Bearer ${API_TOKEN}` } : {}),
        },
    });
    if (!res.ok)
        throw new Error(`API ${path} -> HTTP ${res.status}`);
    return (await res.json());
}
function asArray(value, keys) {
    if (Array.isArray(value))
        return value;
    if (value && typeof value === 'object') {
        for (const key of keys) {
            const nested = value[key];
            if (Array.isArray(nested))
                return nested;
        }
    }
    return [];
}
function isNoteKind(value) {
    return value === 'principle' || value === 'session' || value === 'decision' || value === 'knowledge';
}
function isNoteGroup(value) {
    return value === 'canonical' || value === 'sessions' || value === 'decisions' || value === 'knowledge';
}
function isEdgeKind(value) {
    return value === 'cites' || value === 'related' || value === 'imports' || value === 'derived' || value === 'supersedes' || value === 'src';
}
function classify(path) {
    if (path.startsWith('10_Sessions/'))
        return 'sessions';
    if (path.startsWith('20_Decisions/'))
        return 'decisions';
    if (path.startsWith('30_Knowledge/'))
        return 'knowledge';
    return 'canonical';
}
function normalizeIndex(payload) {
    return asArray(payload, ['entries', 'items', 'notes', 'index']).flatMap((entry) => {
        const path = String(entry.path || '');
        if (!path)
            return [];
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
function normalizeGraph(payload) {
    const source = payload && typeof payload === 'object' ? payload : {};
    const nodes = asArray(source.nodes ?? payload, ['nodes']).flatMap((node) => {
        const id = String(node.id || node.path || '');
        if (!id)
            return [];
        return [{
                id,
                label: String(node.label || node.title || id),
                kind: isNoteKind(node.kind) ? node.kind : 'knowledge',
                path: typeof node.path === 'string' ? node.path : undefined,
                tags: Array.isArray(node.tags) ? node.tags.map(String) : undefined,
                faded: Boolean(node.faded),
            }];
    });
    const edges = asArray(source.edges ?? [], ['edges']).flatMap((edge) => {
        if (!Array.isArray(edge) || edge.length < 2)
            return [];
        const kind = isEdgeKind(edge[2]) ? edge[2] : 'related';
        return [[String(edge[0]), String(edge[1]), kind]];
    });
    return nodes.length ? { nodes, edges } : GRAPH;
}
function normalizeStats(payload) {
    if (!payload || typeof payload !== 'object')
        return STATS;
    const value = payload;
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
export async function fetchVaultIndex() {
    return normalizeIndex(await apiGet('/api/index'));
}
export async function fetchGraph() {
    return normalizeGraph(await apiGet('/api/graph'));
}
export async function fetchStats() {
    return normalizeStats(await apiGet('/api/stats'));
}
export const API_CONFIGURED = Boolean(API_BASE);
