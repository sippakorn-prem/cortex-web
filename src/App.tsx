import React, { useCallback, useEffect, useState } from 'react';
import { HomeView } from './views/Home';
import { GraphView } from './views/Graph';
import { DecisionsView } from './views/Decisions';
import { AIRoleView } from './views/AIRole';
import { KnowledgeView } from './views/Knowledge';
import { NOTES } from './data/notes';
import { GRAPH } from './data/graph';
import { STATS } from './data/activity';
import { MCP_CONFIGURED, checkHealth } from './lib/mcp';
import { API_CONFIGURED, fetchGraph, fetchStats, fetchVaultIndex, type ApiIndexEntry } from './lib/cortex-api';
import type { Graph, Stats } from './data/types';

type Route = { view: string; id?: string };

const DEFAULT_PATH = 'FOUNDATION.md';

function parseHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  if (!h) return { view: 'home' };
  const slash = h.indexOf('/');
  const view = slash === -1 ? h : h.slice(0, slash);
  const rest = slash === -1 ? undefined : h.slice(slash + 1);
  const valid = ['graph', 'decisions', 'ai-role', 'browse', 'doc', 'knowledge', 'home', 'roles'];
  if (!valid.includes(view)) return { view: 'home' };
  return { view, id: rest ? decodeURIComponent(rest) : undefined };
}

export function App() {
  const [route, setRoute] = useState<Route>(parseHash);
  const [docPath, setDocPath] = useState<string>(() => parseHash().id || DEFAULT_PATH);
  const [decisionId, setDecisionId] = useState(() => {
    const r = parseHash();
    return r.view === 'decisions' && r.id ? r.id : 'ADR-015';
  });
  const [health, setHealth] = useState<'unknown' | 'ok' | 'down'>('unknown');
  const [stats, setStats] = useState<Stats>(STATS);
  const [graph, setGraph] = useState<Graph>(GRAPH);
  const [index, setIndex] = useState<ApiIndexEntry[]>([]);
  const [apiLive, setApiLive] = useState({ stats: false, graph: false, index: false });

  useEffect(() => {
    const onHash = () => {
      const r = parseHash();
      setRoute(r);
      if ((r.view === 'browse' || r.view === 'doc' || r.view === 'knowledge') && r.id) setDocPath(r.id);
      if (r.view === 'decisions' && r.id) setDecisionId(r.id);
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
      if (cancelled) return;
      const [statsResult, graphResult, indexResult] = results;
      if (statsResult.status === 'fulfilled') setStats(statsResult.value);
      if (graphResult.status === 'fulfilled') setGraph(graphResult.value);
      if (indexResult.status === 'fulfilled') setIndex(indexResult.value);
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

  const setView = (v: string) => {
    let hash;
    if (v === 'home') hash = '#/';
    else if (v === 'browse') hash = `#/browse/${encodeURIComponent(docPath)}`;
    else if (v === 'decisions') hash = `#/decisions/${decisionId}`;
    else hash = `#/${v}`;
    window.location.hash = hash;
  };

  // Used by Graph, Decisions, AI Role — those still operate on sample NOTES.
  const goToNote = useCallback((id: string) => {
    const note = NOTES.find((n) => n.id === id);
    if (note && note.kind === 'decision') {
      setDecisionId(id);
      window.location.hash = `#/decisions/${id}`;
    } else if (note) {
      // Map sample id → guess at vault path (best effort).
      setDocPath(note.path);
      window.location.hash = `#/doc/${encodeURIComponent(note.path)}`;
    } else if (id.includes('/') || id.endsWith('.md')) {
      setDocPath(id);
      window.location.hash = `#/doc/${encodeURIComponent(id)}`;
    } else {
      // Treat opaque ids as plain paths.
      setDocPath(id);
      window.location.hash = `#/doc/${encodeURIComponent(id)}`;
    }
  }, []);

  const onSelectPath = useCallback((path: string) => {
    setDocPath(path);
    const v = route.view === 'doc' ? 'doc' : 'browse';
    window.history.replaceState(null, '', `#/${v}/${encodeURIComponent(path)}`);
  }, [route.view]);

  const onSelectDecision = useCallback((id: string) => {
    setDecisionId(id);
    window.history.replaceState(null, '', `#/decisions/${id}`);
  }, []);

  const activeView = (() => {
    if (route.view === 'doc' || route.view === 'browse' || route.view === 'knowledge') return 'browse';
    if (route.view === 'roles') return 'ai-role';
    return route.view;
  })();

  const tabs = [
    { id: 'home',      n: '01', label: 'Home' },
    { id: 'graph',     n: '02', label: 'Graph' },
    { id: 'decisions', n: '03', label: 'Decisions' },
    { id: 'ai-role',   n: '04', label: 'AI Role' },
    { id: 'browse',    n: '05', label: 'Browse' },
  ];

  const dataLabel = (() => {
    const count = Number(apiLive.stats) + Number(apiLive.graph) + Number(apiLive.index);
    if (count === 3) return 'live · cortex-api';
    if (count > 0) return `mixed · ${count}/3 API`;
    if (!API_CONFIGURED) return 'sample · API unset';
    if (activeView === 'browse' && health === 'ok') return 'mixed · MCP fallback';
    return 'sample · API unreachable';
  })();

  return (
    <>
      <header className="topbar">
        <div className="brand" onClick={() => setView('home')} style={{ cursor: 'pointer' }}>
          <span className="mark">Cortex</span>
          <span className="glyph">流</span>
        </div>
        <div className="sep" />
        <div className="tabs">
          {tabs.map((t) => (
            <button key={t.id}
              className={`tab ${activeView === t.id ? 'active' : ''}`}
              onClick={() => setView(t.id)}>
              <span className="n">{t.n}</span> {t.label}
            </button>
          ))}
        </div>
        <div className="meta">
          <span>
            <span className="dot" style={{ background: apiLive.stats && apiLive.graph && apiLive.index ? 'var(--cx-add)' : 'var(--cx-fg-3)' }} />
            {apiLive.stats && apiLive.graph && apiLive.index ? 'api live' : 'api fallback'}
          </span>
          <span>{dataLabel}</span>
          <span>{stats.totals.notes} notes · {graph.nodes.length} nodes</span>
        </div>
      </header>

      <div className={`view ${activeView === 'home' ? 'active' : ''}`}>
        {activeView === 'home' && <HomeView stats={stats} />}
      </div>
      <div className={`view ${activeView === 'graph' ? 'active' : ''}`}>
        {activeView === 'graph' && <GraphView goToNote={goToNote} graph={graph} index={index} />}
      </div>
      <div className={`view ${activeView === 'decisions' ? 'active' : ''}`}>
        {activeView === 'decisions' && (
          <DecisionsView selectedId={decisionId} onSelect={onSelectDecision} goToNote={goToNote} />
        )}
      </div>
      <div className={`view ${activeView === 'ai-role' ? 'active' : ''}`}>
        {activeView === 'ai-role' && <AIRoleView goToNote={goToNote} />}
      </div>
      <div className={`view ${activeView === 'browse' ? 'active' : ''}`}>
        {activeView === 'browse' && (
          <KnowledgeView
            path={docPath}
            onSelectPath={onSelectPath}
            hideTree={route.view === 'doc'}
          />
        )}
      </div>
    </>
  );
}
