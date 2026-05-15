import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GRAPH } from '../data/graph';
import { NOTES } from '../data/notes';
import type { Graph, GraphEdge, GraphNode, NoteKind } from '../data/types';
import type { ApiIndexEntry } from '../lib/cortex-api';

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
}

const OBSIDIAN_TUNE = {
  linkDistance: 86,
  repel: 1900,
  center: 0.024,
  labelThreshold: 2.2,
  showSessions: true,
};

interface KindStyle { fill: string; stroke: string }
const KIND_COLORS: Record<NoteKind, KindStyle> = {
  decision:  { fill: '#b7b9c0', stroke: '#d5d7dc' },
  knowledge: { fill: '#a7a9af', stroke: '#d0d2d7' },
  session:   { fill: '#55585d', stroke: '#6b6e74' },
  principle: { fill: '#8f9299', stroke: '#c4c6cc' },
};

const EDGE_STYLE: Record<string, { stroke: string; width: number; dash: string }> = {
  cites:      { stroke: '#4b4d52', width: 0.72, dash: '' },
  related:    { stroke: '#43454a', width: 0.65, dash: '' },
  imports:    { stroke: '#5b5e64', width: 0.8, dash: '' },
  derived:    { stroke: '#62656c', width: 0.86, dash: '' },
  supersedes: { stroke: '#666a72', width: 0.86, dash: '4 4' },
  src:        { stroke: '#3d3f44', width: 0.58, dash: '2 4' },
};

