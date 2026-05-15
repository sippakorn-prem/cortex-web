import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { HomeView } from './views/Home';
import { GraphView } from './views/Graph';
import { DecisionsView } from './views/Decisions';
import { AIRoleView } from './views/AIRole';
import { KnowledgeView } from './views/Knowledge';
import { NOTES } from './data/notes';
import { GRAPH } from './data/graph';
import { STATS } from './data/activity';
import { MCP_CONFIGURED, checkHealth } from './lib/mcp';
import { API_CONFIGURED, fetchGraph, fetchStats, fetchVaultIndex } from './lib/cortex-api';
const DEFAULT_PATH = 'FOUNDATION.md';
function parseHash() {
    const h = window.location.hash.replace(/^#\/?/, '');
    if (!h)
        return { view: 'home' };
    const slash = h.indexOf('/');
    const view = slash === -1 ? h : h.slice(0, slash);
    const rest = slash === -1 ? undefined : h.slice(slash + 1);
    const valid = ['graph', 'decisions', 'ai-role', 'browse', 'doc', 'knowledge', 'home', 'roles'];
    if (!valid.includes(view))
        return { view: 'home' };
    return { view, id: rest ? decodeURIComponent(rest) : undefined };
}
export function App() {
    const [route, setRoute] = useState(parseHash);
    const [docPath, setDocPath] = useState(() => parseHash().id || DEFAULT_PATH);
    const [decisionId, setDecisionId] = useState(() => {
        const r = parseHash();
        return r.view === 'decisions' && r.id ? r.id : 'ADR-015';
    });
    const [health, setHealth] = useState('unknown');
    const [stats, setStats] = useState(STATS);
    const [graph, setGraph] = useState(GRAPH);
    const [index, setIndex] = useState([]);
    const [apiLive, setApiLive] = useState({ stats: false, graph: false, index: false });
    useEffect(() => {
        const onHash = () => {
            const r = parseHash();
            setRoute(r);
            if ((r.view === 'browse' || r.view === 'doc' || r.view === 'knowledge') && r.id)
                setDocPath(r.id);
            if (r.view === 'decisions' && r.id)
                setDecisionId(r.id);
        };
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);
    useEffect(() => {
        if (!MCP_CONFIGURED) {
            setHealth('down');
            return;
        }
        checkHealth().then((h) => setHealth(h?.ok ? 'ok' : 'down'));
    }, []);
    useEffect(() => {
        let cancelled = false;
        Promise.allSettled([fetchStats(), fetchGraph(), fetchVaultIndex()]).then((results) => {
            if (cancelled)
                return;
            const [statsResult, graphResult, indexResult] = results;
            if (statsResult.status === 'fulfilled')
                setStats(statsResult.value);
            if (graphResult.status === 'fulfilled')
                setGraph(graphResult.value);
            if (indexResult.status === 'fulfilled')
                setIndex(indexResult.value);
            setApiLive({
                stats: statsResult.status === 'fulfilled',
                graph: graphResult.status === 'fulfilled',
                index: indexResult.status === 'fulfilled',
            });
        });
        return () => {
            cancelled = true;
        };
    }, []);
    const setView = (v) => {
        let hash;
        if (v === 'home')
            hash = '#/';
        else if (v === 'browse')
            hash = `#/browse/${encodeURIComponent(docPath)}`;
        else if (v === 'decisions')
            hash = `#/decisions/${decisionId}`;
        else
            hash = `#/${v}`;
        window.location.hash = hash;
    };
    // Used by Graph, Decisions, AI Role — those still operate on sample NOTES.
    const goToNote = useCallback((id) => {
        const note = NOTES.find((n) => n.id === id);
        if (note && note.kind === 'decision') {
            setDecisionId(id);
            window.location.hash = `#/decisions/${id}`;
        }
        else if (note) {
            // Map sample id → guess at vault path (best effort).
            setDocPath(note.path);
            window.location.hash = `#/doc/${encodeURIComponent(note.path)}`;
        }
        else if (id.includes('/') || id.endsWith('.md')) {
            setDocPath(id);
            window.location.hash = `#/doc/${encodeURIComponent(id)}`;
        }
        else {
            // Treat opaque ids as plain paths.
            setDocPath(id);
            window.location.hash = `#/doc/${encodeURIComponent(id)}`;
        }
    }, []);
    const onSelectPath = useCallback((path) => {
        setDocPath(path);
        const v = route.view === 'doc' ? 'doc' : 'browse';
        window.history.replaceState(null, '', `#/${v}/${encodeURIComponent(path)}`);
    }, [route.view]);
    const onSelectDecision = useCallback((id) => {
        setDecisionId(id);
        window.history.replaceState(null, '', `#/decisions/${id}`);
    }, []);
    const activeView = (() => {
        if (route.view === 'doc' || route.view === 'browse' || route.view === 'knowledge')
            return 'browse';
        if (route.view === 'roles')
            return 'ai-role';
        return route.view;
    })();
    const tabs = [
        { id: 'home', n: '01', label: 'Home' },
        { id: 'graph', n: '02', label: 'Graph' },
        { id: 'decisions', n: '03', label: 'Decisions' },
        { id: 'ai-role', n: '04', label: 'AI Role' },
        { id: 'browse', n: '05', label: 'Browse' },
    ];
    const dataLabel = (() => {
        const count = Number(apiLive.stats) + Number(apiLive.graph) + Number(apiLive.index);
        if (count === 3)
            return 'live · cortex-api';
        if (count > 0)
            return `mixed · ${count}/3 API`;
        if (!API_CONFIGURED)
            return 'sample · API unset';
        if (activeView === 'browse' && health === 'ok')
            return 'mixed · MCP fallback';
        return 'sample · API unreachable';
    })();
    return (_jsxs(_Fragment, { children: [_jsxs("header", { className: "topbar", children: [_jsxs("div", { className: "brand", onClick: () => setView('home'), style: { cursor: 'pointer' }, children: [_jsx("span", { className: "mark", children: "Cortex" }), _jsx("span", { className: "glyph", children: "\u6D41" })] }), _jsx("div", { className: "sep" }), _jsx("div", { className: "tabs", children: tabs.map((t) => (_jsxs("button", { className: `tab ${activeView === t.id ? 'active' : ''}`, onClick: () => setView(t.id), children: [_jsx("span", { className: "n", children: t.n }), " ", t.label] }, t.id))) }), _jsxs("div", { className: "meta", children: [_jsxs("span", { children: [_jsx("span", { className: "dot", style: { background: apiLive.stats && apiLive.graph && apiLive.index ? 'var(--cx-add)' : 'var(--cx-fg-3)' } }), apiLive.stats && apiLive.graph && apiLive.index ? 'api live' : 'api fallback'] }), _jsx("span", { children: dataLabel }), _jsxs("span", { children: [stats.totals.notes, " notes \u00B7 ", graph.nodes.length, " nodes"] })] })] }), _jsx("div", { className: `view ${activeView === 'home' ? 'active' : ''}`, children: activeView === 'home' && _jsx(HomeView, { stats: stats }) }), _jsx("div", { className: `view ${activeView === 'graph' ? 'active' : ''}`, children: activeView === 'graph' && _jsx(GraphView, { goToNote: goToNote, graph: graph, index: index }) }), _jsx("div", { className: `view ${activeView === 'decisions' ? 'active' : ''}`, children: activeView === 'decisions' && (_jsx(DecisionsView, { selectedId: decisionId, onSelect: onSelectDecision, goToNote: goToNote })) }), _jsx("div", { className: `view ${activeView === 'ai-role' ? 'active' : ''}`, children: activeView === 'ai-role' && _jsx(AIRoleView, { goToNote: goToNote }) }), _jsx("div", { className: `view ${activeView === 'browse' ? 'active' : ''}`, children: activeView === 'browse' && (_jsx(KnowledgeView, { path: docPath, onSelectPath: onSelectPath, hideTree: route.view === 'doc' })) })] }));
}