export function GraphView({
  goToNote,
  graph = GRAPH,
  index = [],
}: {
  goToNote: (id: string) => void;
  graph?: Graph;
  index?: ApiIndexEntry[];
}) {
  const { nodes: rawNodes, edges } = graph;
  const visibleEdges = useMemo<GraphEdge[]>(() => {
    const byPair = new Map<string, GraphEdge>();
    const priority: Record<string, number> = {
      supersedes: 5,
      derived: 4,
      imports: 3,
      cites: 2,
      src: 1,
      related: 0,
    };
    for (const edge of edges) {
      const [a, b, kind] = edge;
      const key = a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
      const current = byPair.get(key);
      if (!current || priority[kind] > priority[current[2]]) byPair.set(key, edge);
    }
    return Array.from(byPair.values());
  }, [edges]);

  const simRef = useRef<{ nodes: SimNode[]; byId: Record<string, SimNode> } | null>(null);
  const [, setVersion] = useState(0);
  const tick = useCallback(() => setVersion((v) => (v + 1) % 1e9), []);

  const [tune, setTune] = useState(OBSIDIAN_TUNE);

  const viewRef = useRef({ x: 0, y: 0, zoom: 1 });
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<Record<NoteKind, boolean>>({
    decision: true, knowledge: true, session: true, principle: true,
  });

  useEffect(() => {
    if (!rawNodes.length) return;
    if (selected && rawNodes.every((n) => n.id !== selected)) {
      setSelected(null);
    }
  }, [rawNodes, selected]);

  useEffect(() => {
    const radii: Record<NoteKind, number> = { decision: 170, knowledge: 245, session: 330, principle: 135 };
    const counts: Partial<Record<NoteKind, number>> = {};
    for (const n of rawNodes) counts[n.kind] = (counts[n.kind] || 0) + 1;
    const seen: Partial<Record<NoteKind, number>> = {};
    const sim: SimNode[] = rawNodes.map((n) => {
      const k = n.kind;
      seen[k] = seen[k] || 0;
      const idx = seen[k]!++;
      const total = counts[k] || 1;
      const seed = [...n.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0);
      const phase = ((seed >>> 4) & 0xff) / 0xff;
      const angle = ((idx + phase) / total) * Math.PI * 2;
      const r = (radii[k] || 170) * (0.85 + ((seed >>> 12) & 0xff) / 0xff * 0.3);
      return {
        ...n,
        x: Math.cos(angle) * r * 0.78,
        y: Math.sin(angle) * r * 1.14,
        vx: 0, vy: 0, fx: null, fy: null,
      };
    });
    simRef.current = { nodes: sim, byId: Object.fromEntries(sim.map((n) => [n.id, n])) };
    setVersion((v) => v + 1);
  }, [rawNodes]);

  useEffect(() => {
    if (!simRef.current) return;
    let alpha = 1;
    let raf = 0;
    let frame = 0;
    const step = () => {
      frame += 1;
      const sim = simRef.current!;
      const nodes = sim.nodes;
      const byId = sim.byId;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) d2 = 1;
          const d = Math.sqrt(d2);
          const f = (tune.repel * alpha) / d2;
          const fx = (dx / d) * f, fy = (dy / d) * f;
          a.vx -= fx; a.vy -= fy;
          b.vx += fx; b.vy += fy;
        }
      }
      for (const [aId, bId] of visibleEdges) {
        const a = byId[aId], b = byId[bId];
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const k = 0.035 * alpha * (d - tune.linkDistance) / d;
        const fx = dx * k, fy = dy * k;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }
      for (const n of nodes) {
        n.vx -= n.x * tune.center * alpha;
        n.vy -= n.y * tune.center * alpha;
      }
      const damp = 0.62;
      for (const n of nodes) {
        if (n.fx !== null) { n.x = n.fx; n.y = n.fy!; n.vx = 0; n.vy = 0; continue; }
        n.vx *= damp; n.vy *= damp;
        const v = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (v > 30) { n.vx = (n.vx / v) * 30; n.vy = (n.vy / v) * 30; }
        n.x += n.vx * alpha;
        n.y += n.vy * alpha;
      }
      alpha = Math.max(0, alpha - 0.006);
      if (frame % 3 === 0 || alpha <= 0.01) tick();
      if (alpha > 0.01) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [tune.linkDistance, tune.repel, tune.center, visibleEdges, tick]);

  const svgRef = useRef<SVGSVGElement>(null);
  const graphGroupRef = useRef<SVGGElement>(null);
  const dragRef = useRef<{ id: string; ox: number; oy: number; moved: boolean } | null>(null);
  const panRef = useRef<{ ox: number; oy: number } | null>(null);

  const applyViewport = useCallback(() => {
    const svg = svgRef.current;
    const group = graphGroupRef.current;
    if (!svg || !group) return;
    const rect = svg.getBoundingClientRect();
    const v = viewRef.current;
    group.setAttribute(
      'transform',
      `translate(${rect.width / 2 + v.x} ${rect.height / 2 + v.y}) scale(${v.zoom})`
    );
  }, []);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const v = viewRef.current;
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2;
    return {
      x: (sx - rect.left - cx - v.x) / v.zoom,
      y: (sy - rect.top - cy - v.y) / v.zoom,
    };
  }, []);

  // Wheel zoom — bound as a native non-passive listener so preventDefault
  // works (React's synthetic wheel handlers are passive by default).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const v = viewRef.current;
      const next = Math.min(3, Math.max(0.3, v.zoom * Math.exp(-e.deltaY * 0.0014)));
      const rect = svg.getBoundingClientRect();
      const cx = rect.width / 2, cy = rect.height / 2;
      const px = e.clientX - rect.left, py = e.clientY - rect.top;
      const wx = (px - cx - v.x) / v.zoom, wy = (py - cy - v.y) / v.zoom;
      v.zoom = next;
      v.x = (px - cx) - wx * v.zoom;
      v.y = (py - cy) - wy * v.zoom;
      applyViewport();
    };
    svg.addEventListener('wheel', handler, { passive: false });
    return () => svg.removeEventListener('wheel', handler);
  }, [applyViewport]);

  const onNodePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const node = simRef.current?.byId[id];
    if (!node) return;
    const start = screenToWorld(e.clientX, e.clientY);
    dragRef.current = { id, ox: node.x - start.x, oy: node.y - start.y, moved: false };
    setSelected(id);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const onPanPointerDown = (e: React.PointerEvent) => {
    if (dragRef.current) return;
    const v = viewRef.current;
    panRef.current = { ox: e.clientX - v.x, oy: e.clientY - v.y };
    svgRef.current?.classList.add('panning');
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragRef.current) {
      const node = simRef.current!.byId[dragRef.current.id];
      const p = screenToWorld(e.clientX, e.clientY);
      node.fx = p.x + dragRef.current.ox;
      node.fy = p.y + dragRef.current.oy;
      dragRef.current.moved = true;
      tick();
      return;
    }
    if (panRef.current) {
      const v = viewRef.current;
      v.x = e.clientX - panRef.current.ox;
      v.y = e.clientY - panRef.current.oy;
      applyViewport();
    }
  };

  const onPointerUp = () => {
    if (dragRef.current) {
      if (!dragRef.current.moved) {
        const node = simRef.current!.byId[dragRef.current.id];
        node.fx = null; node.fy = null;
      }
      dragRef.current = null;
    }
    if (panRef.current) {
      panRef.current = null;
      svgRef.current?.classList.remove('panning');
    }
  };

  const sim = simRef.current;

  const neighbors = useMemo(() => {
    if (!selected) return null;
    const s = new Set<string>([selected]);
    for (const [a, b] of visibleEdges) {
      if (a === selected) s.add(b);
      if (b === selected) s.add(a);
    }
    return s;
  }, [selected, visibleEdges]);

  const searchMatches = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.trim().toLowerCase();
    const s = new Set<string>();
    for (const n of rawNodes) {
      const hay = `${n.id} ${n.label} ${(n.tags || []).join(' ')}`.toLowerCase();
      if (hay.includes(q)) s.add(n.id);
    }
    return s;
  }, [search, rawNodes]);

  const degreeById = useMemo(() => {
    const out: Record<string, number> = {};
    for (const n of rawNodes) out[n.id] = 0;
    for (const [a, b] of visibleEdges) {
      out[a] = (out[a] || 0) + 1;
      out[b] = (out[b] || 0) + 1;
    }
    return out;
  }, [visibleEdges, rawNodes]);

  const isDim = (id: string, kind: NoteKind) => {
    if (!kindFilter[kind]) return true;
    if (searchMatches) return !searchMatches.has(id);
    if (neighbors) return !neighbors.has(id);
    return false;
  };

  const isEdgeDim = (a: string, b: string) => {
    if (searchMatches) return !(searchMatches.has(a) || searchMatches.has(b));
    if (neighbors) return !(neighbors.has(a) && neighbors.has(b));
    return false;
  };

  const labelOpacity = (id: string) => {
    const z = viewRef.current.zoom;
    const isFocus = selected === id || hover === id;
    if (isFocus) return 1;
    if (searchMatches?.has(id)) return 0.95;
    if (z < tune.labelThreshold) return 0;
    return Math.min(0.55, (z - tune.labelThreshold) * 0.75);
  };

  const selectedNode = selected && sim ? sim.byId[selected] : null;
  const selectedDeg = selected ? visibleEdges.filter((e) => e[0] === selected || e[1] === selected).length : 0;
  const selectedNote = selected
    ? NOTES.find((n) => n.id === selected) ||
      index.find((n) => n.id === selected || n.path === selected || n.path === selectedNode?.path)
    : null;

  const openNode = (id: string) => {
    const node = rawNodes.find((n) => n.id === id);
    goToNote(node?.path || id);
  };

  useEffect(() => {
    if (!sim) return;
    const t = setTimeout(() => {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const n of sim.nodes) {
        if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
      }
      const w = maxX - minX || 1, h = maxY - minY || 1;
      const svg = svgRef.current;
      if (!svg) return;
      const r = svg.getBoundingClientRect();
      const z = Math.min(r.width / (w + 200), r.height / (h + 200), 1.4);
      viewRef.current = { x: -(minX + maxX) / 2 * z, y: -(minY + maxY) / 2 * z, zoom: z };
      applyViewport();
      tick();
    }, 800);
    return () => clearTimeout(t);
  }, [applyViewport, sim, tick]);

  const view = viewRef.current;

  return (
    <div className="gr">
      <svg ref={svgRef}
        onPointerDown={onPanPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={(e) => { if (e.target === svgRef.current) setSelected(null); }}>
        <defs>
          <radialGradient id="halo-focus" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f1f3f7" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#f1f3f7" stopOpacity="0" />
          </radialGradient>
        </defs>

        {sim && (() => {
          const svgRect = svgRef.current?.getBoundingClientRect();
          const cx = (svgRect?.width || 1240) / 2;
          const cy = (svgRect?.height || 720) / 2;
          return (
            <g ref={graphGroupRef} transform={`translate(${cx + view.x} ${cy + view.y}) scale(${view.zoom})`}>
              {visibleEdges.map(([a, b, kind], i) => {
                const na = sim.byId[a], nb = sim.byId[b];
                if (!na || !nb) return null;
                const dim = isEdgeDim(a, b) || !kindFilter[na.kind] || !kindFilter[nb.kind];
                const st = EDGE_STYLE[kind] || EDGE_STYLE.cites;
                return (
                  <line key={i}
                    x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                    stroke={st.stroke}
                    strokeWidth={st.width / view.zoom}
                    strokeDasharray={st.dash}
                    opacity={dim ? 0.08 : 0.58}
                  />
                );
              })}
              {sim.nodes.map((n) => {
                const dim = isDim(n.id, n.kind);
                const isFocus = selected === n.id;
                const isHover = hover === n.id;
                const c = KIND_COLORS[n.kind] || KIND_COLORS.knowledge;
                const baseR = Math.min(9.5, 2.8 + Math.sqrt(degreeById[n.id] || 1) * 0.88);
                const r = (isFocus || isHover) ? baseR + 2.8 : baseR;
                return (
                  <g key={n.id} className={`gr-node ${n.kind}`}
                    opacity={n.faded ? 0.28 : (dim ? 0.16 : 0.92)}
                    onPointerDown={(e) => onNodePointerDown(e, n.id)}
                    onMouseEnter={() => setHover(n.id)}
                    onMouseLeave={() => setHover(null)}
                    onDoubleClick={() => openNode(n.id)}
                    style={{ cursor: 'pointer' }}>
                    {(isFocus || isHover) && (
                      <circle cx={n.x} cy={n.y} r={26} fill="url(#halo-focus)" />
                    )}
                    <circle cx={n.x} cy={n.y} r={r}
                      fill={c.fill}
                      stroke={c.stroke}
                      strokeWidth={(isFocus ? 1.8 : 0.8) / view.zoom}
                    />
                  </g>
                );
              })}
              {sim.nodes.map((n) => {
                const textOpacity = labelOpacity(n.id);
                if (textOpacity <= 0.03) return null;
                const isFocus = selected === n.id;
                const isHover = hover === n.id;
                const baseR = Math.min(9.5, 2.8 + Math.sqrt(degreeById[n.id] || 1) * 0.88);
                const r = (isFocus || isHover) ? baseR + 2.8 : baseR;
                return (
                  <g key={`${n.id}-label`} className="gr-label">
                    {textOpacity > 0.03 && (
                      <text x={n.x} y={n.y + r + 12 / view.zoom}
                        opacity={textOpacity}
                        fontSize={10 / view.zoom}
                        fill={isFocus || isHover ? '#eef0f4' : '#a8abb1'}>
                        {n.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })()}
      </svg>

      <div className="gr-controls">
        <div className="gr-search">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--cx-fg-3)" strokeWidth="1.4">
            <circle cx="5" cy="5" r="3.5" /><path d="M8 8l3 3" strokeLinecap="round" />
          </svg>
          <input
            placeholder="search nodes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {searchMatches && <span className="count">{searchMatches.size}</span>}
        </div>
        <div className="gr-chips">
          {(Object.entries(kindFilter) as [NoteKind, boolean][]).map(([k, on]) => (
            <span key={k}
              className={`gr-chip ${on ? 'on' : ''}`}
              onClick={() => setKindFilter((kf) => ({ ...kf, [k]: !kf[k] }))}>
              <span className="sw" style={{ background: KIND_COLORS[k].stroke }} />
              {k}
            </span>
          ))}
        </div>
      </div>

      <div className="gr-settings">
        <div className="label">— Forces</div>
        <div className="row">
          <div className="top"><span>Link distance</span><em>{tune.linkDistance}</em></div>
          <input type="range" min="32" max="180" step="2" value={tune.linkDistance}
            onChange={(e) => setTune((t) => ({ ...t, linkDistance: +e.target.value }))} />
        </div>
        <div className="row">
          <div className="top"><span>Repel</span><em>{tune.repel}</em></div>
          <input type="range" min="400" max="3200" step="50" value={tune.repel}
            onChange={(e) => setTune((t) => ({ ...t, repel: +e.target.value }))} />
        </div>
        <div className="row">
          <div className="top"><span>Center pull</span><em>{tune.center.toFixed(3)}</em></div>
          <input type="range" min="0" max="0.12" step="0.002" value={tune.center}
            onChange={(e) => setTune((t) => ({ ...t, center: +e.target.value }))} />
        </div>
        <div className="row">
          <div className="top"><span>Label threshold</span><em>{tune.labelThreshold.toFixed(2)}</em></div>
          <input type="range" min="0" max="3" step="0.05" value={tune.labelThreshold}
            onChange={(e) => setTune((t) => ({ ...t, labelThreshold: +e.target.value }))} />
        </div>
        <button className="preset" onClick={() => setTune(OBSIDIAN_TUNE)}>Obsidian preset</button>
      </div>

      <div className="gr-legend">
        <div className="stat"><span>nodes</span><span className="n">{rawNodes.length}</span></div>
        <div className="stat"><span>links</span><span className="n">{visibleEdges.length}</span></div>
        <div className="stat"><span>zoom</span><span className="n">{view.zoom.toFixed(2)}×</span></div>
        <div className="hint">
          <kbd>drag</kbd> pan · <kbd>wheel</kbd> zoom · <kbd>click</kbd> focus · <kbd>2×</kbd> open
        </div>
      </div>

      {selected && selectedNode && (
        <div className="gr-detail">
          <div className="id">{selected} · {selectedNode.kind.toUpperCase()}</div>
          <h4>{selectedNode.label}</h4>
          {selectedNote && selectedNote.lede && <p>{selectedNote.lede}</p>}
          <div className="stats">
            <div><span className="n">{selectedDeg}</span><span className="l">degree</span></div>
            <div><span className="n">{visibleEdges.filter((e) => e[1] === selected).length}</span><span className="l">in</span></div>
            <div><span className="n">{visibleEdges.filter((e) => e[0] === selected).length}</span><span className="l">out</span></div>
          </div>
          {selectedNote && (
            <button className="open" onClick={() => openNode(selected)}>
              open in Knowledge →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
